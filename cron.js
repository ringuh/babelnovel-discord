global.config = require('./config.json');
global.config.db = global.config[global.config.db]
const { numerics } = global.config
const { launchBrowser } = require('./funcs/babelNovel')
const fetchLatest = require('./funcs/babelNovel/fetchLatest')
const fetchNovels = require('./funcs/babelNovel/fetchNovels')
const scrapeNovels = require('./funcs/babelNovel/scrapeNovel')
const announceNovels = require('./funcs/babelNovel/announceNovels')
const trackNovels = require('./funcs/babelNovel/trackNovels')
const checkRaw = require('./funcs/babelNovel/checkRaw')
const { Chapter, Novel, Sequelize } = require('./models')

!(async () => {
    console.log(new Date(), process.argv)
    let browser = null;

    if (process.argv.includes('latest')) {
        browser = await launchBrowser()
        await fetchLatest(browser)
        //if (browser) await browser.close()
    }
    else if (process.argv.includes('novels')) {
        browser = await launchBrowser()
        await fetchNovels(browser)
        //if (browser) await browser.close()
    }

    else if (process.argv.includes('track')) {
        browser = await launchBrowser()
        await trackNovels(browser)
        if (!process.argv.includes('all'))
            setTimeout(async () => {
                process.exit()
            }, 170 * 1000)
    }

    else if (process.argv.includes('announce')) {
        await announceNovels()
    }

    else if (process.argv.includes('raw')) {
        browser = await launchBrowser()
        await checkRaw(browser)
    }

    else if (process.argv.includes('update')) {
        let params = {
            min: 0,
            max: 10000,
            cron: true,
            reqGroupID: 'updateChapters'
        };
        let queryStr = {
            where: {
                chapterContent: {
                    [Sequelize.Op.not]: null
                }
            },
            group: ['novel.id'],
            attributes: [[Sequelize.fn('COUNT', 'id'), 'count']],
            include: ['novel']
        }

        const novel_ids = await Chapter.findAll(queryStr).then(chapters =>
            chapters.filter(c =>
                c.dataValues.count > numerics.update_chapter_limit && (!params.greed || c.novel.token == "greed")
            ).map(c => c.novel.id)
        )

        const novels = await Novel.findAll({
            where: {
                id: {
                    [Sequelize.Op.in]: novel_ids
                }
            },
            include: ['trackers'],
            order: ['canonicalName']
        });
        browser = await launchBrowser()
        await scrapeNovels(novels, params)
    }
    if (browser) await browser.disconnect()
    process.exit()
    //await browser.close()
})();
