const { isAdmin, usageMessage } = require('../../funcs/commandTools')
const { Role } = require("../../models")
const { StripMentions } = require('../../funcs/mentions')

module.exports = {
    name: ['removerole'],
    description: 'Removes role from user',
    args: "[user] <role>",
    execute(message, args) {
        if (args.length < 1) return usageMessage(message, this)

        let [roleStr, userMentions, channelMentions, roleMentions] = StripMentions(message.guild, args)
        
        const role = roleMentions[0] || message.guild.roles.find(r => r.name.toLowerCase() == roleStr.toLowerCase())
        if (!role) return message.channel.send(`Role '${roleStr}' not found`, { code: true });

        if (!userMentions.length) userMentions = [message.member]

        if (role.hasPermission("ADMINISTRATOR"))
            return message.channel.send(`Touching admin roles is forbidden`, { code: true });

        userMentions.forEach(user => {
            if (!user.roles.get(role.id))
                return message.channel.send(
                    `Role '${role.name}' not found on ${user.user.username}`, { code: true });

            if (user.id !== message.author.id && !isAdmin(message, false))
                return message.channel.send(
                    `You don't have permission to do whatever you were doing`, { code: true });

            Role.findOne({ where: { server: message.guild.id, role: role.id } })
                .then(deleteRole => {
                    if (!deleteRole) return message.channel.send(
                        `You can only remove roles listed by !roles`, { code: true });

                    user.removeRole(role.id).then(() =>
                        message.channel.send(`Removing role '${role.name}' from ${user}`, { code: false })
                    )

                })
        })
    },
};