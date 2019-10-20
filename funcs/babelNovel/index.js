const { numerics } = global.config;
const puppeteer = require('puppeteer');
const fetchLatest = require('./fetchLatest')
const fetchNovels = require('./fetchNovels')
const trackNovels = require('./trackNovels')
let browser = null

const launchBrowser = async (nBrowser = browser) => {
    if (!nBrowser)
        nBrowser = await puppeteer.launch({ args: global.config.debian ? ['--no-sandbox', '--disable-setuid-sandbox'] : [] });
    else {
        if (!nBrowser.isConnected())
            nBrowser = await launchBrowser()
    }

    return nBrowser
}

const BabelNovel = async (client) => {
    browser = await launchBrowser()
    if (process.argv.includes("init"))
        await fetchNovels(browser, client)
    //await fetchLatest(browser, client)
    //await trackNovels(browser, client)

    // check tracked novels
    setInterval(async () => {
        browser = await launchBrowser(browser)
        await trackNovels(browser, client)
    }, numerics.track_novel_interval_minutes * 60000)

    // check latest chapters but dont announce them
    setInterval(async () => {
        browser = await launchBrowser(browser)
        await fetchLatest(browser, client)
    }, numerics.latest_chapter_interval_minutes * 60000)

    // novel updates
    setInterval(async () => {
        browser = await launchBrowser(browser)
        await fetchNovels(browser, client)
    }, numerics.book_interval_hours * 60000 * 60 * 24)

    //setInterval(() => parseLatest(client), numerics.latest_chapter_interval_minutes * 60000)
};


module.exports = { BabelNovel, launchBrowser }

