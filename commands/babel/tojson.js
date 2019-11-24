
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
    async execute(message, args, params=[]) {
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
            delete c.summary
            delete c.content
            delete c.createdAt
            delete c.updatedAt
            return c
        }).sort((a, b) => a.index - b.index)



        Zip(novel, chapters).then(async files => {
            for (var i in files) {
                const file = files[i]
                await message.channel.send(`fromjson`, {
                    file: new Discord.Attachment(file.path, file.name)
                }).then(msg => msg.Expire(message, params.includes("keep")))
                    .catch(err =>
                        message.channel.send(err.message, { code: true })
                            .then(msg => msg.Expire(message))
                    ).then(() => fs.existsSync(file.path) ? fs.unlinkSync(file.path) : null)
            }
        }).catch(err =>
            message.channel.send(err.message, { code: true }).then(msg => msg.Expire(message))
        ).then(() => message.channel.stopTyping(true))
    },





};


const Zip = async (novel, chapters) => {
    const fname = `${novel.canonicalName}_${chapters[0].index}-${chapters[chapters.length - 1].index}.json.gz`
    const path = `static/${fname}`
    if (fs.existsSync(path)) fs.unlinkSync(path)

    const buffer = Buffer.from(JSON.stringify({
        chapters: chapters,
        novel: novel.babelId
    }))

    return await new Promise((resolve, reject) => {
        zlib.gzip(buffer, async (err, zip) => {
            if (err) return reject(err)
            fs.writeFileSync(path, zip, err => reject(err))
            const stats = fs.statSync(path)
            const fileSizeInMegabytes = stats["size"] / 1000000.0

            if (fileSizeInMegabytes > 8) {
                const splitTo = Math.ceil(fileSizeInMegabytes / 8)
                const chapterCount = Math.floor(chapters.length / splitTo)
                let paths = []
                if (fs.existsSync(path)) fs.unlinkSync(path)

                for (var i = 0; i < splitTo; ++i) {
                    const chaps = chapters.splice(0, (i + 1 < splitTo) ?
                        chapterCount : chapters.length)
                    const p = await Zip(novel, chaps)
                    paths.push(p)
                }
                resolve(paths.reduce((acc, val) => acc.concat(val), []))

            } else resolve([{ path: path, name: fname }])
        })
    })
}




