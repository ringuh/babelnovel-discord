const fs = require('fs')
//const Epub = require("epub-gen-funstory");
const Epub = require("quick-epub");
const Axios = require('axios')
const pathTool = require('path')


const generateEpub = async (novel, chapters, params) => {
    let author = [novel.authorEn, novel.author].filter(n => n).join(" | ")
    let fn = `${novel.canonicalName}_${chapters[0].index}-${chapters[chapters.length - 1].index}`

    let path = `./static/epub`
    if (!fs.existsSync(path)) fs.mkdirSync(path)
    path = `${path}/${fn}.epub`

    if (fs.existsSync(path) && !params.epub) return path
    let cover = novel.cover ? encodeURI(novel.cover) : null // || await DownloadCover(novel);
    //console.log(cover)
    const option = {
        title: `${novel.name} ${chapters[0].index}-${chapters[chapters.length - 1].index}`,
        author: [author],
        output: path,
        appendChapterTitles: true,
        //cover: cover,
        chapters: chapters.filter(c => c.index > 0).map(c => {
            let stripped = c.chapterContent.replace("</p>", "\n").replace("<p>", "")
            let words = stripped.split(/\s+/gi).length
            stripped = `<div style="font-size: 70%;">${stripped.length} characters | ${words} words</div>`
            return {
                title: c.name,
                content: `${c.chapterContent}${stripped}`,
            }
        })
    };

    return await new Promise(resolve => {

        Epub.createFile(option)
            .then(async () => {
                const stats = fs.statSync(path)
                const fileSizeInMegabytes = stats["size"] / 1000000.0

                if (fileSizeInMegabytes > 8) {
                    console.log("this far", "splitting")
                    const fullEpub = path.replace(".epub", "_full.epub")
                    if (fs.existsSync(fullEpub)) fs.unlinkSync(fullEpub)
                    fs.renameSync(path, fullEpub)

                    const splitTo = Math.ceil(fileSizeInMegabytes / 8)
                    const chapterCount = Math.floor(chapters.length / splitTo)
                    let paths = []
                    
                    for (var i = 0; i < splitTo; ++i) {
                        //const chaps = chapters.slice(i * chapterCount, (i + 1) * chapterCount)
                        const chaps = chapters.splice(0, (i + 1 < splitTo) ? chapterCount : chapters.length)
                        const p = await generateEpub(novel, chaps, params)
                        paths.push(p)
                    }
                    resolve(paths)
                }
                else resolve(path)
            }).catch(err => {
                console.log(err.message)
                resolve(null)
            })
    })

};


const DownloadCover = async (novel) => {
    if (!novel.cover) return null
    let path = `./static/cover`
    if (!fs.existsSync(path)) fs.mkdirSync(path)

    path = `${path}/${novel.canonicalName}${pathTool.extname(novel.cover)}`
    const writer = fs.createWriteStream(path)
    console.log(path)


    const response = await Axios({
        url: encodeURI(novel.cover),
        method: 'GET',
        responseType: 'stream'
    }).catch(e => console.log(e))

    response.data.pipe(writer)

    return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(path))
        writer.on('error', (err) => reject(null))
    });
}



module.exports = generateEpub