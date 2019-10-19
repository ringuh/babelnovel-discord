const { isAdmin, usageMessage } = require('../../funcs/commandTools')
const { IsChannel } = require('../../funcs/mentions')
const setting = require('../setting')
const setting_key = 'latest_chapter_channel'

module.exports = {
    name: ['defaultchannel'],
    description: 'Sets default spam channel (admin)',
    args: "<channel>",
    async execute(message, args) {
        
        if (!isAdmin(message)) return false

        if (args.length < 1) {
            const dc = await setting.get(message.guild, setting_key)
            if(dc) message.channel.send(`Default channel: ${dc.value}`, { code: false })
            return usageMessage(message, this)
        }

        let channel = IsChannel(args[0], message.guild)

        if (!channel) return message.channel.send(`Channel ${args[0]} not found`)

        setting.save(message, setting_key, channel.id)
    },
};