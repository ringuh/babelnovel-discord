const chalk = require('chalk')
const { api, numerics, strings } = global.config;
const { Novel, TrackNovel, Setting } = require('../../models')
const { red, magenta } = chalk.bold
const scrapeNovel = require('./scrapeNovel')

const checkRaw = async (browser, client) => {
    const trackedNovels = [
        {
            name: "atg",
            url: "http://book.zongheng.com/book/408586.html",
            selector: "div.book-new-chapter > div.tit"
        }
    ]

    try {
        const page = await browser.newPage();
        // fetch cookie


        await page.setRequestInterception(true);
        page.on('request', async request => {
            if (!request.isNavigationRequest()) {
                if (global.config.bad_requests &&
                    global.config.bad_requests.some(str => request.url().includes(str)))
                    return request.abort()
                return request.continue();
            }
            const delay = 500
            await page.waitFor(delay)
            console.log(request.url(), delay)
            return request.continue();
        });


        for (var i in trackedNovels) {
            try {
                const novel = trackedNovels[i]
                console.log(novel.name, novel.url)
                await page.goto(novel.url)
                await page.screenshot({ path: 'screenshot.tmp.png' });


                let data = await page.evaluate(() => {
                    let link = document.querySelector("div.book-new-chapter > div.tit > a");
                    //let link = parent.href 
                    let nr = link.innerText.replace(/\D/g, '').trim();
                    return { chapter: nr, url: link.href }
                });

                console.log(data)

            } catch (err) { err => console.log(magenta(err.message)) }
        }

        await page.close()

    } catch (e) {
        console.log(red(e.message))
    }
}

module.exports = checkRaw