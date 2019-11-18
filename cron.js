global.config = require('./config.json');
const { launchBrowser } = require('./funcs/babelNovel')
const fetchLatest = require('./funcs/babelNovel/fetchLatest')
const fetchNovels = require('./funcs/babelNovel/fetchNovels')
const updateNovels = require('./funcs/babelNovel/scrapeNovel')
const { Chapter, Sequelize } = require('./models')

!(async () => {
    const browser = await launchBrowser()

    if (process.argv.includes('latest')) {
        await fetchLatest(browser)
    }
    else if (process.argv.includes('novels')) {
        await fetchNovels(browser)
    }
    else if (process.argv.includes('update')) {
        let params = {
            min: 0,
            max: 10000,
            cron: true,
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

        const novels = await Chapter.findAll(queryStr).then(chapters =>
            chapters.filter(c => c.dataValues.count > 400 && c.dataValues.count < 600).map(c => c.novel)
        )

        await updateNovels(browser, novels, params)
    }

    await browser.close()
})();
