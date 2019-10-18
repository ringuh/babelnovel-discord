module.exports = function(sequelize, type) {
    const Model = sequelize.define('LatestChapter', {
        id: {
            type: type.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
       /*  server: {
            type: type.STRING,
            allowNull: false,
        }, */
        bookId: {
            type: type.STRING
        },
        bookCanonicalName: {
            type: type.STRING
        },
        bookCover: {
            type: type.STRING
        },
        bookName: {
            type: type.STRING
        },
        content: {
            type: type.STRING
        },
        type: {
            type: type.STRING
        },
        name: {
            type: type.STRING
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
        genreId: {
            type: type.STRING
        },
        genreName: {
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

    Model.prototype.toJson = function(){
        let ret = this.dataValues
        ret.url =  this.Url()
        return ret
    };

    Model.prototype.Url = function(){
        return `https://babelnovel.com/books/${this.bookCanonicalName}/chapters/${this.canonicalName}`
    }

    return Model;
}
