const { isBypass, isAdmin, usageMessage } = require('../../funcs/commandTools')
const setting = require('../setting')
const setting_key = 'babel_token'

module.exports = {
    name: ['babeltoken', 'token'],
    description: 'Saves a token (superuser)',
    args: "<name> <token>",
    hidden: true,
    async execute(message, args) {
        if (!isBypass(message)) return false
        if (args.length < 1) return usageMessage(message, this)

        message.guild.id = 'localhost'
        const key = `${setting_key}_${args[0]}`
        if (args.length == 1 || args[1].length < 60) {
            const dc = await setting.get(message.guild, key)
            if (dc) message.channel.send(`${args[0]} token: ${dc.value}`, { code: false })
            return usageMessage(message, this)
        }
        else await setting.save(message, key, args[1])
    },
};