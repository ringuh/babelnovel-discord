const chalk = require('chalk')
const { api } = global.config;
const { Novel, TrackNovel, Setting } = require('../../models')
const { red } = chalk.bold

const trackNovels = async (browser, client) => {
    const trackedNovels = await Novel.findAll({
        include: [{ model: TrackNovel, as: 'trackers', required: true }]
    })
    console.log("tracking", trackedNovels.length, "novels")
    if (!trackedNovels.length) return true

    try {
        const page = await browser.newPage();
        // fetch cookie
        await page.goto("https://babelnovel.com");
        const default_channels = await Setting.findAll({ where: { key: 'latest_chapter_channel' } })

        for (var i in trackedNovels) {
            const novel = trackedNovels[i]
            let json = await novel.fetchJson(page)
            if (json.lastChapter.id === novel.lastChapterBabelId)
                continue

            json.lastChapter.bookCanonicalName = novel.canonicalName
            chapter = await novel.jsonToChapter(json.lastChapter, true)
            if (!chapter) continue

            for (var j in novel.trackers) {
                const announcement = novel.trackers[j]
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

                const chapter_url = chapter.Url(novel)
                const roleSpam = roles.join(" ")

                announcement.channels.split(",").map(async channel_id => {
                    const channel = guild.channels.get(channel_id)
                    await channel.send(`${chapter_url} ${roleSpam}`)
                })
            }
        }
        await page.close()
        return true
    } catch (e) {
        console.log(red(e.message))
    }
}

module.exports = trackNovels