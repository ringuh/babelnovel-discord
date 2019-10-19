const puppeteer = require('puppeteer');
const urlTool = require('url')
const { api, numerics } = global.config;
const { AnnounceNovel, LatestChapter, Setting } = require('../models')

const parseLatest = async (client) => {

    /* /let tmp = urlTool.parse('https://img.babelchain.org/book_images/Monarch of the Dark Nights.jpg').href
    let tmp = urlTool.parse(null).href || null
    console.log(tmp)
    return true */
    try {
        const announceNovels = await AnnounceNovel.findAll({})
        const servers = await Setting.findAll({ where: { key: 'latest_chapter_channel' } })
        const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
        const page = await browser.newPage();
        await page.goto("https://babelnovel.com");
        await page.goto(`${api.latest_chapters}?pageSize=${numerics.latest_chapter_count}`);
        await page.screenshot({ path: `babelshot.tmp.png` });

        const json = await page.evaluate(() => {
            return JSON.parse(document.querySelector("body").innerText);
        });
        if (!json) return console.log("nothing found")
        console.log(json.data[0])



        json.data.reverse().map(async chapterData => {
            chapterData.babelId = chapterData.id
            chapterData.bookCover = chapterData.bookCover ? urlTool.parse(chapterData.bookCover).href : null
            delete chapterData.id
            const url = `https://babelnovel.com/books/${chapterData.bookCanonicalName}/chapters/${chapterData.canonicalName}`
            console.log(url)
            const new_chapter = await LatestChapter.findOne({ where: { babelId: chapterData.babelId } })
                .then(async lc => {
                    if (!lc) return await LatestChapter.create(chapterData)
                    //return lc
                    //return null
                })
           
            if (!new_chapter || !announceNovels.length) return null
            const announces = await announceNovels.filter(announce => announce.bookId === chapterData.bookId)
            announces.map(announce => {
                const guild = client.guilds.get(announce.server)
                if (!guild) return console.log(`Guild not found ${announce.server}`)

                if (!announce.channels) {
                    const setting = servers.find(s => s.server === announce.server)
                    if (setting) announce.channels = setting.value
                    else return console.log(`Default channel not found on ${guild.name}`)
                }

                const roles = announce.roles ? announce.roles.split(",").map(role_id =>
                    guild.roles.get(role_id)).filter(role => role) : []

                const msg = `${new_chapter.Url()} ${roles.join(" ")}`
                const chapter_url = new_chapter.Url()
                const roleSpam = roles.join(" ")

                announce.channels.split(",").map(channel_id => {
                    const channel = guild.channels.get(channel_id)
                    channel.send(`${chapter_url} ${roleSpam}`)
                })


            })


        })

        await page.close()
        await browser.close()
    }
    catch (e) {
        console.log(e.message)
    }
}

const LatestChapters = async (client) => {
    console.log(api.latest_chapters)

    parseLatest(client)

    setInterval(() => parseLatest(client), numerics.latest_chapter_interval * 60000)
};


module.exports = LatestChapters

