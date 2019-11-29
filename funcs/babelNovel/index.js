const puppeteer = require('puppeteer');
const { strings } = global.config
const { Setting } = require('../../models')
const { green, red, yellow, magenta } = require('chalk').bold
let browser = null;
const launchBrowser = async () => {
    if (browser && browser.isConnected())
        return browser
    console.log("opening new browser")
    const setting_key = `${strings.puppeteer_busy}_browser`;

    try {
        const browserWSEndpoint = await Setting.findOne({
            where: { key: setting_key }
        }).then(setting => setting ? setting.value : null)
        if (browserWSEndpoint) {
            browser = await puppeteer.connect({
                browserWSEndpoint: browserWSEndpoint
            });
            console.log(green("Puppeteer opened on existing chrome"))
            return browser
        }

    } catch (err) {
        //console.log("Browser browserWSEndpoint error:", red(err.message))
    }

    let chrome_args = ['--mute-audio', '--disable-setuid-sandbox']
    if (global.config.debian)
        chrome_args = [...chrome_args, '--no-sandbox', '--disable-setuid-sandbox']

    browser = await puppeteer.launch({
        args: chrome_args
    });

    const browserWSEndpoint = browser.wsEndpoint()
    await Setting.findOrCreate({
        where: { key: setting_key },
        defaults: {
            server: "headless_chrome",
            value: browserWSEndpoint
        }
    }).then(async ([setting, created]) => {
        console.log(yellow("New Chrome @", browserWSEndpoint))
        await setting.update({ value: browserWSEndpoint })
    });
    return browser
}

module.exports = { launchBrowser }

