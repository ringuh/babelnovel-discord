module.exports = function(sequelize, type) {
    const Model = sequelize.define('Setting', {
        id: {
            type: type.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        server: {
            type: type.STRING,
            allowNull: false,
        },
        key: {
            type: type.STRING,
            allowNull: false
        },
        value: {
            type: type.STRING,
            allowNull: false,
        },
        type: { // channel, user, guild, role
            type: type.STRING,
            validate: {
                isIn: [['discord_channel', 'discord_user', 'discord_guild', 'discord_role']]
            }
        }

    }, {
        timestamps: true,
    });

    Model.prototype.typeToValue = function (server) {
        const { IsUser, IsChannel } = require('../funcs/mentions')
        const typeActions = { 
            discord_channel: IsChannel, 
            discord_user: IsUser,
            discord_guild: null,
            discord_role: null,
        }
        
        return typeActions[this.type](this.value, server)
	}

    return Model;
}
