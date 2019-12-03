const chalk = require('chalk')
const { api, numerics, strings } = global.config;
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


        await page.setRequestInterception(true);
        page.on('request', async request => {
            if (!request.isNavigationRequest()) {
                if (global.config.bad_requests &&
                    global.config.bad_requests.some(str => request.url().includes(str)))
                    return request.abort()
                return request.continue();
            }
            const delay = await Setting.findOne({
                where: { key: strings.puppeteer_busy }
            }).then(setting => {
                if (!setting) return numerics.puppeteer_delay
                return numerics.puppeteer_delay * 3
            })

            await page.waitFor(delay)
            console.log(request.url(), delay)
            return request.continue();
        });
        await page.goto("https://babelnovel.com/search");

        for (var i in trackedNovels) {
            try {
                console.log(i, "/", trackedNovels.length)
                const novel = trackedNovels[i]
                let json = await novel.fetchJson(page)
                if (json.lastChapter.id === novel.lastChapterBabelId)
                    continue

                if (novel.trackers.length)
                    await scrapeNovel([novel], {
                        check: true,
                        token: novel.token || defaultToken,
                        min: 0,
                        max: 10000,
                        cron: true
                    })

                json.lastChapter.bookCanonicalName = novel.canonicalName
                //json.lastChapter.isAnnounced = false;
                chapter = await novel.jsonToChapter(json.lastChapter, true)
                if (!chapter) continue
            } catch (err) { err => console.log(magenta(err.message)) }
        }
        console.log("close page")
        await page.close()

    } catch (e) {
        console.log(red(e.message))
    }
}

module.exports = trackNovels