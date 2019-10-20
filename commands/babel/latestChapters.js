const { RichEmbed } = require('discord.js')
const TimeAgo = require('javascript-time-ago');
const { Chapter } = require("../../models");
const { numerics } = global.config
const locale = require('javascript-time-ago/locale/en');

TimeAgo.addLocale(locale)
const timeAgo = new TimeAgo('en-US')

module.exports = {
    name: ['latestchapters', "lc"],
    description: 'Lists latest chapters',
    args: false,
    execute(message, args) {
        Chapter.findAll({
            order: [["publishTime", "desc"], ["createdAt", "desc"]],
            limit: numerics.latest_chapter_limit
        }).then(chapters => {
            let str = [`Latest chapters:`]
           

            chapters.map(chapter => {
                let ago = timeAgo.format(new Date(`${chapter.publishTime}z`), "twitter")
                str.push(`${chapter.Url()} - ${ago}`)
            });
            str.push('', "Available commands:", "!requestrole <role> -- adds available role to user")
            str.push("!managerole <role> -- adds/removes role as available (admin)")

            const announceEmbed = new RichEmbed()
                .setColor('#0099ff')
                .setDescription(`${numerics.latest_chapter_limit} latest chapters on https://babelnovel.com/latest-update`)
                .addBlankField()

            chapters.map(chapter => {
                let ago = timeAgo.format(new Date(`${chapter.publishTime}z`), "twitter")
                announceEmbed.addField(`${chapter.bookName} - ${chapter.name} (${ago})`, `${chapter.Url()}`)
            });

            message.channel.send(announceEmbed);
        })
            .catch((err) => {
                console.log(err.message)
                throw err
            })
    },
};