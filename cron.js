global.config = require('./config.json');
const { launchBrowser } = require('./funcs/babelNovel')
const fetchLatest = require('./funcs/babelNovel/fetchLatest')
const fetchNovels = require('./funcs/babelNovel/fetchNovels')
const scrapeNovels = require('./funcs/babelNovel/scrapeNovel')
const announceNovels = require('./funcs/babelNovel/announceNovels')
const trackNovels = require('./funcs/babelNovel/trackNovels')
const { Chapter, Sequelize } = require('./models')

!(async () => {
    const browser = await launchBrowser()

    if (process.argv.includes('latest')) {
        await fetchLatest(browser)
    }
    else if (process.argv.includes('novels')) {
        await fetchNovels(browser)
    }

    else if (process.argv.includes('track')) {
        await trackNovels(browser)
    }

    else if (process.argv.includes('announce')) {
        await announceNovels()
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
                c.dataValues.count > 120 && (!params.greed || c.novel.token == "greed")
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

        await scrapeNovels(browser, novels, params)
    }

    await browser.close()
})();
