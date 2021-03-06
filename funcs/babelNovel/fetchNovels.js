const chalk = require('chalk')
const { api, numerics, strings } = global.config;
const { Novel, Setting, TrackNovel } = require('../../models')
const { red, magenta, yellow, green } = chalk.bold

const fetchNovels = async (browser) => {
    console.log("fetching novels")

    const reqGroupID = "fetchNovels"
    try {
        const page = await browser.newPage();
        await page.setRequestInterception(true);
        page.on('request', async request => {
            if (!request.isNavigationRequest()) {
                if (global.config.bad_requests &&
                    global.config.bad_requests.some(str => request.url().includes(str)))
                    return request.abort()
                return request.continue();
            }

            // this novel surpasses all other processes
            const timestamp = Date.now()
            await Setting.findOrCreate({
                where: { key: strings.puppeteer_busy },
                defaults: { value: timestamp, server: reqGroupID }
            }).then(async ([setting, created]) => {
                await setting.update({ value: timestamp, server: reqGroupID })
                return setting
            });

            let delay = numerics.puppeteer_delay
            const url = request.url()
            //if (params.cron) delay *= 2
            if (!url.includes("/api/")) delay = 500
            await page.waitFor(delay)
            console.log(url, magenta(delay))
            request.continue();
        });
        // fetch cookie
        await page.goto("https://babelnovel.com/search");

        let pageNr = 0;
        let json = { code: 0, data: [1] }
        while (json.code === 0 && json.data.length) {
            const fetch_url = api.novels.replace("<pageNr>", pageNr).replace("<pageSize>", 20)
            console.log(green("page", pageNr))
            await page.goto(fetch_url);
            json = await page.evaluate(() => {
                return JSON.parse(document.querySelector("body").innerText);
            });
            pageNr++;

            for (var i in json.data) {
                try {
                    const novelData = json.data[i]
                    novelData.babelId = novelData.id
                    novelData.isRemoved = false;
                    delete novelData.id
                    delete novelData.cover

                    if (novelData.genres)
                        novelData.genre = novelData.genres.map(genre => genre.name).filter(n => n).join(" | ")

                    await Novel.findOrCreate({
                        where: { babelId: novelData.babelId },
                        defaults: { canonicalName: novelData.canonicalName || Date.now().toString() },
                        include: ['trackers']
                    }).then(async ([nov, created]) => {
                        await nov.jsonToChapter(novelData.lastChapter)
                        const update = created || novelData.releasedChapterCount !== nov.releasedChapterCount;
                        if (novelData.releasedChapterCount > nov.releasedChapterCount && nov.isHiatus)
                            novelData.isHiatus = false
                        return await nov.update(novelData).then(async n => {
                            if (update) return await nov.fetchJson(page)
                        })

                    }).catch(err => console.log(err))
                } catch (err) {
                    console.log(jsonData[i])
                    console.log(yellow(err.message))
                }
            }
        }

        await Setting.destroy({ where: { key: strings.puppeteer_busy, server: reqGroupID } })
        await page.close()

    } catch (e) {

        console.log(red(e.message))
    }
}




module.exports = fetchNovels