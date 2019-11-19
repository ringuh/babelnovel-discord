const puppeteer = require('puppeteer');

const launchBrowser = browser => {
    if (browser && browser.isConnected())
        return browser
    return puppeteer.launch({
        args: global.config.debian ? ['--no-sandbox', '--disable-setuid-sandbox'] : []
    });
}

module.exports = { launchBrowser }

