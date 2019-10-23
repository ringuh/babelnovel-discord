const { api } = global.config

module.exports = function (sequelize, type) {
    const Model = sequelize.define('Chapter', {
        id: {
            type: type.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        content: {
            type: type.TEXT
        },
        chapterContent: {
            type: type.TEXT
        },
        hasContent: {
            type: type.BOOLEAN,
        },
        isFree: {
            type: type.BOOLEAN,
        },
        isLimitFree: {
            type: type.BOOLEAN,
        },
        summary: {
            type: type.TEXT
        },
        type: {
            type: type.STRING
        },
        name: {
            type: type.STRING
        },
        index: {
            type: type.INTEGER
        },
        num: {
            type: type.INTEGER
        },
        publishTime: {
            type: type.DATE
        },
        canonicalName: {
            type: type.STRING
        },
        updateTime: {
            type: type.DATE
        },
        createTime: {
            type: type.DATE
        },
        babelId: {
            type: type.STRING,
            unique: true,
            allowNull: false
        },

        /* { bookId: '66e747f8-05ca-44fc-8204-75c8bc9af26a',
        bookCanonicalName: 'monarch-of-the-dark-nights',
        bookCover:
         'https://img.babelchain.org/book_images/Monarch of the Dark Nights.jpg',
        bookName: 'Monarch of the Dark Nights',
        content: null,
        type: 'babelchain',
        name: 'C201',
        num: 2010000,
        publishTime: '2019-10-18T08:46:22',
        canonicalName: 'c201',
        genreId: '5fb60221-a42e-4ad3-855b-14b5daaf5665',
        genreName: 'Sci-fi',
        updateTime: null,
        createTime: null,
        id: '8dcbfe72-c126-4145-aed2-408f55e4c97a' } */

    }, {
        timestamps: true,
    });

    Model.prototype.toJson = function () {
        let ret = this.dataValues
        ret.url = this.Url()
        return ret
    };

    Model.prototype.Url = function (novel=this.novel) {
        return `https://babelnovel.com/books/${novel.canonicalName}/chapters/${this.canonicalName}`
    }

    Model.prototype.scrapeContent = async function (page, novel, cssHash, update = false) {
        if (!page || !this.babelId) return null
        const url = api.chapter.replace("<book>", novel.canonicalName).replace("<chapterName>", this.canonicalName)
        console.log(url)
        await page.goto(url)
        await page.waitFor(500)
        //await page.screenshot({ path: "screenshot.tmp.png" })
        let json = await page.evaluate(() => {
            return JSON.parse(document.querySelector("body").innerText);
        });

        if (json.code !== 0) return null
        json = json.data
        delete json.id
        if (json.content) {
            
            const html = SimulateHtml(json.content, cssHash)
            await page.setContent(html)
            //const element = await page.$("body");
            //const children = await page.evaluateHandle(e => e.children, element);

            const children = await page.evaluate(() => {
                let ret = []
                document.body.childNodes.forEach(n => {
                    if(n.offsetWidth > 0)
                        ret.push(n.innerText)
                })
                //let el = document.querySelector("body").children.map(e => e.innerText)
                return ret
            });

            json.chapterContent = children.map(n => `<p>${n.trim()}</p>`).join("\n")
        }

        delete json.content
        await this.update(json)
        
        return true


    };


    Model.associate = models => {
        Model.belongsTo(models.Novel, {
            onDelete: "CASCADE",
            foreignKey: 'novel_id',
            allowNull: false,
            as: 'novel'
        })
    };

    return Model;
}



const SimulateHtml = (content, css) => {
    const fs = require('fs')
    const html = `
    <html>
        <head>
            <style>
                ${css}
            </style>
        </head>
        <body>${content}</body>
    </html>
    `

    fs.writeFile('./funcs/scrapeBabel/simulate.html', html, function (err) { })
    return html
}