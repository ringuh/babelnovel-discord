
const { isBypass, usageMessage } = require('../../funcs/commandTools')
const { Novel, Chapter, Sequelize } = require("../../models")
const { numerics } = global.config
const axios = require('axios')
const fs = require('fs')
const zlib = require('zlib');
const urlTool = require('url')

module.exports = {
    name: ['fromjson'],
    description: 'Download json package and turn it into chapters (private)',
    args: "<json_url>",
    hidden: true,
    async execute(message, args, parameters) {
        if (!isBypass(message)) return false

        const urls = [args.join(""), ...message.attachments.map(a => a.url)].filter(url => {
            if (!url.endsWith('.gz')) return false
            let r = urlTool.parse(url, true)
            return r.hostname
        })
        if (!urls.length) message.channel.send(`No valid urls`, { code: true })
        await message.channel.startTyping()
        urls.forEach(async url => {
            try {
                const data = await downloadFile(url)
                const novel = await Novel.findOne({ where: { babelId: data.novel } })
                let counter = 0
                if (!novel) return message.channel.send(`Novel not found ${data.novel}`, { code: true })

                for (let i in data.chapters) {
                    const chapter = data.chapters[i]
                    await Chapter.findOrCreate({
                        where: { novel_id: novel.id, babelId: chapter.babelId }
                    }).then(async ([chap, created]) => {
                        if (!chap.chapterContent || parameters.includes("force")) {
                            await chap.update(chapter)
                            counter++;
                        }
                        return chap
                    })
                }
                await message.channel.stopTyping(true)
                await message.channel.send(
                    `${novel.name}: updated ${counter}/${data.chapters.length}`,
                    { code: true }
                ).then(msg => msg.Expire(message))
            }
            catch (err) {
                message.channel.send(`Error: ${err.message}`, { code: true })
                    .then(msg => msg.Expire(message))
            }
        })
    },
};

async function downloadFile(url) {
    fname = url.split("/").pop().replace(/\.[^\.]+$/, '.tmp');
    const path = `static/${fname}`
    const writer = fs.createWriteStream(path)
    const unzip = zlib.createGunzip();

    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    })

    response.data.pipe(unzip).pipe(writer)

    return new Promise((resolve, reject) => {
        writer.on('finish', () => {
            let data = fs.readFileSync(path)
            resolve(JSON.parse(data))
        })
        writer.on('error', (err) => { console.log(err); reject() })
    })
}







