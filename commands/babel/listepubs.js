const { isAdmin } = require('../../funcs/commandTools')
const { Attachment } = require('discord.js')
const { Novel, Chapter, Setting, Sequelize } = require("../../models");
const { numerics, api } = global.config
const fs = require('fs');
const setting_key = 'epub_channel'

module.exports = {
    name: ['listepubs', 'listepub'],
    description: 'Lists novels that have chapters to epub',
    args: "[genre]",
    async execute(message, args, params) {
        const epub_channel = await Setting.findOne({ where: { key: setting_key, server: message.guild.id } })
        if (!isAdmin(message, false) && !(epub_channel && epub_channel.value === message.channel.id))
            return true

        let queryStr = {
            where: {
                chapterContent: {
                    [Sequelize.Op.not]: null
                }
            },
            group: ['novel.id'],
            attributes: [[Sequelize.fn('COUNT', 'id'), 'chapterCount']],
            include: [{ model: Novel, as: 'novel', attributes: ['name', 'canonicalName'] }]
        }
        await message.channel.startTyping()

        Chapter.findAll(queryStr).then(chapters => {
            let novels = chapters.map(chapter => {
                return {
                    count: parseInt(chapter.dataValues.chapterCount),
                    name: chapter.novel.name,
                    canonicalName: chapter.novel.canonicalName,
                    url: api.novel_home.replace("<book>", chapter.novel.canonicalName)
                }
            }).filter(c => c.count > 100).sort((a, b) => b.count - a.count)

            let descriptionStr = `Available epubs (${novels.length})\n\n` +
                `!babelepub <name> [start / start - stop]\n\n` +
                `usage:\n` +
                `!babelepub martial god asura\n` +
                `!babelepub against-the-gods 1500\n` +
                `!babelepub nine star hegemon body arts 100-200`

            let toFile = [
                "<html><header>",
                `<title>Babelnovel epubs (${novels.length})</title>`,
                "<body>",
                `<h3>Babelnovel epubs (${novels.length})<h3>`,
                "<ol>",
            ];
            for (var i in novels) {
                const novel = novels[i]
                toFile.push(`<li><a href='${novel.url}'>${novel.name} - ${novel.count}</a>` +
                    `- !babelepub ${novel.canonicalName}</li>`)
            }

            toFile.push("</ol>", "</body>", "</html>")

            const fName = `babelepub_${novels.length}.html`
            const fPath = `static/${fName}`
            fs.writeFileSync(fPath, toFile.join("\r\n"), err => console.log(err))

            message.channel.send(
                descriptionStr, {
                code: true,
                file: new Attachment(fPath, fName)
            }).then(msg => msg.Expire(message, params.includes("keep")))
        }).catch((err) => {
            message.channel.stopTyping(true)
            console.log(err.message)
            throw err
        })
    },
};