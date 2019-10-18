const { Role } = require("../../models")

module.exports = {
    name: ['roles'],
    description: 'Lists all roles',
    args: false,
    execute(message, args) {
        Role.findAll({ where: { server: message.guild.id } })
            .then(roles => {
                let str = [`Available roles:`]
                if(!roles.length)
                    str.push("\tno roles available")
                roles.map(listedRole => {
                    const role = message.guild.roles.get(listedRole.role)
                    str.push(`${role.name} ${!role ? `(NOT FOUND)` : ''}`)
                });
                str.push('', "Available commands:", "!requestrole <role> -- adds available role to user")
                str.push("!managerole <role> -- adds/removes role as available (admin)")
                message.channel.send(str.join("\n"), { code: true });
            })
            .catch((err) => {
                console.log(err.message)
                throw err
            })
    },
};