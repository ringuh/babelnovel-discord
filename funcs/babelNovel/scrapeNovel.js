const { numerics, api, strings } = global.config;
const { launchBrowser } = require('.')
const { red, green, yellow, magenta, blue } = require('chalk').bold
const { Novel, TrackNovel, Setting } = require('../../models')
const fetchCSS = require('./fetchCSS')
const LiveMessage = require('../liveMessage')

const scrapeNovels = async (browser, novels, params, livemsg = new LiveMessage()) => {
    const reqGroupID = `${params.reqGroupID || Date.now()}`
    console.log(blue("Scraping novels:", novels.length))

    const defaultToken = await Setting.findOne({
        where: { key: `babel_token_rinku` }
    }).then(setting => setting ? setting.value : null)

    let cssHash = null
    for (var i in novels) {
        let page = null
        try {
            const novel = novels[i];
            if (novel.isCompleted && !params.force) continue
            if (novel.isHiatus && !params.check) continue
            // check if there is babel token for this particular novel
            let token = params.token
            if (!token && novel.token)
                token = await Setting.findOne({
                    where: {
                        key: `babel_token_${novel.token}`
                    }
                }).then(setting => setting ? setting.value : null)

            // skip premium novels without token
            if (novel.isPay && !token) continue
            // hidden novels need to be in a library
            if (novel.isRemoved && !token) token = defaultToken
            // this should never happen
            if (novel.isRemoved && !token) continue

            await livemsg.scrapeProgress(i, novel)
            console.log(green(novel.name), novel.isPay ? '$' : '', novel.isRemoved ? 'removed' : '', token)

            browser = await launchBrowser(browser)
            page = await browser.newPage();
            await page.setRequestInterception(true);
            page.on('request', async request => {
                if (!request.isNavigationRequest())
                    return request.continue();

                const busy = await Setting.findOrCreate({
                    where: { key: strings.puppeteer_busy },
                    defaults: {
                        server: reqGroupID,
                        value: Date.now()
                    }
                }).then(async ([setting, created]) => {
                    if (setting.server == reqGroupID) {
                        await setting.update({
                            server: reqGroupID,
                            value: Date.now()
                        })
                        return false
                    }

                    const timeSince = Date.now() - setting.updatedAt
                    const waitFor = numerics.puppeteer_busy_seconds

                    if (timeSince < waitFor) return true

                    await setting.update({
                        server: reqGroupID,
                        value: Date.now()
                    })
                    return false
                });
                if (busy) {
                    console.log(yellow("puppeteer is busy"))
                    await livemsg.setDescription("Puppeteer is busy", null, 1)
                    return request.abort("aborted");
                }

                await page.waitFor(numerics.puppeteer_delay)
                console.log(request.url())
                if (!token) return request.continue();

                // Add a new header for navigation request.
                const headers = request.headers();
                headers['token'] = token
                return request.continue({ headers });
            });

            await livemsg.setDescription("Fetching cookie")
            await novel.fetchCookie(page, params)

            await livemsg.setDescription("Listing chapters")
            const chapterList = await novel.scrapeChaptersBulk(page, params)
            
            console.log(chapterList.length)
            if (!chapterList.length) continue;

            const min = params.min > 0 ? (params.min) : 1
            await livemsg.setMax(min, chapterList.length)

            const chapterUrl = api.chapter
                .replace("/api/", "/")
                .replace("<book>", novel.canonicalName)
                .replace("<chapterName>", chapterList[0].canonicalName)
            cssHash = cssHash || await fetchCSS(page, chapterUrl)

            let counter = 0;
            for (var i in chapterList) {
                if (await novel.scrapeContent(page, chapterList[i], cssHash, params)) {
                    await livemsg.progress(min + parseInt(i))
                    // dont scrape unlimited chapters on automated process
                    if (params.cron) {
                        counter++;
                        if (counter >= numerics.cron_chapters)
                            break
                    }
                }

            }

            await page.close()
        } catch (err) {
            console.log(red(err.message))
            if (page) await page.close()
            await livemsg.setDescription(err.message, null, 0)
            if (err.code && err.code === 666)
                return err
        }
    }
    await Setting.destroy({ where: { key: strings.puppeteer_busy, server: reqGroupID } })
    if (browser) await browser.close()
    return { code: 0 }
}

module.exports = scrapeNovels

