const chalk = require('chalk')
const { api, numerics } = global.config;
const { Novel, TrackNovel, Setting } = require('../../models')
const { red, magenta } = chalk.bold
const scrapeNovel = require('./scrapeNovel')

const trackNovels = async (browser, client) => {
    const trackedNovels = await Novel.findAll({ /* where: { id: 49 }, */
        include: [{ model: TrackNovel, as: 'trackers', required: !process.argv.includes('all') }]
    })
    console.log("tracking", trackedNovels.length, "novels")
if (!trackedNovels.length) return true

const defaultToken = await Setting.findOne({
    where: { key: `babel_token_rinku` }
}).then(setting => setting ? setting.value : null)

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
        try {
            const novel = trackedNovels[i]
            let json = await novel.fetchJson(page)
            if (json.lastChapter.id === novel.lastChapterBabelId)
                continue

            await scrapeNovel(null, [novel], {
                check: true,
                token: novel.token || defaultToken,
                min: 0,
                max: 10000,
                cron: process.argv.includes('all')
            })
            
            json.lastChapter.bookCanonicalName = novel.canonicalName
            json.lastChapter.isAnnounced = false;
            chapter = await novel.jsonToChapter(json.lastChapter, true)
            if (!chapter) continue
        } catch (err) { err => console.log(magenta(err.message)) }
    }
    console.log("close page")
    return await page.close()
} catch (e) {
    console.log(red(e.message))
}
}

module.exports = trackNovels