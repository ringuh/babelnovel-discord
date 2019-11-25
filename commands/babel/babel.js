
const { usageMessage } = require('../../funcs/commandTools')
const { Novel, Chapter, Sequelize } = require("../../models")
const { novelWhere } = require("../../funcs/babelNovel/queryStrings")
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
            where: novelWhere(novelStr),
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

            return await message.channel.send(codeStr, { code: 'javascript' }).then(msg => msg.Expire(message, params.includes("keep")));
        }

        else if (params.includes('be') || params.includes('scrape')) {
            const prefixes = [
                ["?", "noepub", false],
                [":", "reverse noepub", false],
                ["", "noepub", true]
            ]
            prefixes.forEach(async prefix => {
                const line = `${prefix[0]}be ${novel.canonicalName} | check ${prefix[1]}`
                await message.channel.send(line, { code: prefix[2] });
            })


            return await message.channel.send(
                `${novel.name} (${novel.chapters.length} / ${novel.releasedChapterCount})`,
                { code: true });

        }

        //await message.channel.startTyping()
        let authLine = [
            novel.abbr,
            novel.isPay ? 'Premium $' : null,
            novel.isRemoved ? 'Hidden' : null,
            novel.isHiatus ? 'Hiatus' : null,
            novel.isCompleted ? 'Completed' : null
        ].filter(l => l).join(" | ")

        const [coverName, coverAttachment] = novel.DiscordCover()
        const emb = new RichEmbed()
            .setColor('#0099ff')
            .setTitle(novel.name)
            .setAuthor(authLine, null, null)
            .setURL(api.novel_home.replace("<book>", novel.canonicalName))
            .attachFile(coverAttachment)
            .setThumbnail(coverName)
            .setDescription(novel.synopsis ? novel.synopsis.substr(0, 1000) : 'description missing')
            .setFooter(novel.genre, coverName)
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
        emb.addBlankField()

        /*  if (novel.source_name)
             emb.addField("Source", novel.source_name, true) */
        if (novel.source_url)
            emb.addBlankField()
                .addField("Source", novel.source_url)

        await message.channel.send(emb).then(msg => msg.Expire(message, params.includes("keep")));



        //await nov.fetchJson(page)
    }
};