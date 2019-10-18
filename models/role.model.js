module.exports = function(sequelize, type) {
    const Role = sequelize.define('Role', {
        id: {
            type: type.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        role: {
            type: type.STRING,
            allowNull: false,
            unique: true
        },
        server: {
            type: type.STRING,
            allowNull: false,
        },
        type: {
            type: type.STRING,
            validate: {
                isIn: [["chapter_warning"]]
            }
        },
        admin: {
            type: type.STRING,
        },
        channel: {
            type: type.STRING,
        }
    }, {
        timestamps: true,
    });

    return Role;
}

