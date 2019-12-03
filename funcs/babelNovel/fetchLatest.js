const { api, numerics } = global.config;
const { TrackNovel, Novel } = require('../../models')

const fetchLatest = async (browser) => {
    console.log("fetching latest")

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

            await page.waitFor(numerics.puppeteer_delay)
            console.log(request.url())
            request.continue();
        });
        await page.goto("https://babelnovel.com/search");
        const url = `${api.latest_chapters}?pageSize=${numerics.latest_chapter_count}`
        await page.goto(url);
        //await page.screenshot({ path: `babelshot.tmp.png` });

        const json = await page.evaluate(() => {
            return JSON.parse(document.querySelector("body").innerText);
        });
        await page.close()

        if (!json || json.code !== 0 || !json.data.length) return true

        const arr = json.data.reverse()
        for (var i in arr) {
            const chapterData = arr[i];
            const novel = await Novel.findOne({
                where: {
                    babelId: chapterData.bookId
                },
                include: ['trackers']
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

