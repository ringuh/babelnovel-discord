const { RichEmbed } = require('discord.js')
const { Novel, Chapter, Sequelize } = require("../../models");
const { numerics } = global.config
const fs = require('fs');

module.exports = {
    name: ['listepubs', 'babelepubs', 'bepubs'],
    description: 'Lists novels that have chapters to epub',
    args: "[genre]",
    execute(message, args) {
        let queryStr = {
            where: {
                isPay: {
                    [Sequelize.Op.not]: true
                }
            },
            order: [/* ["releasedChapterCount", "desc"], */ ["canonicalName", "asc"]],
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
            //limit: 20
        }

        let novelStr = args.length ? args.join(' ').trim() : ""
        if (novelStr.length) {
            queryStr.where['$genre$'] = { [Sequelize.Op.iLike]: `%${novelStr}%` }
        }

        let descriptionStr = `Available epubs. More on the attachment.\n\n`+
        `!babelepub <name> [start / start - stop]\n`+
        `usage:\n`+
        `!babelepub martial god asura\n`+
        `!babelepub against-the-gods 1500\n`+
        `!babelepub nine star hegemon body arts 100-200`

        Novel.findAll(queryStr).then(novels => {
            let toFile = [
                "<html><header>",
                `<title>Babelnovel ${novelStr} epubs (${novels.length})</title>`,
                "<body>",
                `<h3>Babelnovel ${novelStr} epubs (${novels.length})<h3>`,
                "<ol>",
            ];
            const announceEmbed = new RichEmbed()
                .setColor('#0099ff')
                .setDescription(descriptionStr)
                .addBlankField()

            for (var i = 0; i < novels.length; ++i) {
                const novel = novels[i];
                novel.chapters = novel.chapters || []
                const header = `${novel.name} - ${novel.chapters.length}`
                const url = novel.Url()
                toFile.push(`<li><a href='${url}'>${header}</a> - !babelepub ${novel.canonicalName}</li>`)
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

            message.channel.send(announceEmbed);
        }).catch((err) => {
            console.log(err.message)
            throw err
        })
    },
};