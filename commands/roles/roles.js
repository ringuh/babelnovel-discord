const { Role } = require("../../models")
const path = require('path')
const fs = require('fs')

module.exports = {
    name: ['roles'],
    description: 'Lists all available roles',
    args: false,
    permissions: "MANAGE_ROLES",
    execute(message, args) {
        Role.findAll({ where: { server: message.guild.id } })
            .then(roles => {
                let str = [`Available roles:`]
                if (!roles.length)
                    str.push("\tno roles available")
                roles.map(listedRole => {
                    const role = message.guild.roles.get(listedRole.role)
                    if(!role) listedRole.destroy()
                    else str.push(`${role.name}`)
                });
                str.push('', "Available commands:")
                //str.push("!managerole <role> -- adds/removes role as available (admin)")
                const commandFiles = require('fs').readdirSync(__dirname, { withFileTypes: true })
                    .filter(file => file.name.endsWith('Role.js'));

                for (const file of commandFiles) {
                    const cmd = require(path.join(__dirname, file.name));
                    str.push(`${global.config.prefix}${cmd.name.join(" / ")} ${cmd.args ? cmd.args + " --" : '--'} ${cmd.description}`)
                }

                message.channel.send(str.join("\n"), { code: true });
            })
            .catch((err) => {
                console.log(err.message)
                throw err
            })
    },
};