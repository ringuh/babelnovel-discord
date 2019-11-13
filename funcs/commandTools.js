const { bypass_list, numerics } = global.config
const CommandTools = {
    isAdmin: (message, reply = true) => {
        if (!message.member.hasPermission("ADMINISTRATOR") &&
            !bypass_list.includes(message.member.id)) {
            if (reply)
                message.channel.send(
                    `Admin access required`, { code: true }
                ).then(msg => msg.Expire(message))
            return false
        }
        return true
    },

    isBypass: (message) => {
        return bypass_list.includes(message.member.id)
    },

    usageMessage: (message, command) => {
        message.channel.send(
            `Usage: ${global.config.prefix}${command.name[0]} ${command.args ? command.args : ''}`,
            { code: true }
        ).then(msg => msg.Expire(message))
    },

    botPermission: (message, permissions, reply = true) => {
        if (!permissions) return true
        if (typeof (permissions) === "string")
            permissions = [permissions]

        const botPermissionsFor = message.channel.permissionsFor(message.guild.me)
        if (botPermissionsFor.has('ADMINISTRATOR')) return true

        const response = !permissions.some(permission => {
            if (!botPermissionsFor.has(permission)) {
                if (reply)
                    message.channel.send(
                        `Bot is missing permission ${permission}`, { code: true }
                    ).then(msg => msg.Expire(message))
                return true
            }
        })

        return response
    }
};

module.exports = CommandTools