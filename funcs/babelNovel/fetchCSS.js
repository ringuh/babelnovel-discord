const { numerics, api } = global.config;
const { red, magenta } = require('chalk').bold
const urlTool = require('url')


const CSSError = (msg) => {
    let timeout = msg.match(/navigation timeout/i)
    if (msg.match(/net::ERR_ABORTED/i)) timeout = true
    throw { // net::ERR_ABORTED
        code: timeout ? 55 : 5,
        type: "css_error",
        message: msg || "css_error"
    }
}

const fetchCSS = async (page, url) => {
    try {
        console.log(magenta("Fetching CSS"))
        await page.goto(url);
        // wait for CSS file to load
        await page.waitFor(500)

        let cssFile = await page.evaluate(() => {
            const cssSelector = "link[href*='content-css']"
            try {
                return document.querySelector(cssSelector).href
            } catch (err) {
                return null
            }
        });

        if (!cssFile) return CSSError('CSS File not found')

        let [hash_path, hash] = cssFile.split('?hash=')
        if (hash.length < 5) return CSSError('CSS hash not found', cssFile)

        const hashPath = urlTool.resolve(url, cssFile)
        await page.goto(hashPath);

        let css = await page.evaluate(() => {
            return document.querySelector("body").innerText;
        });
        if (!css) return CSSError('CSS content not found')

        return css

    } catch (err) {
        return CSSError(err.message)
    }
}

module.exports = fetchCSS