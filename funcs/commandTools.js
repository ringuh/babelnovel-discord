const { bypass_list } = global.config
const CommandTools = {
    isAdmin: (message, reply = true) => {
        if (!message.member.hasPermission("ADMINISTRATOR") &&
            !bypass_list.includes(message.member.id)) {
            if (reply) message.channel.send(`Admin access required`, { code: true })
            return false
        }
        return true
    },

    usageMessage: (message, command) => {

        message.channel.send(
            `Usage: ${global.config.prefix}${command.name[0]} ${command.args ? command.args : ''}`,
            { code: true })
    },

    botPermission: (message, permissions, no_message) => {
        if (!permissions) return true
        if (typeof (permissions) === "string")
            permissions = [permissions]

        const botPermissionsFor = message.channel.permissionsFor(message.guild.me)
        if(botPermissionsFor.has('ADMINISTRATOR')) return true

        const response = !permissions.some(permission => {
            if (!botPermissionsFor.has(permission)) {
                if(!no_message)
                    message.channel.send(`Bot is missing permission ${permission}`, { code: true })
                return true
            }
        })

        return response
    }
};

module.exports = CommandTools