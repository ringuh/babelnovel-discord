
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
    name: ['updateall'],
    description: 'Updates all excisting epubs',
    args: null,
    hidden: true,
    async execute(message, args, parameters) {
        if (!isBypass(message, false)) return false

        let params = await handleParameters(parameters)

        let queryStr = {
            where: {
                chapterContent: {
                    [Sequelize.Op.not]: null
                }
            },
            group: ['novel.id'],
            attributes: [[Sequelize.fn('COUNT', 'id'), 'count']],
            include: ['novel']
        }


        const novel_ids = await Chapter.findAll(queryStr).then(chapters =>
            chapters.filter(c =>
                c.dataValues.count > params.limit 
                && c.dataValues.count < params.cap_limit
                && (!params.greed || c.novel.token == "greed")
            ).map(c => c.novel.id)
        )

        const novels = await Novel.findAll({
            where: {
                id: {
                    [Sequelize.Op.in]: novel_ids
                }
            },
            include: ['trackers'],
            order: ['canonicalName']
        });

        if (!novels.length)
            return await message.channel.send(
                `No novels with epubs found`, { code: true }
            ).then(msg => msg.Expire(message))

        //novel.chapters.forEach(chap => chap.update({chapterContent: chap.chapterContent.replace(/<br\/>/gi, "\n")}))
        let r = false

        let [counter, max_counter] = [1, 5]
        const livemsg = new LiveMessage(message, novels, params)
        await livemsg.init()
        try {
            if (isBypass(message)) {
                while (!r && counter <= max_counter) {
                    await livemsg.init(counter, max_counter)
                    r = await scrapeNovel(novels, params, livemsg)
                    counter++;
                    if (r.code === 5) break
                    if (r.code === 666) {
                        return await livemsg.setDescription(
                            `Your IP should be blocked. Restart server`, null, 1
                        )
                    }
                    if (r.code && counter <= max_counter) {
                        await livemsg.setDescription(`Trying again in ${numerics.retry_seconds / 1000} seconds`, null, 1)
                        await new Promise(resolve => setTimeout(resolve, numerics.retry_seconds))
                    }
                }
            }

            return await livemsg.setDescription("Parse finished.", true, 1)

        } catch (err) {
            console.log(err)
            return await livemsg.setDescription(err.message, true, 1)
        }
    },





};

const handleParameters = async (parameters) => {
    let params = {
        min: 0,
        max: 10000,
        limit: numerics.update_chapter_limit,
        cap_limit: 10000,
        check: parameters.includes("force") || parameters.includes("check"),
        force: parameters.includes("force"),
        token: null,
        cron: false,
        reqGroupID: 'updateChaptersDiscord'
    }

    let limit = parameters.find(p => p.startsWith("limit="))
    params.limit = limit ? parseInt(limit.split("=")[1]) : params.limit
    if(params.limit < numerics.update_chapter_limit)
        params.cap_limit = numerics.update_chapter_limit

    let token = parameters.find(p => p.startsWith("token="))
    if (!token && parameters.includes('token')) params.token = "rinku"
    else if (token) params.token = token.slice(6)
    if (parameters.includes("greed")) {
        params.greed = true
        params.token = "greed"
    }

    if (params.token && params.token.length < 40)
        params.token = await Setting.findOne({
            where: {
                key: `babel_token_${params.token}`
            }
        }).then(setting => setting ? setting.value : null)

    return params
}


