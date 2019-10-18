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

    botPermission: (message, permission = "ADMINISTRATOR") => {
        const botPermissionsFor = message.channel.permissionsFor(message.guild.me)
        if (!botPermissionsFor.has(permission)) {
            message.channel.send(`Bot is missing permission ${permission}`, { code: true })
            return false
        }
        return true
    }
};

module.exports = CommandTools