
const { numerics } = global.config;
const { RichEmbed, Attachment } = require('discord.js')


class LiveMessage {
    constructor(message, novel, params) {
        this.ignore = true
        this.message = message
        this.novel = novel
        this.emb = new RichEmbed()
        this.sent = null
        this.params = params
    }

    async init(counter, max, novel) {
        if (novel) this.novel = novel
        this.emb.setColor('#0099ff')
            .setTitle(this.novel.name)
            .setURL(this.novel.Url())
            .setTimestamp()
            .setFooter(this.novel.canonicalName, this.novel.cover)
            .setDescription(counter ?
                `Scraping chapters attempt ${counter} / ${max}` :
                "Initializing novel"
            );


        this.ignore = false
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

    async setMax(min, count) {
        this.max = min + count - 1
        this.emb.setDescription(`Found ${count} chapters`)

        return await this.send()
    }

    async progress(val) {
        this.min = val
        this.emb.setDescription(`Processing ${this.min} / ${this.max}`)

        return await this.send()
    }

    async send(expire) {
        if (this.ignore) return true
        if (this.sent)
            return await this.sent.edit(this.emb.setTimestamp())
                .then(msg => msg.Expire(this.message, !expire))
                .catch(err => console.log("!!", err.message))
        else
            return await this.message.channel.send(
                this.emb.setTimestamp()).then(msg => {
                    this.sent = msg
                    this.sent.Expire(this.message, !expire)
                }).catch(err => console.log("!!!", err.message))
        //.setDescription(`${numerics.latest_chapter_limit} latest chapters on https://babelnovel.com/latest-update`)
        //    .addBlankField()
    }

    async attach(files) {
        if (this.sent) {
            this.sent.Expire(null, null, 1)
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