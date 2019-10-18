const axios = require('axios');
const puppeteer = require('puppeteer');
const { api, interval } = global.config;
const { AnnounceNovel, LatestChapter, Setting } = require('../models')

const parseLatest = async (client) => {
    try {
        const announceNovels = await AnnounceNovel.findAll({})
        const servers = await Setting.findAll({ where: { key: 'latest_chapter_channel' } })
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto("https://babelnovel.com");
        await page.goto(`${api.latest_chapters}?pageSize=20`);
        await page.screenshot({ path: `babelshot.tmp.png` });

        const json = await page.evaluate(() => {
            return JSON.parse(document.querySelector("body").innerText);
        });
        if (!json) return console.log("nothing found")
        console.log(json.data[0])

        
    
        json.data.reverse().map(async c => {
            c.babelId = c.id
            delete c.id

            const new_chapter = await LatestChapter.findOne({ where: { babelId: c.babelId } }).then(async lc => {
                if (!lc) return await LatestChapter.create(c)
                return null
            })
            
            if(!new_chapter || !announceNovels.length) return c
            const announces = await announceNovels.filter(an => an.bookId === c.bookId)
            announces.map(an => {
                const guild = client.guilds.get(an.server)
                if(!guild) return null

                if(!an.channels){
                    an.channels = ""
                    const setting = servers.find(s => s.server === an.server)
                    if(setting) an.channels = setting.value
                }

                const roles = an.roles ? an.roles.split(",").map(role_id => 
                    guild.roles.get(role_id)).filter(role => role): []

                const msg = `${new_chapter.Url()} ${roles.join(" ")}`
                
                an.channels.split(",").map(channel_id => {
                    const channel = guild.channels.get(channel_id)
                    channel.send(msg, { code: false });
                }) 
                
                    
            })
            

        })

        await page.close()
        await browser.close()
    }
    catch (e) {
        console.log(e)
    }
}

const LatestChapters = async (client) => {
    console.log(api.latest_chapters)

    parseLatest(client)

    //setInterval(() => parseLatest(client), interval.latest_chapters * 1000)
};


module.exports = LatestChapters

