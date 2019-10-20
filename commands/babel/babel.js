
const { usageMessage } = require('../../funcs/commandTools')
const { Novel, Sequelize } = require("../../models")
const { RichEmbed } = require('discord.js')
const { api } = global.config
const puppeteer = require('puppeteer')
const TimeAgo = require('javascript-time-ago');
const locale = require('javascript-time-ago/locale/en');

TimeAgo.addLocale(locale)
const timeAgo = new TimeAgo('en-US')


module.exports = {
    name: ['babel'],
    description: 'Print novel info',
    args: "<novel>",
    async execute(message, args) {
        if (args.length < 1) return usageMessage(message, this)

        const novelStr = args.join(" ")
        const novel = await Novel.findOne({
            where: Sequelize.or(
                Sequelize.where(
                    Sequelize.fn('lower', Sequelize.col('name')),
                    Sequelize.fn('lower', novelStr)
                ),
                Sequelize.where(
                    Sequelize.fn('lower', Sequelize.col('canonicalName')),
                    Sequelize.fn('lower', novelStr)
                )
            )
        })
        if (!novel) return message.channel.send(`Novel by name or alias '${novelStr}' not found`, { code: true });

        const emb = new RichEmbed()
            .setColor('#0099ff')
            .setTitle(novel.name)
            .setURL(api.novel_home.replace("<book>", novel.canonicalName))
            .setThumbnail(novel.cover)
            .setDescription(novel.synopsis.substr(0, 1000))
            .setFooter(novel.genre, novel.cover)
            .setTimestamp()
            .addBlankField()

            .addField("Chapters", novel.releasedChapterCount, true)
            .addField("Rating", novel.ratingNum, true)
            .addField("Name", novel.alias, true)
        if (novel.author || novel.authorEn)
            emb.addField("Author",
                [novel.authorEn, novel.author].filter(a => a && a.length).join(" | "), true)

        /*  if (novel.source_name)
             emb.addField("Source", novel.source_name, true) */
        if (novel.source_url)
            emb.addBlankField()
                .addField("Source", novel.source_url)




        message.channel.send(emb)


        //await nov.fetchJson(page)
    }
};