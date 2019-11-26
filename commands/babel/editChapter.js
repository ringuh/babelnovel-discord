
const { isBypass, usageMessage } = require('../../funcs/commandTools')
const { StripMentions } = require('../../funcs/mentions.js')
const { Novel, Chapter, Sequelize } = require("../../models")
const { novelWhere, chapterWhere } = require("../../funcs/babelNovel/queryStrings")
const LiveMessage = require('../../funcs/liveMessage')
const { numerics } = global.config;



module.exports = {
    name: ['editchapter', 'ec'],
    description: 'Edits chapter',
    args: "<novel> | <field>=<value>",
    hidden: true,
    async execute(message, args, params) {
        if (!isBypass(message)) return false
        if (args.length < 1) return usageMessage(message, this)

        let [novelStr, userMentions, channelMentions, roleMentions] = StripMentions(message.guild, args)

        if (!novelStr.length)
            return message.channel.send(`Novel name missing`,
                { code: true }).then(msg => msg.Expire(message))

        const novel = await Novel.findOne({
            where: novelWhere(novelStr)
        })

        params = handleParams(params)
        let chapter = null
        if (novel) {
            const chapters = await Chapter.findAll({
                where: {
                    novel_id: novel.id,
                    chapterContent: null,
                },
                order: ["index"],
                limit: 15
            })
            const arr = chapters.map(c => `${c.index} - ${c.canonicalName} - ${c.babelId} - ${c.num}`)

            if (params.chapter) {
                let query = chapterWhere(params.chapter);
                query.novel_id = novel.id

                chapter = await Chapter.findOne({
                    where: query
                })

                if (!chapter) await message.channel.send(
                    `Chapter '${params.chapter}' for ${novel.canonicalName} not found`,
                    { code: true }).then(msg => msg.Expire(message))
            }
            if (!chapter) return await message.channel.send(
                `${novel.canonicalName} chapters without content\n\n${arr.join("\n")}`,
                { code: true }).then(msg => msg.Expire(message, params.keep))
        }


        if (!chapter)
            chapter = await Chapter.findOne({
                where: novelWhere(novelStr)
            })

        if (!chapter) return message.channel.send(`Chapter '${novelStr}' not found'`,
            { code: true }).then(msg => msg.Expire(message, params.keep))

        if (params.force) {
            chapter = await chapter.update(params).catch(err =>
                message.channel.send(`Error: ${err.message}`,
                    { code: true }).then(msg => msg.Expire(message)))
        }


        let c = { ...chapter.dataValues }
        c.chapterContent = c.chapterContent ?
            `${c.chapterContent.substr(0, 50)} (total: ${c.chapterContent.length})` : null
        c.content = c.content ?
            `${c.content.substr(0, 50)} (total: ${c.content.length})` : null

        return await message.channel.send(
            JSON.stringify(c, null, "\t"),
            { code: "json" }).then(msg => msg.Expire(message, params.keep))
    }
};

const handleParams = (params) => {
    if (!params.length) return []
    const accepted = [
        "chapter",
        "canonicalName",
        "babelId",
        "chapterContent",
        "num",
        "index",
        "isAnnounced"
    ]

    let r = {}
    if (params.includes("keep")) r.keep = true
    if (params.includes("empty")) r.chapterContent = null
    if (params.includes("force")) r.force = true
    if (params.includes("fix")) {
        r.chapterContent = "chapter content is missing"
        let chap = params.find(p => p.startsWith("chapter=c"))
        if (chap) chap.replace("chapter=c", "")
    }
    params.forEach(p => {
        let [attr, value] = p.split("=")
        if (!accepted.includes(attr)) return false

        r[attr] = value
    })

    if (Object.keys(r).length)
        r.paramsOkay = true

    return r;
}

const capitalize = (s) => {
    if (typeof s !== 'string') return ''
    return s.charAt(0).toUpperCase() + s.slice(1)
}