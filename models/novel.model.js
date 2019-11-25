const { api, numerics } = global.config
const { red, green, yellow, magenta, blue } = require('chalk').bold
const downloadImage = require('../funcs/downloadImage')
const fs = require('fs')

module.exports = function (sequelize, type) {
    const Model = sequelize.define('Novel', {
        id: {
            type: type.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        babelId: {
            type: type.STRING,
            unique: true,
            allowNull: false
        },
        canonicalName: { // martial-arts-peak
            type: type.STRING,
            unique: true,
            allowNull: false
        },
        abbr: {
            type: type.STRING,
            unique: true
        },
        releasedChapterCount: { // 26
            type: type.INTEGER
        },
        chapterCount: { // 26
            type: type.INTEGER
        },
        lastChapterBabelId: {
            type: type.STRING
        },
        cover: { // 78c8d251-1812-4927-bbe2-d0d3bcdef976
            type: type.STRING,
        },
        name: { // Martial Arts Peak
            type: type.STRING,
        },
        historyCanonicalName: { // martial-arts-peak
            type: type.STRING,
        },
        alias: {
            type: type.STRING,
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
        synopsis: {
            type: type.TEXT
        },
        isCopyrightAuthorized: { // 1
            type: type.INTEGER,
        },
        genre: { // 'fantasy'
            type: type.STRING,
            lower: true
        },
        isPay: {
            type: type.BOOLEAN
        },
        source_url: {
            type: type.STRING
        },
        source_name: {
            type: type.STRING
        },
        isCompleted: {
            type: type.BOOLEAN,
            defaltValue: false
        },
        isHiatus: {
            type: type.BOOLEAN,
            defaltValue: false
        },
        isRemoved: {
            type: type.BOOLEAN,
            defaltValue: false
        },
        token: {
            type: type.STRING
        },
        ratingNum: { // 9.125
            type: type.DOUBLE
        },
        updateTime: {
            type: type.DATE
        },
        createTime: {
            type: type.DATE
        },








    }, {
        timestamps: true,
    });

    Model.prototype.toJson = function (shortSummary) {
        let r = this.dataValues
        if (shortSummary) {
            r.synopsis = r.synopsis ? r.synopsis.substr(0, 100) : null
            r.summary = r.summary ? r.summary.substr(0, 100) : null
        }


        return r
    }

    Model.prototype.Url = function (apilink = false) {
        if (apilink)
            return api.novel.replace("<book>", this.canonicalName)
        return api.novel.replace("/api/", "/").replace("<book>", this.canonicalName)
    }

    Model.prototype.DiscordCover = function () {
        if (!this.cover) return [null, null]
        if (!this.cover.startsWith("static/")) return [null, null]
        if (!fs.existsSync(this.cover)) return [null, null]
        const coverFile = this.cover.split('/').slice(-1).pop()
        const coverAttachment = `attachment://${coverFile}`
        return [coverAttachment, this.cover]
    }

    Model.prototype.chapterIdsWithContent = async function (babelId, params, refresh) {
        if (params.force) return false
        if (!this.okChapterIds || !babelId)
            this.okChapterIds = await sequelize.models.Chapter.findAll({
                where: {
                    novel_id: this.id,
                    chapterContent: {
                        [sequelize.Sequelize.Op.not]: null
                    }
                },
                attributes: ["babelId"],
                sort: ["babelId"]
            }).then(ids => ids.map(id => id.babelId))
        
        return this.okChapterIds.includes(babelId)
    }


    Model.prototype.jsonToChapter = async function (chapterData, update) {
        if (!chapterData) return null
        if (!chapterData.babelId) {
            chapterData.babelId = chapterData.id
            delete chapterData.id
        }

        if (!update && chapterData.babelId === this.lastChapterBabelId)
            return null

        if (!this.trackers)
            this.trackers = await sequelize.models.TrackNovel.findAll({
                where: { novel_id: this.id }
            })

        const chapter = await sequelize.models.Chapter.findOrCreate({
            where: { novel_id: this.id, babelId: chapterData.babelId }
        }).then(async ([chap, created]) => {
            if (created || update) {
                if (created && this.trackers.length) chapterData.isAnnounced = false;

                await this.update({ lastChapterBabelId: chap.babelId })
                await chap.update(chapterData)
            }
            return chap
        })
        return chapter
    }

    Model.prototype.fetchJson = async function (page) {
        console.log(this.name, this.releasedChapterCount)
        if (!page || !this.babelId) return null
        const fetch_url = api.novel.replace("<book>", this.babelId)
        await page.goto(fetch_url)
        let json = await page.evaluate(() => {
            return JSON.parse(document.querySelector("body").innerText);
        });

        if (!json || json.code !== 0 || json.data.length === 0)
            return null

        let tmp = { ...json.data, author: null, id: this.id }
        delete tmp.cover
        if (json.data.author) {
            tmp.author = json.data.author.name || this.author
            tmp.authorEn = json.data.author.enName || this.authorEn
        }
        if (json.data.source) {
            tmp.source_name = json.data.source.name || this.source_name
            tmp.source_url = json.data.source.url || this.source_url
        }
        if (json.data.promotion && json.data.promotion.cutoffSeconds > 10000)
            tmp.isPay = false

        if (json.data.isShowStrategy) {
            //json.data.isRemoved = true
            console.log(json.data.bookStrategy.strategy)
        }

        const folder = "static/cover"
        const [coverAttachment, cover] = this.DiscordCover()


        if (!cover) {
            const fn = `${this.canonicalName}.png`
            try {
                tmp.cover = await downloadImage(json.data.cover, fn, folder)
            } catch (err) {
                console.log(red("error", err.message))
            }
        }

        await this.update(tmp)
        return json.data
    }

    Model.prototype.scrapeChapters = async function (page) {
        if (!page || !this.babelId) return null
        let chapters = []
        let json = { "data": [1], code: 0 }
        let pageNr = 0
        while (json.code === 0 && json.data.length) {
            let url = api.novel_chapters
                .replace(/<book>/gi, this.babelId)
                .replace("<pageNr>", pageNr)
                .replace("<pageSize>", numerics.novel_chapters_count)
            console.log(url)
            await page.waitFor(numerics.puppeteer_delay)
            await page.goto(url)
            //await page.screenshot({ path: "screenshot.tmp.png" })
            json = await page.evaluate(() => {
                return JSON.parse(document.querySelector("body").innerText);
            });

            if (json.data && json.data.length)
                chapters = [...chapters, ...json.data]

            if (json.data.length < numerics.novel_chapters_count)
                break

            pageNr++;
        }

        return chapters
    }

    Model.prototype.scrapeChaptersBulk = async function (page, { min, max, reverse }) {
        if (!page || !this.babelId) return null

        console.log(yellow("Listing chapters"))
        let url = api.chapter_groups
            .replace(/<book>/gi, this.babelId)

        await page.goto(url)
        await page.screenshot({ path: "screenshot.tmp.png" })
        json = await page.evaluate(() => {
            return JSON.parse(document.querySelector("body").innerText);
        });

        if (json.code !== 0) throw {
            message: "Chapterlist failed",
            code: 4
        }

        min = min * 10000
        max = max * 10000

        let chapters = []
        for (var i in json.data) {
            let c = json.data[i]
            if (c.firstChapter.num >= min && c.firstChapter.num <= max)
                chapters.push(c.firstChapter)
            if (c.firstChapter.id !== c.lastChapter.id &&
                c.lastChapter.num >= min && c.lastChapter.num <= max)
                chapters.push(c.lastChapter)
        }
        if (reverse) chapters = chapters.reverse()

        return chapters
    }


    Model.prototype.scrapeContent = async function (page, chapterJson, cssHash, params) {
        if (!page || !this.babelId) return null
        console.log("scrapeContent")
        chapterJson = { ...chapterJson, babelId: chapterJson.id }
        delete chapterJson.id

        if (!this.trackers)
            this.trackers = await sequelize.models.TrackNovel.findAll({
                where: { novel_id: this.id }
            })

        const chapter = await sequelize.models.Chapter.findOrCreate({
            where: { novel_id: this.id, babelId: chapterJson.babelId },
            defaults: { canonicalName: chapterJson.canonicalName }
        }).then(async ([chap, created]) => {
            if (created && this.trackers.length) chapterJson.isAnnounced = false
            return await chap.update(chapterJson)
        }).catch(err => console.log("Novel scrapeC", err.message))

        if (!chapter.chapterContent || params.force)
            return await chapter.scrapeContent(page, this, cssHash, params);
        else await this.chapterIdsWithContent(null, params)

        return null
    };


    Model.prototype.fetchCookie = async function (page) {
        const url = api.novel.replace("/api/", "/").replace("<book>", this.babelId)
        await page.goto(url)

        return true
    };




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
