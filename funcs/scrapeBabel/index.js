const { numerics, api } = global.config;
const { launchBrowser } = require('../babelNovel')
const urlTool = require('url')
const { red } = require('chalk').bold

const fetchCSS = async (page, url) => {
    try {
        console.log(url)
        await page.waitFor(numerics.puppeteer_delay)
        await page.goto(url);
        // wait for CSS file to load
        await page.waitFor(numerics.puppeteer_delay / 2)

        let cssFile = await page.evaluate(() => {
            const cssSelector = "link[href*='content-css']"
            try {
                return document.querySelector(cssSelector).href
            } catch (err) {
                return null
            }
        });

        if (!cssFile) return "css_error"

        let [hash_path, hash] = cssFile.split('?hash=')
        if (hash.length < 5) return null

        const hashPath = urlTool.resolve(url, cssFile)
        await page.waitFor(numerics.puppeteer_delay)
        await page.goto(hashPath);

        let css = await page.evaluate(() => {
            return document.querySelector("body").innerText;
        });

        return css

    } catch (err) { console.log(red(err.message)) }
}

const scrapeNovel = async (novel, livemsg, params) => {
    console.log(novel.name)
    let browser = null
    try {
        browser = await launchBrowser()
        const page = await browser.newPage();

        const url = api.novel.replace("/api/", "/").replace("<book>", novel.babelId)
        console.log(url)
        await livemsg.description("Fetching cookie")
        //fetch cookie
        await page.goto(url)
        await livemsg.description("Listing chapters")
        const chapterList = await novel.scrapeChaptersBulk(page, params)

        
        await livemsg.setMax(chapterList.length)
        if (!chapterList.length) return false
        
        const chapterUrl = api.chapter
            .replace("/api/", "/")
            .replace("<book>", novel.canonicalName)
            .replace("<chapterName>", chapterList[0].canonicalName)
        const cssHash = await fetchCSS(page, chapterUrl)
        if (!cssHash) return "css_error"

        if (params.token) {
            await page.setRequestInterception(true);
            // add header for the navigation requests
            page.on('request', request => {
                // Do nothing in case of non-navigation requests.
                if (!request.isNavigationRequest()) {
                    request.continue();
                    return;
                }
                // Add a new header for navigation request.
                const headers = request.headers();
                headers['token'] = params.token
                request.continue({ headers });
            });
        }

        for (var i in chapterList) {
            if (await novel.scrapeContent(page, chapterList[i], cssHash, params))
                await livemsg.progress(parseInt(i) + 1)
        }
        await browser.close()
        return true
    } catch (err) {
        console.log(red(err.message))
        if (browser) await browser.close()
        return false
    }


}

module.exports = { scrapeNovel, fetchCSS }

