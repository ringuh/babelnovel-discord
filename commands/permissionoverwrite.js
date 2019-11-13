const { isBypass, usageMessage } = require('../funcs/commandTools')
const { StripMentions } = require('../funcs/mentions.js')

module.exports = {
    name: ['permissionoverwrite'],
    description: 'Changes permissions to channel',
    hidden: true,
    args: "<allow/deny> <permission> <#channel> <@role> | <ratelimit> <seconds> <#channel>",
    async execute(message, args) {
        if (!isBypass(message, false))
            return true
        let allowed = ["allow", "deny", "ratelimit"]
        if (!args.length || !allowed.includes(args[0].toLowerCase()))
            return usageMessage(message, this)
        const cmd = args[0]
        args.shift()

        let [str, userMentions, channelMentions, roleMentions] = StripMentions(message.guild, args)
        console.log(args)
        
        let channel = channelMentions[0]
        let role = roleMentions[0] || message.channel.guild.defaultRole

        console.log(channel.rateLimitPerUser)
        if (cmd == 'ratelimit')
            channel.setRateLimitPerUser(parseInt(args[0]))
        else {
            const permissions = str.split(",").map(c => c.trim().toUpperCase())
            console.log(permissions)
            channel.replacePermissionOverwrites({
                overwrites: [
                    {
                        id: role.id,
                        [cmd]: permissions,
                    },
                ]
            })
        }
    }
}