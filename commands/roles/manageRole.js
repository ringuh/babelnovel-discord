
const { isAdmin, usageMessage } = require('../../funcs/commandTools')
const { Role } = require("../../models")

module.exports = {
    name: ['managerole'],
    description: 'Toggles role request availability (admin)',
    args: "<role>",
    execute(message, args) {
        if (!isAdmin(message)) return false
        if (args.length < 1) return usageMessage(message, this)

        let roleStr = args.join(" ").trim().toLowerCase()
        const targetRole = message.guild.roles.find(role => role.name.toLowerCase() == roleStr)

        if (!targetRole)
            return message.channel.send(`Role '${roleStr}' not found`, { code: true });

        if (targetRole.hasPermission("ADMINISTRATOR"))
            return message.channel.send(`Managing admin roles forbidden`, { code: true });


        Role.findOrCreate({
            where: { server: message.guild.id, role: targetRole.id, type: "chapter_warning" }
        }).then(([role, created]) => {
            if (created) {
                message.channel.send(`Enabling access to role '${targetRole.name}'`, { code: false });
            }
            else {
                role.destroy().then(() => {
                    message.channel.send(`Removing access to role '${targetRole.name}'.\nRun this command again if you wanted to edit the role access.`, { code: true })
                })
            }
        }).catch((err) => {
            console.log(err.message)
            throw err
        })
        


    },
};