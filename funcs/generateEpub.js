const fs = require('fs')
const Epub = require("epub-gen-funstory");


const generateEpub = async (novel, chapters) => {
    let author = [novel.authorEn, novel.author].filter(n => n).join(" | ")
    let fn = `${novel.canonicalName}_${chapters[0].index}-${chapters[chapters.length - 1].index}`

    let path = `./static/epub`
    if (!fs.existsSync(path)) fs.mkdirSync(path)

    path = `${path}/${fn}.epub`

    //if (fs.existsSync(path)) return path

    const option = {
        title: `${novel.name} ${chapters[0].index}-${chapters[chapters.length - 1].index}`, // *Required, title of the book.
        author: author,
        cover: novel.cover,
        content: chapters.filter(c => c.index > 0).map(c => {
            let stripped = c.chapterContent.replace("</p>", "\n").replace("<p>", "")
            let words = stripped.split(/\s+/gi).length
            stripped = `<div style="font-size: 70%;">${stripped.length} characters | ${words} words</div>`
            return {
                title: c.name,
                data: `${c.chapterContent}${stripped}`,
            }
        })
    };

    return await new Promise(resolve => {
        console.log("in promise")
        new Epub(option, path)
            .promise.then(
                () => {
                    console.log("success")
                    resolve(path)
                },
                err => {
                    console.log("success")
                    resolve(null)
                }
            )
    })

};

module.exports = generateEpub