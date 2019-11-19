const { isBypass, usageMessage } = require('../funcs/commandTools')
const { Setting } = require('../models')
const { IsMention } = require('../funcs/mentions')

module.exports = {
    name: ['setting'],
    description: 'Set a server setting (admin)',
    args: "<setting> <value>",
    hidden: true,
    async execute(message, args) {
        if (!isBypass(message)) return false
        if (args.length < 1) return usageMessage(message, this)

        const setting = args[0].toLowerCase()
        if (args.length < 2) return this.get(message.guild, setting, message)

        this.save(message, setting, args[1])
    },

    async save(message, key, val) {
        let [value, type] = IsMention(val, message.guild)
        console.log(key, val)
        await Setting.findOrCreate({
            where: { server: message.guild.id, key: key },
            defaults: { value: value.id || value, type: type }
        }).then(([setting, created]) => {
            if (!type && value.toLowerCase() === "delete")
                setting.destroy().then(() => message.channel.send(`Deleted ${key}`))

            else {
                setting.update({ value: value.id || value }).then(set =>
                    message.channel.send(`Saved ${set.key} as ${type ? value : set.value}`)
                )
            }

        }).catch((err) => {
            console.log(err.message)
            throw err
        })
    },

    async get(server, key, message) {
        const setting = await Setting.findOne({ where: { server: server.id, key: key } })
        if (setting) setting.value = setting.typeToValue(server)

        if (message)
            setting ? message.channel.send(`setting '${setting.key}' is ${setting.value}`) :
                message.channel.send(`setting '${key}' not found`)

        return await setting
    },
};