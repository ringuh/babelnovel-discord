
const { isBypass, usageMessage } = require('../../funcs/commandTools')
const generateEpub = require('../../funcs/generateEpub')
const { StripMentions } = require('../../funcs/mentions.js')
const { Novel, Chapter, Sequelize } = require("../../models")
const { scrapeNovel } = require("../../funcs/scrapeBabel")
const { RichEmbed } = require('discord.js')

module.exports = {
    name: ['babelepub', 'be'],
    description: 'Scrapes available chapters and converts them to epub (private)',
    args: "<novel>",
    hidden: true,
    async execute(message, args) {
        if (!isBypass(message)) return false

        if (args.length < 1) return usageMessage(message, this)

        let [novelStr, userMentions, channelMentions, roleMentions] = StripMentions(message.guild, args)

        if (!novelStr.length)
            return message.channel.send(`Role name missing`, { code: true });

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

        let counter = 1
        const max_counter = 3
        const livemsg = new LiveMessage(message, novel)
        await livemsg.init()
        try {


            if (novel.chapters.some(c => !c.hasContent) || novel.chapters.length < novel.releasedChapterCount) {
                while (!r && counter < max_counter) {
                    await livemsg.init(counter, max_counter)
                    r = await scrapeNovel(novel, livemsg)
                    counter++;
                }

            }

            const chapters = await Chapter.findAll({
                where: {
                    novel_id: novel.id,
                    chapterContent: {
                        [Sequelize.Op.not]: null
                    }
                },
                order: [['index', 'asc']]
            })
            if (!chapters.length)
                return await livemsg.description("No chapters with content found for this novel")


            await livemsg.description("Generating epub")
            let epub = await generateEpub(novel, chapters)
            console.log("inepub", epub)
            return await livemsg.attach(epub)
        } catch (err) {
            return await livemsg.description(err.message)
        }
    },





};



class LiveMessage {
    constructor(message, novel) {
        this.message = message
        this.novel = novel
        this.emb = new RichEmbed()
        this.sent = null
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

    async description(str) {
        this.emb.setDescription(str)
        return await this.send()
    }

    async max(val) {
        this.max = val
        this.emb.setDescription(`Found ${this.max} chapters`)

        return await this.send()
    }

    async progress(val) {
        this.min = val
        this.emb.setDescription(`Processing ${this.min} / ${this.max}`)

        return await this.send()
    }

    async send() {
        if (this.sent)
            return await this.sent.edit(this.emb.setTimestamp())
        else
            return await this.message.channel.send(this.emb.setTimestamp()).then(msg => {
                this.sent = msg
            })

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


        if (!files || !files.length) {
            let emb = Emb()
            emb.setDescription("something went wrong")
            await this.message.channel.send(emb)
        }

        else {
            if (typeof (files) === 'string')
                files = [files]

            files.forEach(async file => {
                let emb = Emb()
                emb.setDescription("Epub generated")
                    .attachFile(file)
                await this.message.channel.send(emb)
            })

        }
    }
}


