const { api } = global.config

module.exports = function (sequelize, type) {
    const Model = sequelize.define('Novel', {
        id: {
            type: type.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        genre: { // 'fantasy'
            type: type.STRING,
            lower: true
        },
        babelId: {
            type: type.STRING,
        },
        lastChapterBabelId: {
            type: type.STRING
        },
        authorId: { // 78c8d251-1812-4927-bbe2-d0d3bcdef976
            type: type.STRING,
        },
        author: { // 平凡魔术师
            type: type.STRING,
        },
        authorEn: { // i eat tomatoes
            type: type.STRING,
        },
        isCopyrightAuthorized: { // 1
            type: type.INTEGER,
        },
        cover: { // 78c8d251-1812-4927-bbe2-d0d3bcdef976
            type: type.STRING,
            /* validate: {
                isUrl: true
            } */
        },
        name: { // Martial Arts Peak
            type: type.STRING,
        },
        subTitle: { // His spirit blood and bone were stolen. Luckily, he had mysterious memories.
            type: type.STRING,
        },
        synopsis: {
            type: type.TEXT
        },
        tag: {
            type: type.STRING,
        },
        serial: {
            type: type.STRING,
        },
        enSerial: {
            type: type.STRING,
        },
        status: {
            type: type.INTEGER
        },
        alias: {
            type: type.STRING,
        },
        canonicalName: { // martial-arts-peak
            type: type.STRING,
        },
        historyCanonicalName: { // martial-arts-peak
            type: type.STRING,
        },
        ratingNum: { // 9.125
            type: type.DOUBLE
        },
        releasedChapterCount: { // 26
            type: type.INTEGER
        },
        chapterCount: { // 26
            type: type.INTEGER
        },
        updateTime: {
            type: type.DATE
        },
        createTime: {
            type: type.DATE
        },
        isPay: {
            type: type.BOOLEAN
        },
        source_url: {
            type: type.STRING
        },
        source_name: {
            type: type.STRING
        }








    }, {
        timestamps: true,
    });

    Model.prototype.jsonToChapter = function (chapterData, update) {
        if (!chapterData) return null
        if (!chapterData.babelId) {
            chapterData.babelId = chapterData.id
            delete chapterData.id
        }

        if (!update && chapterData.babelId === this.lastChapterBabelId)
            return null

        const chapter = sequelize.models.Chapter.findOrCreate({
            where: { novel_id: this.id, babelId: chapterData.babelId }
        }).then(async ([chap, created]) => {
            if (created || update) {
                await this.update({ lastChapterBabelId: chap.babelId })
                await chap.update(chapterData)
            }
            return chap
        })

        return chapter
    }

    Model.prototype.fetchJson = async function (page) {
        console.log(this.name)
        if (!page || !this.babelId) return null
        const fetch_url = api.novel.replace("<book>", this.babelId)
        await page.goto(fetch_url)
        let json = await page.evaluate(() => {
            return JSON.parse(document.querySelector("body").innerText);
        });
        
        if (!json || json.code !== 0 || json.data.length === 0)
            return null
        
        let tmp = {...json.data, author: null, id: this.id }
        console.log(tmp)
        if (json.data.author) {
            tmp.author = json.data.author.name || this.author
            tmp.authorEn = json.data.author.enName || this.authorEn
        }
        if (json.data.source) {
            tmp.source_name = json.data.source.name || this.source_name
            tmp.source_url = json.data.source.url || this.source_url
        }

        await this.update(tmp)

        return json.data

    }

    Model.associate = models => {
        Model.hasMany(models.Chapter, {
            as: 'chapters',
            foreignKey: 'novel_id',
            allowNull: false
        })

        Model.hasMany(models.TrackNovel, {
            as: 'trackers',
            foreignKey: 'novel_id',
            allowNull: false
        })
    };

    return Model;
}
