module.exports = function (sequelize, type) {
    const Model = sequelize.define('TrackNovel', {
        id: {
            type: type.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        server: {
            type: type.STRING,
            allowNull: false,
        },
        channels: {
            type: type.TEXT,
        },
        roles: {
            type: type.TEXT
        },
    }, {
        timestamps: true,
    });

    /*  Model.prototype.toJson = function(){
         let ret = this.dataValues
         ret.url =  this.Url()
         return ret
     }; */

    /*  Model.prototype.Url = function(){
         return `https://babelnovel.com/books/${this.bookCanonicalName}/chapters/${this.canonicalName}`
     } */
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
