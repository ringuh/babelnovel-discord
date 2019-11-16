const { isBypass, usageMessage } = require('../funcs/commandTools')
const { StripMentions } = require('../funcs/mentions.js')

module.exports = {
    name: ['permissionoverwrite'],
    description: 'Changes permissions to channel',
    hidden: true,
    args: "<allow/deny> <permission> <#channel> <@role> \n OR \n  <ratelimit> <seconds> <#channel>",
    async execute(message, args) {
        if (!isBypass(message, false))
            return true
        let allowed = ["allow", "deny", "ratelimit", "role"]
        if (!args.length || !allowed.includes(args[0].toLowerCase()))
            return usageMessage(message, this)
        const cmd = args[0].toLowerCase()
        args.shift()

        let [str, userMentions, channelMentions, roleMentions] = StripMentions(message.guild, args)

        let channel = channelMentions[0]
        let role = roleMentions[0]
       
        if (cmd === 'ratelimit')
            channel.setRateLimitPerUser(parseInt(args[0]))
        else if (cmd === 'role') {
            if(!roleMentions.length) return false
            const permissions = str.split(",").map(c => c.trim().toUpperCase())
            roleMentions[0].setPermissions(permissions).catch(err => console.log(err.message))
        } else {
            const permissions = str.split(",").map(c => c.trim().toUpperCase())
            console.log(permissions)
            channel.replacePermissionOverwrites({
                overwrites: [
                    {
                        id: role.id,
                        [cmd]: permissions,
                    },
                ]
            }).catch(err => console.log(err.message))
        }
    }
}