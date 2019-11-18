const { numerics, api } = global.config;
const { launchBrowser } = require('.')
const urlTool = require('url')
const { red, green, yellow, magenta, blue } = require('chalk').bold
const { Setting } = require('../../models')
const fetchCSS = require('./fetchCSS')
const LiveMessage = require('../liveMessage')

const updateNovels = async (browser, novels, params, livemsg = new LiveMessage()) => {
    console.log(novels.length)
    let cssHash = null
    for (var i in novels) {
        try {
            const novel = novels[i];
            if(novel.isPay && !params.token) continue
            let count = 0;
            console.log(green(novel.name))
            let busy = null;
            browser = await launchBrowser(browser)
            const page = await browser.newPage();
            await page.setRequestInterception(true);
            page.on('request', async request => {
                if (!request.isNavigationRequest())
                    return request.continue();
                
                    const busy = await Setting.findOne({
                        where: { key: "puppeteer_busy" },
                    }).then(setting => {
                        if(!setting) return false
                        const startTime = Date.now() - setting.updatedAt
                        const waitFor = 120*1000
                        return startTime < waitFor
                    });
                if(busy){
                    console.log(yellow("puppeteer is busy"))
                    await livemsg.description("Puppeteer is busy")
                    return request.abort("aborted");
                }
                
                

                await page.waitFor(numerics.puppeteer_delay)
                console.log(request.url())
                if (!params.token) return request.continue();

                // Add a new header for navigation request.
                const headers = request.headers();
                headers['token'] = params.token
                return request.continue({ headers });
            });

            if(busy)
                console.log("return busy")

            console.log(params)
            await livemsg.description("Fetching cookie")
            await novel.fetchCookie(page, params)

            await livemsg.description("Listing chapters")
            const chapterList = await novel.scrapeChaptersBulk(page, params)
            if (!chapterList.length) return { code: 0 }
            
            const min = params.min > 0 ? (params.min) : 1
            await livemsg.setMax(min, chapterList.length)

            const chapterUrl = api.chapter
                .replace("/api/", "/")
                .replace("<book>", novel.canonicalName)
                .replace("<chapterName>", chapterList[0].canonicalName)
            cssHash = cssHash || await fetchCSS(page, chapterUrl)

            let counter = 0;
            for (var i in chapterList) {
                if (await novel.scrapeContent(page, chapterList[i], cssHash, params)){
                    await livemsg.progress(min + parseInt(i))
                    // dont scrape unlimited chapters on automated process
                    if(params.cron){
                        counter++;
                        if(counter >= numerics.cron_chapters)
                            break
                    }
                }
                    
            }

            await page.close()
        } catch (err) {
            console.log(red(err.message))
            livemsg.description(err.message, true)
            //return { code: err.code || 3, message: err.message }
        }
    }
    await browser.close()
    return { code: 0 }
}

module.exports = updateNovels

