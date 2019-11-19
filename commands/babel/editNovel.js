
const { isBypass, usageMessage } = require('../../funcs/commandTools')
const { StripMentions } = require('../../funcs/mentions.js')
const { Novel, Sequelize } = require("../../models")
const { novelWhere } = require("../../funcs/babelNovel/queryStrings")
const LiveMessage = require('../../funcs/liveMessage')
const { numerics } = global.config;



module.exports = {
    name: ['editnovel', 'en'],
    description: 'Edits novel',
    args: "<novel> | <field>=<value>",
    hidden: true,
    async execute(message, args, params) {
        if (!isBypass(message)) return false
        if (args.length < 1) return usageMessage(message, this)

        let [novelStr, userMentions, channelMentions, roleMentions] = StripMentions(message.guild, args)

        if (!novelStr.length)
            return message.channel.send(`Novel name missing`,
                { code: true }).then(msg => msg.Expire(message))

        params = handleParams(params)

        let novel = null
        if (novelStr !== 'create') {
            novel = await Novel.findOne({
                where: novelWhere(novelStr)
            })
            if (!novel) return message.channel.send(`Novel by name or alias '${novelStr}' not found`,
                { code: true }).then(msg => msg.Expire(message));
            if (params.paramsOkay)
                novel.update(params).then(async n => {
                    await message.channel.send(`Updated novel '${novel.name}'`, { code: true })
                        .then(msg => msg.Expire(message, params.keep))
                    await message.channel.send(JSON.stringify(n.toJson(true), null, '\t'),
                        { code: "json" }).then(msg => msg.Expire(message, params.keep))
                }).catch(err =>
                    message.channel.send(`Error updating novel: '${err.message}'`,
                        { code: true }).then(msg => msg.Expire(message))
                )
            else await message.channel.send(JSON.stringify(novel.toJson(true), null, '\t'),
                { code: "json" }).then(msg => msg.Expire(message, params.keep))
        }
        else {
            await Novel.create(params).then(novel => {
                if (!novel.name) novel.update({ name: novel.canonicalName })
                message.channel.send(`Created novel '${novel.canonicalName}'`,
                    { code: true }).then(msg => msg.Expire(message, params.keep))
            }).catch(err => {
                message.channel.send(`Error creating novel: '${err.message}'`,
                    { code: true }).then(msg => msg.Expire(message, params.keep))
            })
        }





    }
};

const handleParams = (params) => {
    if (!params.length) return []
    const accepted = [
        "canonicalName",
        "babelId",
        "abbr",
        "cover",
        "isPay",
        "token",
        "isCompleted",
        "isHiatus",
        "isRemoved"
    ]
    const shorts = ["removed", "completed", "pay", "hiatus"]
    let r = {}
    if (params.includes("keep")) r.keep = true
    if (params[0].startsWith("name")) {
        params[0] = params[0].replace(/^name=/i, "").replace(/^name/i, "")
        r.name = params.join(" ").trim()
        r.paramsOkay = true
    } else {
        shorts.forEach(s => {
            if (params.includes(s)) {
                r[`is${capitalize(s)}`] = true
            }
        })


        params.forEach(p => {
            let [attr, value] = p.split("=")
            if (!accepted.includes(attr)) return false

            r[attr] = value
            r.paramsOkay = true
        })
    }
    if (Object.keys(r).length)
        r.paramsOkay = true

    return r;
}

const capitalize = (s) => {
    if (typeof s !== 'string') return ''
    return s.charAt(0).toUpperCase() + s.slice(1)
}