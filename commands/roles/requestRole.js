const { isAdmin, usageMessage } = require('../../funcs/commandTools')
const { Role } = require("../../models")
const { StripMentions } = require('../../funcs/mentions')


module.exports = {
    name: ['requestrole'],
    description: 'Requests a role to user',
    args: "[user] <role>",
    async execute(message, args) {
        if (args.length < 1) return usageMessage(message, this)

        let [roleStr, userMentions] = StripMentions(message.guild, args)

        if (!roleStr.length)
            return message.channel.send(`Role name missing`, { code: true });

        if (userMentions.length === 0)
            userMentions = [message.member]

        const role = message.guild.roles.find(role => role.name.toLowerCase() == roleStr.toLowerCase())
        if (!role)
            return message.channel.send(`Role '${roleStr}' not found`, { code: true });

        if (role.hasPermission("ADMINISTRATOR"))
            return message.channel.send(`Touching admin roles is forbidden`, { code: true });

        userMentions.forEach(user => {
            if (user.roles.get(role.id))
                return message.channel.send(
                    `Role '${roleStr}' already found on ${user.user.username}`, { code: true });

            Role.findOne({ where: { server: message.guild.id, role: role.id } })
                .then(deleteRole => {
                    if (!deleteRole) return message.channel.send(
                        `You can only add roles listed by !roles`, { code: true });
                    if (user.id !== message.author.id && !isAdmin(message, false))
                        return message.channel.send(
                            `You don't have permission to do whatever you were doing`, { code: true });

                    user.addRole(role.id).then(() =>
                        message.channel.send(
                            `Adding role '${role.name}' to ${user}`, { code: false }))

                })
        })

    }
};