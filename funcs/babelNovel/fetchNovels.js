const urlTool = require('url')
const chalk = require('chalk')
const { api } = global.config;
const { Novel } = require('../../models')
const { red } = chalk.bold

const fetchNovels = async (browser, client) => {
    console.log("fetching novels")
    /* const novels = await Novel.findAll({})
    if (novels.length) return true */

    try {
        const page = await browser.newPage();
        // fetch cookie
        await page.goto("https://babelnovel.com");

        let pageNr = 0;
        let json = { code: 0, data: [1] }
        while (json.code === 0 && json.data.length) {
            const fetch_url = api.novels.replace("<pageNr>", pageNr).replace("<pageSize>", 20)
            console.log(fetch_url)
            await page.goto(fetch_url);
            json = await page.evaluate(() => {
                return JSON.parse(document.querySelector("body").innerText);
            });
            pageNr++;
            //json.code = 1

            for (var i in json.data) {
                const novelData = json.data[i]
                novelData.babelId = novelData.id
                delete novelData.id
                novelData.cover = novelData.cover ? urlTool.parse(novelData.cover).href : null
                novelData.genre = novelData.genres.map(genre => genre.name).filter(n => n).join(" | ")
                
                const novel = await Novel.findOrCreate({
                    where: {
                        babelId: novelData.babelId
                    }
                }).then(async ([nov, created]) => {
                    await nov.jsonToChapter(novelData.lastChapter)
                    return await nov.update(novelData).then(async n => {
                        if (created) await nov.fetchJson(page)
                        return n
                    })

                })
            }
        }
        await page.close()

    } catch (e) {
        console.log(red(e.message))
    }
}




module.exports = fetchNovels