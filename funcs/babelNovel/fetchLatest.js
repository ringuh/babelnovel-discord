const urlTool = require('url')
const { api, numerics } = global.config;
const { TrackNovel, Chapter, Novel } = require('../../models')

const fetchLatest = async (browser, client) => {
    console.log("fetching latest")

    const excludedNovels = await TrackNovel.findAll({
        include: ['novel']
    }).map(n => n.novel.babelId)

    try {
        const page = await browser.newPage();
        await page.goto("https://babelnovel.com");
        const url = `${api.latest_chapters}?pageSize=${numerics.latest_chapter_count}`
        await page.goto(url);
        //await page.screenshot({ path: `babelshot.tmp.png` });
        console.log(url)
        const json = await page.evaluate(() => {
            return JSON.parse(document.querySelector("body").innerText);
        });
        await page.close()

        if (!json || json.code !== 0 || !json.data.length) return true

        const arr = json.data.reverse()
        for (var i in arr) {
            const chapterData = arr[i];
            if (excludedNovels.includes(chapterData.bookId))
                continue
            
            const novel = await Novel.findOne({
                where: {
                    babelId: chapterData.bookId
                }
            })
            if (!novel) continue
            await novel.jsonToChapter(chapterData)
        }


    }
    catch (e) {
        console.log(e.message)
    }
}

module.exports = fetchLatest

