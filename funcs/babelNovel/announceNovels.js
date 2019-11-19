const chalk = require('chalk')
const { api, discord_token } = global.config;
const { Chapter, Novel, TrackNovel, Setting } = require('../../models')
const { red } = chalk.bold
const { Client } = require('discord.js')

const Announce = async (client, chapters) => {
    const default_channels = await Setting.findAll({ where: { key: 'latest_chapter_channel' } })
    for (var i in chapters) {
        try {
            const chapter = chapters[i];
            for (var j in chapter.novel.trackers) {
                const announcement = chapter.novel.trackers[j]
                // lets send a message
                const guild = await client.guilds.get(announcement.server)
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

                const chapter_url = chapter.Url(chapter.novel)
                const roleSpam = roles.join(" ")

                const channels = announcement.channels.split(",")
                for (var m in channels) {
                    const channel_id = channels[m]
                    const channel = guild.channels.get(channel_id)
                    await channel.send(`${chapter_url} ${roleSpam}`).catch(err => console.log(err.message))
                }
            }
            
            await chapter.update({ isAnnounced: true }).catch(err => console.log(err.message))
        } catch (e) {
            console.log(red(e.message))
        }
    }
    
    await client.destroy()
}


const announceNovels = async () => {
    const chapters = await Chapter.findAll({
        where: { isAnnounced: false },
        order: [['index', "asc"], ['sum', 'asc']],
        include: [{
            model: Novel,
            as: 'novel',
            required: true,
            include: [
                { model: TrackNovel, as: 'trackers', required: true }
            ]
        }]
    })
    console.log("Chapters waiting for announcement", chapters.length)
    if (!chapters.length) return false

    const client = new Client();

    client.once('ready', async () => {
        console.log('Announce running!');
        await Announce(client, chapters)
    });

    client.login(discord_token);


}



module.exports = announceNovels