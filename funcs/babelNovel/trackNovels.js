const chalk = require('chalk')
const { api } = global.config;
const { TrackNovel, Setting } = require('../../models')
const { red } = chalk.bold

const trackNovels = async (browser, client) => {
    const trackedNovels = await TrackNovel.findAll({
        include: ['novel']
    })
    console.log("tracking novels", trackedNovels.length)
    if (!trackedNovels.length) return true
    
    try {
        const page = await browser.newPage();
        // fetch cookie
        await page.goto("https://babelnovel.com");
        const default_channels = await Setting.findAll({ where: { key: 'latest_chapter_channel' } })
        let handledNovels = {}
        for (var i in trackedNovels) {
            const announcement = trackedNovels[i]
            const trackedNovel = announcement.novel
            console.log(trackedNovel.name)

            let chapter = handledNovels[trackedNovel.babelId] || null
            // if same novel is tracked on multiple discord servers bypass fetch after the first one
            if (!chapter) {
                let json = await trackedNovel.fetchJson(page)
                if (json.lastChapter.id === trackedNovel.lastChapterBabelId)
                    continue

                json.lastChapter.bookCanonicalName = trackedNovel.canonicalName
                chapter = await trackedNovel.jsonToChapter(json.lastChapter, true)
            }

            if (!chapter) continue

            // lets send a message
            const guild = client.guilds.get(announcement.server)
            if (!guild) return console.log(`Guild not found ${announcement.server}`)

            if (!announcement.channels) {
                const setting = default_channels.find(s => s.server === announcement.server)
                if (setting) announcement.channels = setting.value
                else {
                    console.log(`Default channel not found on ${guild.name}`)
                    break
                }
            }


            const roles = announcement.roles ? announcement.roles.split(",").map(role_id =>
                guild.roles.get(role_id)).filter(role => role) : []

            const chapter_url = chapter.Url()
            const roleSpam = roles.join(" ")

            announcement.channels.split(",").map(async channel_id => {
                const channel = guild.channels.get(channel_id)
                await channel.send(`${chapter_url} ${roleSpam}`)
            })

            handledNovels[trackedNovel.babelId] = chapter
        }
        await page.close()
        return true
    } catch (e) {
        console.log(red(e.message))
    }
}

module.exports = trackNovels