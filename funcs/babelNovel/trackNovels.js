const chalk = require('chalk')
const { api } = global.config;
const { Novel, TrackNovel, Setting } = require('../../models')
const { red } = chalk.bold

const trackNovels = async (browser, client) => {
    const trackedNovels = await Novel.findAll({
        include: [{ model: TrackNovel, as: 'trackers', required: true }]
    })
    console.log("tracking", trackedNovels.length, "novels")
    if (!trackedNovels.length) return true

    try {
        const page = await browser.newPage();
        // fetch cookie
        await page.goto("https://babelnovel.com/search");

        await page.setRequestInterception(true);
        page.on('request', async request => {
            if (!request.isNavigationRequest())
                return request.continue();
            await page.waitFor(numerics.puppeteer_delay * 3)
            console.log(request.url())
            return request.continue();
        });
        
        for (var i in trackedNovels) {
            const novel = trackedNovels[i]
            let json = await novel.fetchJson(page)
            if (json.lastChapter.id === novel.lastChapterBabelId)
                continue

            json.lastChapter.bookCanonicalName = novel.canonicalName
            json.lastChapter.isAnnounced = false;
            chapter = await novel.jsonToChapter(json.lastChapter, true)
            if (!chapter) continue
        }        
        return await page.close()
    } catch (e) {
        console.log(red(e.message))
    }
}

module.exports = trackNovels