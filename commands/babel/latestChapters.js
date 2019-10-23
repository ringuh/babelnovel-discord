const { RichEmbed } = require('discord.js')
const TimeAgo = require('javascript-time-ago');
const { Chapter, Sequelize } = require("../../models");
const { numerics } = global.config
const locale = require('javascript-time-ago/locale/en');

TimeAgo.addLocale(locale)
const timeAgo = new TimeAgo('en-US')

module.exports = {
    name: ['latestchapters'],
    description: 'Lists latest chapters',
    args: "[genre]",
    execute(message, args) {

        let queryStr = {
            order: [["publishTime", "desc"], ["createdAt", "desc"]],
            include: ['novel'],
            limit: numerics.latest_chapter_limit
        }

        const novelStr = args.length ? args.join(' ').trim() : ""
        if (novelStr.length)
            queryStr.where = { isFree: true, '$novel.genre$': { [Sequelize.Op.iLike]: `%${novelStr}%` } }


        Chapter.findAll(queryStr).then(chapters => {
            const announceEmbed = new RichEmbed()
                .setColor('#0099ff')
                .setDescription(`${numerics.latest_chapter_limit} latest ${novelStr} chapters on https://babelnovel.com/latest-update`)
                .addBlankField()

            chapters.filter(c => c.publishTime).map(chapter => {
                let ago = timeAgo.format(new Date(`${chapter.publishTime}z`), "twitter")
                announceEmbed.addField(`${chapter.novel.name} - ${chapter.name} (${ago})`, `${chapter.Url()}`)
            });

            if (!chapters.length)
                announceEmbed.addField(`No chapters found`, `Category: ${novelStr}`)

            message.channel.send(announceEmbed);
        }).catch((err) => {
            console.log(err.message)
            throw err
        })
    },
};