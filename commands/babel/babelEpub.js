
const { isAdmin, isBypass, usageMessage } = require('../../funcs/commandTools')
const generateEpub = require('../../funcs/generateEpub')
const { StripMentions } = require('../../funcs/mentions.js')
const { Novel, Chapter, Setting, Sequelize } = require("../../models")
const { novelWhere } = require("../../funcs/babelNovel/queryStrings")
const scrapeNovel = require("../../funcs/babelNovel/scrapeNovel")
const LiveMessage = require('../../funcs/liveMessage')
const { numerics } = global.config;
const tojson = require('./tojson')
const setting_key = 'epub_channel'

module.exports = {
    name: ['babelepub', 'be', 'epub'],
    description: 'Generates epubs from scraped novels',
    args: "<novel>",
    //hidden: true,
    async execute(message, args, parameters) {
        const epub_channel = await Setting.findOne({ where: { key: setting_key, server: message.guild.id } })
        if (!isAdmin(message, false) && !(epub_channel && epub_channel.value === message.channel.id))
            return true

        if (args.length < 1) return usageMessage(message, this)

        let [novelStr, userMentions, channelMentions, roleMentions] = StripMentions(message.guild, args)

        if (!novelStr.length)
            return await message.channel.send(
                `Novel name missing`, { code: true }
            ).then(msg => msg.Expire(message))

        let params = await handleParameters(parameters, novelStr, message)
        novelStr = params.novelStr

        const novel = await Novel.findOne({
            where: novelWhere(novelStr),
            include: ['chapters', 'trackers']
        })
        if (!novel)
            return await message.channel.send(
                `Novel by name or alias '${novelStr}' not found`, { code: true }
            ).then(msg => msg.Expire(message))



        //novel.chapters.forEach(chap => chap.update({chapterContent: chap.chapterContent.replace(/<br\/>/gi, "\n")}))
        let r = false

        let [counter, max_counter] = [1, 2]
        const livemsg = new LiveMessage(message, novel, params)
        await livemsg.init()
        try {
            if (isBypass(message) && params.check) {
                while (!r && counter <= max_counter) {
                    await livemsg.init(counter, max_counter)
                    r = await scrapeNovel(null, [novel], params, livemsg)
                    counter++;

                    if (r.code === 5) break

                    if (r.code && counter <= max_counter) {
                        await livemsg.description(`Trying again in ${numerics.retry_seconds / 1000} seconds`)
                        await new Promise(resolve => setTimeout(resolve, numerics.retry_seconds))
                    }
                }
            }

            const chapters = await Chapter.findAll({
                where: {
                    novel_id: novel.id,
                    index: {
                        [Sequelize.Op.between]: [params.min, params.max]
                    },
                    chapterContent: {
                        [Sequelize.Op.not]: null
                    }
                },
                order: [['index', 'asc']]
            })
            if (!chapters.length)
                return await livemsg.description(
                    "No chapters with content found for this novel\ncheck !listepubs", true
                )
            if (params.tojson) tojson.execute(message, [novelStr])
            if (params.noepub) return await livemsg.description("Parse finished. Skipping epub", true)
            await livemsg.description("Generating epub")
            if (global.config.generatingEpub)
                return await livemsg.description("Epub generator in progress. Try again later", true)

            let epub = await generateEpub(novel, chapters, params)

            return await livemsg.attach(epub, chapters)
        } catch (err) {
            console.log(err)
            return await livemsg.description(err.message, true)
        }
    },





};

const handleParameters = async (parameters, novelStr, message) => {
    let params = {
        min: 0,
        max: 10000,
        force: parameters.includes("force"),
        check: parameters.includes('check') ||
            parameters.includes("noepub") ||
            parameters.includes("force") ||
            parameters.includes('tojson'),
        epub: parameters.includes('epub') || parameters.includes("force"),
        noepub: parameters.includes('noepub') || parameters.includes('tojson'),
        tojson: parameters.includes('tojson'),
        keep: parameters.includes('keep'),
        token: null,
    }

    let token = parameters.find(p => p.startsWith("token="))
    if (!token && parameters.includes('token')) params.token = "rinku"
    else if (token) params.token = token.slice(6)

    if (params.token && params.token.length < 40) await Setting.findOne({
        where: {
            key: `babel_token_${params.token}`
        }
    }).then(setting => setting ? params.token = setting.value : null)

    const match = /((?<min>\d{1,})\s*-\s*(?<max>\d{1,}))|\s(?<start>(\d{1,}))\s*$/;
    const range = novelStr.match(match)
    if (range) {
        novelStr = novelStr.slice(0, range.index).trim()
        params.min = parseInt(range.groups.start) || parseInt(range.groups.min)
        if (range.groups.max && parseInt(range.groups.max) >= params.min)
            params.max = parseInt(range.groups.max)
    }

    params.novelStr = novelStr


    return params
}


