const { RichEmbed } = require('discord.js')
const { Novel, Chapter, Sequelize } = require("../../models");
const { numerics } = global.config
const fs = require('fs');

module.exports = {
    name: ['listnovels'],
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
                updatedAt: {
                    [Sequelize.Op.gte]: weekAgo,
                }
            },
            order: [["releasedChapterCount", "desc"], ["canonicalName", "asc"]],
        }

        let novelStr = args.length ? args.join(' ').trim() : ""
        if (novelStr.length) {
            if (novelStr.toLowerCase() === "all")
                delete queryStr.where
            else {
                queryStr.where['$genre$'] = { [Sequelize.Op.iLike]: `%${novelStr}%` }
                novelStr = `free_${novelStr}`
            }

        }
        else novelStr = "free"



        await Novel.findAll(queryStr).then(novels => {
            let toFile = [
                "<html><header>",
                `<title>Babelnovel ${novelStr} novels (${novels.length})</title>`,
                "<body>",
                `<h3>Babelnovel ${novelStr} novels (${novels.length})<h3>`,
                "<ol>",
            ];
            const announceEmbed = new RichEmbed()
                .setColor('#0099ff')
                .setDescription(`${numerics.latest_chapter_limit} ${novelStr} novels with most chapters`)
                .addBlankField()

            for (var i = 0; i < novels.length; ++i) {
                const novel = novels[i];
                novel.chapters = novel.chapters || []
                let parsed = ''// novel.chapters.length
                //parsed = parsed ? `(epub: ${parsed} chapters)` : ''
                const header = `${novel.name} - ${novel.releasedChapterCount} ${parsed}`
                const url = novel.Url()
                //toFile.push(`${i + 1}. [${header}](${url})`)
                toFile.push(`<li><a href='${url}'>${header}</a></li>`)
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