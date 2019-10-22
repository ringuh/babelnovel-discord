
const { isAdmin, usageMessage } = require('../../funcs/commandTools')
const manageRole = require('./manageRole')
//const { IsChannel } = require('../../funcs/mentions.js')
//const setting = require('../setting')

module.exports = {
    name: ['createrole'],
    description: 'Creates a new role (admin)',
    args: "<role_name>",
    permissions: ["MANAGE_ROLES"],
    async execute(message, args) {
        if (!isAdmin(message)) return false
        if (args.length < 1) return usageMessage(message, this)
        
        const name = args.join(" ").trim()
        const role_exists = message.guild.roles.some(role => role.name.toLowerCase() === name.toLowerCase());
        if (role_exists)
            return message.channel.send(`Role '${name}' already exists`, { code: true })

        message.guild.createRole({
            name: name,
            mentionable: true
        }, `Created by ${message.member}`
        ).then(role => {
            message.channel.send(`Role ${role} created`, { code: false })
            manageRole.execute(message, args)
        })
            
    },
};