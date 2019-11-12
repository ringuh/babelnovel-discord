
const { isAdmin, isBypass, usageMessage } = require('../../funcs/commandTools')
const generateEpub = require('../../funcs/generateEpub')
const { StripMentions } = require('../../funcs/mentions.js')
const { Novel, Chapter, Setting, Sequelize } = require("../../models")
const { scrapeNovel } = require("../../funcs/scrapeBabel")
const { numerics } = global.config;
const Discord = require('discord.js')
const tojson = require('./tojson')
const setting_key = 'epub_channel'
const RichEmbed = Discord.RichEmbed

module.exports = {
    name: ['babelepub', 'be'],
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
            return message.channel.send(`Novel name missing`, { code: true });

        let params = handleParameters(parameters, novelStr)
        novelStr = params.novelStr

        const novel = await Novel.findOne({
            where: Sequelize.or(
                Sequelize.where(
                    Sequelize.fn('lower', Sequelize.col('name')),
                    Sequelize.fn('lower', novelStr)
                ),
                Sequelize.where(
                    Sequelize.fn('lower', Sequelize.col('canonicalName')),
                    Sequelize.fn('lower', novelStr)
                )
            ),
            include: ['chapters']
        })
        if (!novel)
            return message.channel.send(`Novel by name or alias '${novelStr}' not found`, { code: true });



        //novel.chapters.forEach(chap => chap.update({chapterContent: chap.chapterContent.replace(/<br\/>/gi, "\n")}))
        let r = false

        let [counter, max_counter] = [1, 2]
        const livemsg = new LiveMessage(message, novel, params)
        await livemsg.init()
        try {
            if (isBypass(message) && params.check) {
                while (!r && counter <= max_counter) {
                    await livemsg.init(counter, max_counter)
                    r = await scrapeNovel(novel, livemsg, params)
                    counter++;
                    if (r === 'css_error')
                        return await livemsg.description("CSS file missing")

                    if (!r && counter <= max_counter) {
                        const fail_timer = 20
                        await livemsg.description(`Trying again in ${fail_timer} seconds`)
                        await new Promise(resolve => setTimeout(resolve, fail_timer * 1000))
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
                    global.config.babelepub ?
                        "No chapters with content found for this novel" :
                        "This novel hasn't been parsed by superuser", true)
            if (params.tojson) tojson.execute(message, [novelStr])
            if (params.noepub) return await livemsg.description("Parse finished. Skipping epub", true)
            await livemsg.description("Generating epub")
            if (global.config.generatingEpub)
                return await livemsg.description("Epub generator in progress. Try again later", true)

            //global.config.generatingEpub = true;
            let epub = await generateEpub(novel, chapters, params)
            global.config.generatingEpub = false;

            return await livemsg.attach(epub, chapters)
        } catch (err) {
            global.config.generatingEpub = false;
            return await livemsg.description(err.message, true)
        }
    },





};



class LiveMessage {
    constructor(message, novel, params) {
        this.message = message
        this.novel = novel
        this.emb = new RichEmbed()
        this.sent = null
        this.params = params
    }

    async init(counter = 1, max = 1) {

        this.emb.setColor('#0099ff')
            .setTitle(this.novel.name)
            .setURL(this.novel.Url())
            .setDescription(`Scraping chapters attempt ${counter} / ${max}`)
            .setTimestamp()
            .setFooter(this.novel.canonicalName, this.novel.cover)
        //.attachFile('./static/epub/ancient-dragon-spell_1-1194.epub')

        return await this.send()
    }

    async update() {
        this.emb.setTitle("updated")
        return await this.send()
    }

    async description(str, expire) {
        this.emb.setDescription(str)
        return await this.send(expire)
    }

    async setMax(val) {
        this.max = val
        this.emb.setDescription(`Found ${this.max} chapters`)

        return await this.send()
    }

    async progress(val) {
        this.min = val
        this.emb.setDescription(`Processing ${this.min} / ${this.max}`)

        return await this.send()
    }

    async send(expire) {
        if (this.sent)
            return await this.sent.edit(this.emb.setTimestamp())
                .then(msg => expire ? msg.delete(numerics.epub_lifespan_seconds * 1000) : null)
        else
            return await this.message.channel.send(
                this.emb.setTimestamp()).then(msg => {
                    this.sent = msg
                }).then(msg => expire ? msg.delete(numerics.epub_lifespan_seconds * 1000) : null)

        //.setDescription(`${numerics.latest_chapter_limit} latest chapters on https://babelnovel.com/latest-update`)
        //    .addBlankField()
    }

    async attach(files) {
        if (this.sent) {
            await this.sent.delete()
            this.sent = null
        }

        const Emb = () => {
            const emb = new RichEmbed()
                .setTitle(this.novel.name)
                .setThumbnail(this.novel.cover)
            return emb
        }

        await this.message.delete().catch(err => console.log("Deleting command", err.message))

        if (!files || !files.length) {
            let emb = Emb()
            emb.setDescription("something went wrong")
            await this.message.channel.send(emb)
        }

        else {
            if (typeof (files) === 'string')
                files = [files]
            else
                files = files.reduce((acc, val) => acc.concat(val), [])

            const match = /(?<start>\d*)-(?<stop>\d*)\.epub$/i
            files.sort((a, b) => {
                let matchA = parseInt(a.match(match).groups.start)
                let matchB = parseInt(b.match(match).groups.start)
                return a - b
            })
            console.log("epubs", files)

            for (var i in files) {
                const file = files[i]
                let filename = file.split("/")[file.length - 1]
                await this.message.channel.send(filename, {
                    file: new Discord.Attachment(file, filename)
                }).then(msg => {
                    if (!this.params.keep)
                        msg.delete(numerics.epub_lifespan_seconds * 1000)
                }).catch(err => {
                    this.message.channel.send(err.message, { code: true })
                        .then(msg => msg.delete(numerics.epub_lifespan_seconds * 1000))
                })
            }
        }
    }
}

const handleParameters = (parameters, novelStr) => {
    let params = {
        min: 0,
        max: 10000,
        force: parameters.includes("force"),
        check: parameters.includes('check') || parameters.includes("force") || parameters.includes('tojson'),
        epub: parameters.includes('epub') || parameters.includes("force"),
        noepub: parameters.includes('noepub') || parameters.includes('tojson'),
        tojson: parameters.includes('tojson'),
        keep: parameters.includes('keep'),
        token: null,
    }

    let token = parameters.find(p => p.startsWith("token="))
    if (token) params.token = token.slice(6)

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


