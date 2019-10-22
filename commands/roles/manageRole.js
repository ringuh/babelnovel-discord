
const { isAdmin, usageMessage } = require('../../funcs/commandTools')
const { StripMentions } = require('../../funcs/mentions.js')
const { Role } = require("../../models")

module.exports = {
    name: ['managerole'],
    description: 'Toggles role request availability (admin)',
    args: "<role>",
    permissions: ["MANAGE_ROLES"],
    async execute(message, args) {

        if (!isAdmin(message)) return false
        if (args.length < 1) return usageMessage(message, this)

        let [roleStr, userMentions, channelMentions, roleMentions] = StripMentions(message.guild, args)
        const targetRole = roleMentions[0] || message.guild.roles.find(r => r.name.toLowerCase() == roleStr.toLowerCase())
        if (!targetRole) return message.channel.send(`Role '${roleStr}' not found`, { code: true });

        if (targetRole.hasPermission("ADMINISTRATOR"))
            return message.channel.send(`Managing admin roles is forbidden`, { code: true });

        const error = await targetRole.edit({ color: targetRole.color })
            .then(updated => null)
            .catch(err => err);
        if(error){
            return message.channel.send(`${error.message}. Role '${targetRole.name}' is propably higher in the hierarchy than your bot `, { code: true });
        }
            
        Role.findOrCreate({
            where: { server: message.guild.id, role: targetRole.id, type: "chapter_warning" }
        }).then(([role, created]) => {
            if (created) {
                message.channel.send(`Enabling access to role ${targetRole}`, { code: false });
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