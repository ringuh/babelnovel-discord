const { isAdmin } = require('../../funcs/commandTools')
const { Attachment } = require('discord.js')
const { Novel, Chapter, Setting, Sequelize } = require("../../models");
const { numerics } = global.config
const fs = require('fs');
const setting_key = 'epub_channel'

module.exports = {
    name: ['listepubs', 'babelepubs', 'bepubs'],
    description: 'Lists novels that have chapters to epub',
    args: "[genre]",
    async execute(message, args, params) {
        const epub_channel = await Setting.findOne({ where: { key: setting_key, server: message.guild.id } })
        if (!isAdmin(message, false) && !(epub_channel && epub_channel.value === message.channel.id))
            return true

        let queryStr = {
            where: {
                isPay: {
                    [Sequelize.Op.not]: true
                }
            },
            order: [/* ["releasedChapterCount", "desc"], */["canonicalName", "asc"]],
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


        await message.channel.startTyping()
        Novel.findAll(queryStr).then(novels => {

            let descriptionStr = `Available epubs (${novels.length})\n\n` +
                `!babelepub <name> [start / start - stop]\n\n` +
                `usage:\n` +
                `!babelepub martial god asura\n` +
                `!babelepub against-the-gods 1500\n` +
                `!babelepub nine star hegemon body arts 100-200`

            let toFile = [
                "<html><header>",
                `<title>Babelnovel ${novelStr} epubs (${novels.length})</title>`,
                "<body>",
                `<h3>Babelnovel ${novelStr} epubs (${novels.length})<h3>`,
                "<ol>",
            ];

            for (var i = 0; i < novels.length; ++i) {
                const novel = novels[i];
                novel.chapters = novel.chapters || []
                const header = `${novel.name} - ${novel.chapters.length}`
                const url = novel.Url()
                toFile.push(`<li><a href='${url}'>${header}</a> - !babelepub ${novel.canonicalName}</li>`)
                /* if (i < numerics.latest_chapter_limit)
                    announceEmbed.addField(header, url) */
            }

            toFile.push("</ol>", "</body>", "</html>")
            if (novelStr) novelStr = `${novelStr}_`
            const fName = `babelnovel_${novelStr}${novels.length}.html`
            const fPath = `static/${fName}`
            fs.writeFileSync(fPath, toFile.join("\r\n"), err => console.log(err))

            message.channel.send(
                descriptionStr, {
                code: true,
                file: new Attachment(fPath, fName)
            }
            ).then(msg => {
                message.channel.stopTyping(true)
                if (!params.includes("keep"))
                    msg.delete(numerics.epub_lifespan_seconds * 1000).then(() => message.delete())
            })

        }).catch((err) => {
            message.channel.stopTyping(true)
            console.log(err.message)
            throw err
        })
    },
};