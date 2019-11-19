
const { isBypass, usageMessage } = require('../../funcs/commandTools')
const { StripMentions } = require('../../funcs/mentions.js')
const { Novel, Chapter, Sequelize } = require("../../models")
const { novelWhere } = require("../../funcs/babelNovel/queryStrings")
const { numerics } = global.config
const Discord = require('discord.js')
const fs = require('fs')
const zlib = require('zlib');

module.exports = {
    name: ['tojson'],
    description: 'Turns chapter data into json (private)',
    args: "<novel>",
    hidden: true,
    async execute(message, args, parameters) {
        if (!isBypass(message)) return false

        if (args.length < 1) return usageMessage(message, this)

        let [novelStr, userMentions, channelMentions, roleMentions] = StripMentions(message.guild, args)

        if (!novelStr.length)
            return message.channel.send(`Novel name missing`, { code: true });

        const novel = await Novel.findOne({
            where: novelWhere(novelStr),
            include: [// ['chapters']
                { model: Chapter, as: 'chapters', order: [['Chapter.index', 'ASC']] }
            ]
        })
        if (!novel)
            return message.channel.send(`Novel by name or alias '${novelStr}' not found`, { code: true });

        await message.channel.startTyping()

        const chapters = novel.chapters.filter(chapter => chapter.chapterContent).map(chapter => {
            const c = chapter.dataValues
            delete c.id
            delete c.novel_id
            delete c.content
            delete c.createdAt
            delete c.updatedAt
            return c
        })

        const fname = `${novel.canonicalName}.json.gz`
        const zipPath = `static/${fname}`
        let buf = Buffer.from(JSON.stringify({
            chapters: chapters,
            novel: novel.babelId
        }))

        zlib.gzip(buf, (err, zip) => {
            message.channel.stopTyping(true)
            if (err) return console.log(err)
            fs.writeFileSync(zipPath, zip, err => console.log(err))

            message.channel.send(`!fromjson`, {
                file: new Discord.Attachment(zip, fname)
            }).then(msg => msg.Expire(message))
                .catch(err =>
                    message.channel.send(err.message, { code: true })
                        .then(msg => msg.Expire(message))
                )
        })
    },





};






