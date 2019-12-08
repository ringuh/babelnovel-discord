const fs = require('fs')
const HeavyEpub = require("epub-gen-funstory");
const Epub = require("quick-epub");





const generateEpub = async (novel, chapters, params) => {
    let author = [novel.authorEn, novel.author].filter(n => n).join(" | ")
    let fn = `${novel.canonicalName}_${chapters.length}_${chapters[0].index}-${chapters[chapters.length - 1].index}`

    let path = `./static/epub`
    if (!fs.existsSync(path)) fs.mkdirSync(path)
    path = `${path}/${params.ios ? 'ios_' : ''}${fn}.epub`
    if (fs.existsSync(path) && !params.epub) return path

    chapters = chapters.filter(c => c.index > 0).map(c => {
        if (c.epub) return c
        let stripped = c.chapterContent.replace("</p>", "\n").replace("<p>", "")
        let words = stripped.split(/\s+/gi).length
        stripped = `<div style="font-size: 70%;">${stripped.length} characters | ${words} words</div>`
        if (params.ios) c.epub = {
            title: c.name,
            data: `${c.chapterContent}${stripped}`,
        }
        else c.epub = {
            title: c.name,
            content: `${c.chapterContent}${stripped}`,
        }
        delete c.chapterContent
        return c
    })

    return await new Promise(resolve => {
        const fullEpub = path.replace(".epub", "_full.epub")
        const [coverName, coverAttachment] = novel.DiscordCover()
        const option = {
            title: `${novel.name} ${chapters[0].index}-${chapters[chapters.length - 1].index}`,
            author: params.ios ? author : [author],
            output: path,
            appendChapterTitles: true,
            cover: coverAttachment ? coverAttachment.replace("attachment://", '') : null,
            [params.ios ? 'content' : 'chapters']: chapters.map(c => c.epub)
        };

        if (fs.existsSync(fullEpub)) {
            resolve(SplitEpub(novel, fullEpub, chapters, resolve))
        } else if (params.ios)
            new HeavyEpub(option).promise
                .then(async () => resolve(SplitEpub(novel, path, chapters, params)))
                .catch(err => {
                    console.log(err.message)
                    resolve(null)
                })
        else Epub.createFile(option)
            .then(async () => resolve(SplitEpub(novel, path, chapters, params)))
            .catch(err => {
                console.log(err.message)
                resolve(null)
            })
    })

};


const SplitEpub = async (novel, path, chapters, params) => {
    return new Promise(async resolve => {
        const stats = fs.statSync(path)
        const fileSizeInMegabytes = stats["size"] / 1000000.0

        if (fileSizeInMegabytes > 8) {
            if (!path.endsWith("_full.epub")) {
                const fullEpub = path.replace(".epub", "_full.epub")
                if (fs.existsSync(fullEpub)) fs.unlinkSync(fullEpub)
                fs.renameSync(path, fullEpub)
            }
            const splitTo = Math.ceil(fileSizeInMegabytes / 8)
            //const chapterCount = Math.floor(chapters.length / splitTo)
            let chapterCount = 1500
            
            if (chapters.length >= 1200)
                chapterCount = 1000
            else if (chapters.length >= 1000)
                chapterCount = 800
            else if (chapters.length >= 800)
                chapterCount = 500
            else if (chapters.length >= 500)
                chapterCount = Math.floor(chapters.length / splitTo)
            let paths = []
            while (chapters.length) {
                const chaps = chapters.splice(0, chapterCount)
                const p = await generateEpub(novel, chaps, params)
                paths.push(p)
            }
            resolve(paths)
        }
        else resolve(path)
    })
}

module.exports = generateEpub