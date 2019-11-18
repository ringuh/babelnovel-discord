const chalk = require('chalk')
const { api, numerics } = global.config;
const { Novel, Setting, TrackNovel } = require('../../models')
const { red } = chalk.bold

const fetchNovels = async (browser) => {
    console.log("fetching novels")
    /* const novels = await Novel.findAll({})
    if (novels.length) return true */
    const excludedNovels = await TrackNovel.findAll({
        include: ['novel']
    }).map(n => n.novel.babelId)

    try {
        const page = await browser.newPage();
        await page.setRequestInterception(true);
        page.on('request', async request => {
            if (!request.isNavigationRequest())
                return request.continue();

            await Setting.findOrCreate({
                where: { key: "puppeteer_busy" },
                defaults: { value: Date.now(), server: 'localhost' }
            }).then(async ([setting, created]) => {
                await setting.update({ value: Date.now() })
                return setting
            });

            await page.waitFor(numerics.puppeteer_delay * 2)
            console.log(request.url())
            request.continue();
        });
        // fetch cookie
        await page.goto("https://babelnovel.com/search");

        let pageNr = 0;
        let json = { code: 0, data: [1] }
        while (json.code === 0 && json.data.length) {
            const fetch_url = api.novels.replace("<pageNr>", pageNr).replace("<pageSize>", 20)

            await page.goto(fetch_url);
            json = await page.evaluate(() => {
                return JSON.parse(document.querySelector("body").innerText);
            });
            pageNr++;

            for (var i in json.data) {
                const novelData = json.data[i]
                novelData.babelId = novelData.id
                delete novelData.id

                if (excludedNovels.includes(novelData.babelId))
                    continue

                novelData.genre = novelData.genres.map(genre => genre.name).filter(n => n).join(" | ")

                const novel = await Novel.findOrCreate({
                    where: {
                        babelId: novelData.babelId
                    }
                }).then(async ([nov, created]) => {
                    await nov.jsonToChapter(novelData.lastChapter)
                    return await nov.update(novelData).then(async n => {
                        if (created || novelData.releasedChapterCount > 120)
                            return await nov.fetchJson(page)
                    })

                }).catch(err => console.log(err))

            }

        }
        
        await page.close()

    } catch (e) {
        
        console.log(red(e.message))
    }
}




module.exports = fetchNovels