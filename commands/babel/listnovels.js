const { RichEmbed } = require('discord.js')
const { Novel, Chapter, Sequelize } = require("../../models");
const { numerics } = global.config
const fs = require('fs');

module.exports = {
    name: ['listnovels', 'listnovel'],
    description: 'Lists novels',
    args: "[genre/all]",
    async execute(message, args, params) {
        let weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        await message.channel.startTyping()
        let queryStr = {
            where: {
                isPay: {
                    [Sequelize.Op.not]: true
                },
                releasedChapterCount: {
                    [Sequelize.Op.gt]: 0
                },
                updatedAt: {
                    [Sequelize.Op.gte]: weekAgo,
                }
            },
            order: [["releasedChapterCount", "desc"], ["canonicalName", "asc"]],
        }

        let novelStr = args.length ? args.join(' ').trim() : ""
        if (novelStr.length) {
            if (novelStr.toLowerCase() === "all")
                delete queryStr.where.isPay
            else {
                queryStr.where['$genre$'] = { [Sequelize.Op.iLike]: `%${novelStr}%` }
                novelStr = `free_${novelStr}`
            }

        }
        else novelStr = "free"


        const epub_count = await Chapter.findAll({
            where: {
                chapterContent: {
                    [Sequelize.Op.not]: null
                }
            },
            group: ['novel.id'],
            attributes: [[Sequelize.fn('COUNT', 'id'), 'count']],
            include: ['novel']
        }).map(c => { return { novel_id: c.novel.id, count: c.dataValues.count } })

        await Novel.findAll(queryStr).then(novels => {
            let toFile = [
                "<html><header><style>",
                "body { margin: 0.5em }",
                "li { margin-bottom: 0.5em }",
                "button { margin-left: 0.5em }",
                "red { color: red }",
                "yellow { color: darkorange }",
                "span { font-size: 80% }",
                "</style>",
                `<title>Babelnovel ${novelStr} novels (${novels.length})</title>`,
                "</header><body>",
                `<h3>Babelnovel ${novelStr} novels (${novels.length})<h3>`,
                "<ol>",
            ];
            const announceEmbed = new RichEmbed()
                .setColor('#0099ff')
                .setDescription(`${numerics.latest_chapter_limit} ${novelStr} novels with most chapters`)
                .addBlankField()

            for (var i = 0; i < novels.length; ++i) {
                const novel = novels[i];
                novel.epubs = epub_count.find(n => n.novel_id === novel.id) || { count: 0 }
                let scrape = novel.releasedChapterCount - novel.epubs.count > 200
                let authLine = [
                    novel.abbr,
                    novel.isPay ? 'premium' : null,
                    novel.isRemoved ? 'removed' : null,
                    novel.isHiatus ? 'hiatus' : null,
                    novel.isCompleted ? 'completed' : null
                ].filter(l => l).join(" | ")



                let epubline = novel.epubs.count ? `epub: ${novel.epubs.count}` : '';
                if (novel.epubs.count && novel.releasedChapterCount - novel.epubs.count > 20)
                    epubline = `<yellow>${epubline}</yellow>`

                let scrapeMsg = scrape ? '<red>+++</red>' : ''
                const header = `${novel.name} - ${novel.releasedChapterCount}`
                const url = novel.Url()
                //toFile.push(`${i + 1}. [${header}](${url})`)
                toFile.push(`<li><a href='${url}'>${header}</a> ${scrapeMsg}` +
                    `<div>${epubline}</div>` +
                    `<div>${authLine}</div>` +
                    `</li>`)

                if (i < numerics.latest_chapter_limit)
                    announceEmbed.addField(header, url)
            }

            if (!novels.length)
                announceEmbed.addField(`No free novels found`, `Category: ${novelStr}`)
            else if (novels.length > numerics.latest_chapter_limit) {
                toFile.push("</ol>", "</body>", "</html>")
                const fPath = `static/babelnovel_${novelStr}_${novels.length}.html`
                fs.writeFileSync(fPath, toFile.join("\r\n"), err => console.log(err))
                announceEmbed.attachFile(fPath)
            }

            message.channel.send(announceEmbed).then(msg =>
                msg.Expire(message, params.includes("keep"))
            )
        }).catch(err => {
            message.Expire()
            console.log(err.message)
            throw err
        })
    },
};