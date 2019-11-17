
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
                required: false
            }]
        })
        if (!novel) return await message.channel.send(
            `Novel by name or alias '${novelStr}' not found`, { code: true }
        ).then(msg => msg.Expire(message))

        //await message.channel.startTyping()

        const emb = new RichEmbed()
            .setColor('#0099ff')
            .setTitle(novel.name)
            .setURL(api.novel_home.replace("<book>", novel.canonicalName))
            .setThumbnail(novel.cover)
            .setDescription(novel.synopsis.substr(0, 1000))
            .setFooter(novel.genre, novel.cover)
            .setTimestamp()
            .addField("bookId", novel.babelId, true)
            .addField("Rating", Math.round(novel.ratingNum * 100) / 100, true)
            .addBlankField(true)
            .addField("Chapters", novel.releasedChapterCount, true)
            .addField("Epub", novel.chapters.length, true)
            .addBlankField(true)
            .addField("Name", novel.alias, true)
        if (novel.author || novel.authorEn)
            emb.addField("Author",
                [novel.authorEn, novel.author].filter(a => a && a.length).join(" | "), true)

        /*  if (novel.source_name)
             emb.addField("Source", novel.source_name, true) */
        if (novel.source_url)
            emb.addBlankField()
                .addField("Source", novel.source_url)

        await message.channel.send(emb).then(msg => msg.Expire(message, params.includes("keep")));

        if (params.includes('script')) {
            const codeStr = `!((id) => { \/\/ ${novel.name}\n` +
                `const token = document.cookie.split(";").map(c => c.trim()).find(c => c.startsWith("_bc_novel_token=")).slice(16, document.cookie.length)\n` +
                `const url = "/api/user/libraries"\n` +
                `const xhttp = new XMLHttpRequest();\n` +

                `xhttp.open("POST", url, true);\n` +
                `xhttp.setRequestHeader("Content-type", "application/json");\n` +
                `xhttp.setRequestHeader("token", token);\n` +

                `var d = JSON.stringify({\n` +
                `\tbookId: id\n` +
                `})\n` +
                `xhttp.send(d);\n` +
                `})('${novel.babelId}');\n`;

            await message.channel.send(codeStr, { code: 'javascript' }).then(msg => msg.Expire(message, params.includes("keep")));
        }

        //await nov.fetchJson(page)
    }
};