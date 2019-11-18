const { numerics } = global.config;
const puppeteer = require('puppeteer');
const trackNovels = require('./trackNovels')


const launchBrowser = browser => {
    if (browser && browser.isConnected())
        return browser
    return puppeteer.launch({ args: global.config.debian ? ['--no-sandbox', '--disable-setuid-sandbox'] : [] });
}

const BabelNovel = async (client) => {
    if (process.argv.includes("server"))
        return console.log("SERVER CMD. skipping intervals")

    // check tracked novels
    setInterval(async () => {
        let browser = null
        try {
            browser = await launchBrowser()
            await trackNovels(browser, client)
            await browser.close()
        }
        catch (err) {
            console.log(err.message)
            if (browser) await browser.close()
        }
    }, numerics.track_novel_interval_minutes)

};


module.exports = { BabelNovel, launchBrowser }

