global.config = require('./config.json')
global.config.db = global.config.db_cloud
const { Chapter, Novel } = require('./models')
const fs = require('fs')
const jsonFolder = "static/json"
const { red, green, yellow } = require('chalk').bold

!(async () => { // novels
    /*  let file = `${jsonFolder}/novel.json`
     let json = require(`./${file}`)
     for (var i in json.data) {
         const novelJson = json.data[i]
         await Novel.findOrCreate({
             where: {
                 babelId: novelJson.babelId
             }, defaults: novelJson
         })
     } */

    // chapters
    let startFrom = parseInt(process.argv[2])
    let filenr = isNaN(startFrom) ? '' : `${startFrom}`;

    let files = fs.readdirSync(jsonFolder, { withFileTypes: true })
        .filter(file => file.name.startsWith(`chapters_${filenr}`))
    if (process.argv.includes("reverse"))
        files = files.reverse()
    const ids = await Chapter.findAll({
        attributes: ['babelId']
    }).then(ids => ids.map(id => id.babelId))
    for (var k in files) {
        console.log(yellow(files[k].name))
        let json = require(`./${jsonFolder}/${files[k].name}`)
        for (var i in json.data) {
            const chapterJson = json.data[i]
            if (ids.includes(chapterJson.babelId)) continue
            const novel = await Novel.findOne({ where: { babelId: chapterJson.novelId } })
            if (!novel) return null
            delete chapterJson.novelId
            delete chapterJson.novel
            await Chapter.findOrCreate({
                where: {
                    babelId: chapterJson.babelId
                }, defaults: { ...chapterJson, novel_id: novel.id }
            }).then(async ([c, created]) => {
                if (chapterJson.chapterContent && !c.chapterContent)
                    await c.update(chapterJson)
                console.log(files[k].name, created ? green(c.name) : c.name)
            }).catch(err => console.log(red(err)))
        }
    }
})();