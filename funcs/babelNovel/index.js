const { numerics } = global.config;
const puppeteer = require('puppeteer');
const fetchLatest = require('./fetchLatest')
const fetchNovels = require('./fetchNovels')
const trackNovels = require('./trackNovels')


const launchBrowser = () => {
    return puppeteer.launch({ args: global.config.debian ? ['--no-sandbox', '--disable-setuid-sandbox'] : [] });
}

const BabelNovel = async (client) => {

    browser = await launchBrowser()
    if (process.argv.includes("init"))
        return await fetchNovels(browser, client)
    
    if(process.argv.includes("server")) return console.log("SERVER CMD. skipping intervals")

    return true
    // check tracked novels
    setInterval(async () => {
        const browser = await launchBrowser()
        await trackNovels(browser, client)
        await browser.close()
    }, numerics.track_novel_interval_minutes * 60000)

};


module.exports = { BabelNovel, launchBrowser }

