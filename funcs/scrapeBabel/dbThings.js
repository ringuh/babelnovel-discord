const { numerics, api } = global.config;
const { launchBrowser } = require('../babelNovel')
const fs = require('fs')
const Seq = require('../../models');
const { red } = require('chalk').bold

const jsonPath = "../../database/initialdata.json"

const dbToJson = async () => {
    console.log(Seq.sequelize.models)
    let json = {}

    let models = Object.keys(Seq.sequelize.models).map(modelName => {
        return new Promise(resolve => {
            let model = Seq.sequelize.models[modelName]
            model.findAll({ order: [["id", "ASC"]] }).then(v =>
                resolve({ k: modelName, v: v.map(v => v.dataValues) })
            )
        })
    })
    await Promise.all(models)

    for (var i in models)
        await models[i].then(({ k, v }) => json[k] = v)

    fs.writeFile(jsonPath, JSON.stringify(json), function (err) {
        if (err) throw err;
        console.log('Saved!');
    });
}

const jsonToDb = () => {
    const json = require(jsonPath)
   const ord = ["Novel", "Chapter", "Role", "TrackNovel", "Setting"];
    for(var i in ord)
        json[ord[i]].forEach(n => Seq.sequelize.models[ord[i]].create(n))
}

module.exports = { dbToJson, jsonToDb }

