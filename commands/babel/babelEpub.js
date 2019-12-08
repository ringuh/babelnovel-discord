
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

        let [counter, max_counter] = [0, 3]
        const livemsg = new LiveMessage(message, novel, params)
        await livemsg.init()
        try {
            if (isBypass(message) && params.check) {
                while (!r && counter <= max_counter) {
                    counter++;
                    await livemsg.init(counter, max_counter)
                    r = await scrapeNovel([novel], params, livemsg)
                    
                    if ([5, 7, 8].includes(r.code)) break
                    if (r.code === 666) {
                        return await livemsg.setDescription(
                            `Your IP should be blocked. Restart server`, null, 1
                        )
                    }
                    
                    if (r.code && counter <= max_counter && counter < max_counter) {
                        await livemsg.setDescription(
                            `Trying again in ${numerics.retry_seconds / 1000} seconds`, null, 1
                        )
                        r = null
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
                return await livemsg.setDescription(
                    "No chapters with content found for this novel\ncheck !listepubs", true, 1
                )
            if (params.tojson) tojson.execute(message, [novelStr])
            if (params.noepub) return await livemsg.setDescription("Parse finished. Skipping epub", true, 2)
            await livemsg.setDescription("Generating epub", null, 2)
            let epub = await generateEpub(novel, chapters, params)
            
            return await livemsg.attach(epub, chapters)
        } catch (err) {
            console.log(err)
            return await livemsg.setDescription(err.message, true)
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
            parameters.includes('reverse') ||
            parameters.includes('tojson'),
        epub: parameters.includes('epub') || parameters.includes("force"),
        noepub: parameters.includes('noepub') || parameters.includes('tojson'),
        tojson: parameters.includes('tojson'),
        keep: parameters.includes('keep'),
        //ignore: parameters.includes('ignore'),
        reverse: parameters.includes('reverse'),
        hop: parameters.includes('hop'),
        ios: parameters.includes('ios'),
        token: null,
        reqGroupID: Date.now().toString()
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


