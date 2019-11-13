
const { usageMessage } = require('../../funcs/commandTools')
const { Novel, Chapter, Sequelize } = require("../../models")
const { RichEmbed } = require('discord.js')
const { api, numerics } = global.config

module.exports = {
    name: ['babel'],
    description: 'Print novel info',
    args: "<novel>",
    async execute(message, args, params) {
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
            ),
            include: [{
                model: Chapter, as: 'chapters',
                where: {
                    chapterContent: {
                        [Sequelize.Op.not]: null
                    }
                },
                attributes: ['index'],
                required: true
            }]
        })
        if (!novel) return await message.channel.send(
            `Novel by name or alias '${novelStr}' not found`, { code: true }
        ).then(msg =>
            msg.delete(numerics.epub_lifespan_seconds * 1000)
                .then(() => this.message.delete())
        )

        await message.channel.startTyping(2)
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
            .addField("Epub", novel.chapters.length, true)
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

        await message.channel.send(emb).then(msg => {
            message.channel.stopTyping(true)
            if (!params.includes("keep"))
                msg.delete(numerics.epub_lifespan_seconds * 1000).then(() => message.delete())
        })


        //await nov.fetchJson(page)
    }
};