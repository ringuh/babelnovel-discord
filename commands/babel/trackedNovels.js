const { RichEmbed } = require('discord.js')
const TimeAgo = require('javascript-time-ago');
const { TrackNovel } = require("../../models");
const { numerics } = global.config
const locale = require('javascript-time-ago/locale/en');

TimeAgo.addLocale(locale)
const timeAgo = new TimeAgo('en-US')

module.exports = {
    name: ['trackednovels'],
    description: 'Lists tracked novels on your server',
    args: false,
    async execute(message, args) {
        const novels = await TrackNovel.findAll({
            where: { server: message.guild.id },
            order: [["createdAt", "desc"]],
            include: ['novel'],
        });

        let msg = [`Tracked novels (${novels.length}):`, '']
        if(!novels.length) msg.push("not tracking any novels")

        for (var i in novels) {
            const n = novels[i]

            const [channels, roles] = ['channels', 'roles'].map(k => {
                return n[k] ? n[k].split(",").map(k_id => {
                    const r = message.guild[k].get(k_id)
                    return r ? `@${r.name}` : null
                }).filter(c =>c) : [k == 'roles' ? `no notifications` : '<#default>']
            })

            const hdr = `${n.novel.name} -- ${channels.join(' / ')} (${roles.join(" / ")})`
            msg.push(hdr)


        }

        message.channel.send(msg, { code: true });
    },
};