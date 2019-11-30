
const { numerics } = global.config;
const { RichEmbed, Attachment } = require('discord.js')


class LiveMessage {
    constructor(message, novel, params) {
        this.message = message
        this.params = params
        this.novel = Array.isArray(novel) ? novel[0] : novel
        this.novelCount = Array.isArray(novel) ? novel.length : 1
        this.author = ''
        this.sent = null
        this.description = new Array(5)
    }

    getEmbed() {
        if (!this.novel) return new RichEmbed()
        const [coverName, coverAttachment] = this.novel.DiscordCover()
        return new RichEmbed()
            .setColor('#0099ff')
            .setAuthor(this.author)
            .setTitle(this.novel.name)
            .setURL(this.novel.Url())
            .setTimestamp()
            .attachFile(coverAttachment)
            .setThumbnail(coverName)
            .setFooter(this.novel.canonicalName, coverName)
            .setDescription("Initializing novel");

    }

    async init(counter, max) {
        let emb = this.getEmbed()
        if (counter && max) emb.setDescription(`Scraping attempt ${counter} / ${max}`);
        return await this.send(this.getEmbed())
    }

    async scrapeProgress(counter, novel) {
        if (!this.message || this.novelCount < 2) return false
        this.novel = novel
        this.author = `${counter} / ${this.novelCount}`
        this.description[0] = null
        console.log(novel.name)
        if (this.sent) {
            await this.sent.delete().catch(err => console.log(err.message))
            this.sent = null
        }

        return await this.send(this.getEmbed())
    }

    async setDescription(description, expire, line) {
        let emb = this.getEmbed()
        if (line >= 0) {
            this.description[line] = description;
            description = this.description.filter(d => d).join("\n")
            console.log(this.description)
        }
        emb.setDescription(description)
        return await this.send(emb, expire)
    }

    async setMax(min, count) {
        let emb = this.getEmbed()
        this.max = min + count - 1
        emb.setDescription(`Found ${count} chapters`)
        return await this.send(emb)
    }

    async progress(val) {
        let emb = this.getEmbed()
        emb.setDescription(`Processing ${val} / ${this.max}`, null, 0)
        return await this.send(emb)
    }

    async send(message, expire) {
        if (!this.message) return true
        if (this.sent)
            return await this.sent.edit(message.setTimestamp())
                .then(msg => msg.Expire(this.message, !expire))
                .catch(err => console.log("Sending error:", err.message))
        else
            return await this.message.channel.send(
                message.setTimestamp()).then(msg => {
                    this.sent = msg
                    this.sent.Expire(this.message, !expire)
                }).catch(err => console.log("Sending error:", err.message))
    }

    async attach(files) {
        if (this.sent) {
            this.sent.Expire(null, null, 1)
            this.sent = null
        }

        const Emb = () => {
            const [coverName, coverAttachment] = this.novel.DiscordCover()
            const emb = new RichEmbed()
                .setTitle(this.novel.name)
                .attachFile(coverAttachment)
                .setThumbnail(coverName)
            return emb
        }

        if (!files || !files.length) {
            let emb = Emb()
            emb.setDescription("something went wrong")
            await this.message.channel.send(emb).then(msg => msg.Expire(this.message))
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
                    file: new Attachment(file, filename)
                }).then(msg => msg.Expire(this.message, this.params.keep))
                    .catch(err => {
                        this.message.channel.send(err.message, { code: true })
                            .then(msg => msg.Expire(this.message))
                    })
            }
        }
    }
}

module.exports = LiveMessage