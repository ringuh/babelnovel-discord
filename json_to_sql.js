global.config = require('./config.json')
global.config.db = global.config.db_cloud
const { Chapter, Novel } = require('./models')
const fs = require('fs')
const jsonFolder = "static/json"

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
    const files = fs.readdirSync(jsonFolder, { withFileTypes: true })
        .filter(file => file.name.startsWith('chapters_'))

    const ids = await Chapter.findAll({
        attributes: ['babelId']
    }).then(ids => ids.map(id => id.babelId))

    for (var k in files) {
        console.log(files[k].name)
        let json = require(`./${jsonFolder}/${files[k].name}`)
        for (var i in json.data) {
            const chapterJson = json.data[i]
            if(ids.includes(chapterJson.babelId)) continue
            const novel = await Novel.findOne({ where: { babelId: chapterJson.novelId } })
            if (!novel) return null
            delete chapterJson.novelId
            delete chapterJson.novel
            await Chapter.findOrCreate({
                where: {
                    babelId: chapterJson.babelId
                }, defaults: { ...chapterJson, novel_id: novel.id }
            }).then(([c, created]) => console.log(c.name))
                .catch(err => console.log(err.message))
        }
    }
})();