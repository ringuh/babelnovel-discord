const { numerics, api } = global.config;
const { launchBrowser } = require('../babelNovel')
const urlTool = require('url')
const { red } = require('chalk').bold

const fetchCSS = async (page, url) => {
    try {
        console.log(url)
        await page.goto(url);
        // clear prompts
      /*   await page.evaluate(() => {
            const prompts = [".ant-modal-mask", ".ant-modal-wrap"]
            var elements = document.querySelectorAll(prompts);
            for (var i = 0; i < elements.length; i++) {
                elements[i].parentNode.removeChild(elements[i]);
            }
        }) */
       
        let cssFile = await page.evaluate(() => {
            const cssSelector = "link[href*='content-css']"
            return document.querySelector(cssSelector).href;
        });

        if (!cssFile) return console.log("cssFile not found")
        console.log(cssFile)
        let [hash_path, hash] = cssFile.split('?hash=')
        if (hash.length < 5) return null

        const hashPath = urlTool.resolve(url, cssFile)
        await page.goto(hashPath);
       
        let css = await page.evaluate(() => {
            return document.querySelector("body").innerText;
        });

        return css

    } catch (err) { console.log(red(err.message)) }
}

const scrapeNovel = async (novel, livemsg) => {
    console.log(novel.name)
    const browser = await launchBrowser()
    try {
        const url = api.novel.replace("/api/", "/").replace("<book>", novel.babelId)
        console.log(url)
        const page = await browser.newPage();
        await livemsg.description("Fetching cookie")
        //fetch cookie
        await page.goto(url)
        await livemsg.description("Listing chapters")
        const chapterList = await novel.scrapeChapters(page)

        await livemsg.max(chapterList.length)
        if (!chapterList.length) return false

        const chapterUrl = api.chapter
            .replace("/api/", "/")
            .replace("<book>", novel.canonicalName)
            .replace("<chapterName>", chapterList[0].canonicalName)
        const cssHash = await fetchCSS(page, chapterUrl)

        for (var i in chapterList) {
            if (await novel.scrapeContent(page, chapterList[i], cssHash))
                await livemsg.progress(parseInt(i) + 1)


        }
        return true
    } catch (err) {
        console.log(red(err.message))
        return false
    }


}

module.exports = { scrapeNovel }

