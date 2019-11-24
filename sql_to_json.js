global.config = require('./config.json')
global.config.db = global.config.db_local
const { Chapter, Novel } = require('./models')
const fs = require('fs')
const jsonFolder = "static/json"
!(async () => { // novels

    let file = `${jsonFolder}/novel.json`
    const json = await Novel.findAll({}).then(novels => novels.map(novel => {
        let r = novel.dataValues
        delete r.id
        return r
    }));
    fs.writeFileSync(file, JSON.stringify({ data: json }), err => reject(err))
})();


!(async () => { // chapters
    let json = [1]
    let [page, limit] = [0, 5000]
    while (json.length) {
        json = await Chapter.findAll({
            limit: limit,
            offset: page * limit,
            include: [{ model: Novel, as: "novel", attributes: ['babelId'] }]
        }).then(chapters => chapters.map(chapter => {
            let r = chapter.dataValues
            r.novelId = chapter.novel.babelId
            delete r.id
            delete r.novel_id
            delete r.novel
            return r
        }));
        console.log(json.length, page)
        if (json.length)
            fs.writeFileSync(`${jsonFolder}/chapters_${page}.json`, JSON.stringify({ data: json }), err => reject(err))
        page += 1;
    }
})();