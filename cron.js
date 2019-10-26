global.config = require('./config.json');
const { launchBrowser } = require('./funcs/babelNovel')
const fetchLatest = require('./funcs/babelNovel/fetchLatest')
const fetchNovels = require('./funcs/babelNovel/fetchNovels')

const db = require('./models')

!(async () => {
    const browser = await launchBrowser()

    if (process.argv.includes('latest')) {
        await fetchLatest(browser)
    }

    else if (process.argv.includes('novels')) {
        await fetchNovels(browser)
    }

    console.log("closing browser")
    await browser.close()
})();
