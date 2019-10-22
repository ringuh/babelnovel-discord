const { botPermission } = require('../funcs/commandTools')

module.exports = {
    name: ['cmds'],
    description: 'Lists available commands',
    args: false,
    execute(message, args) {
        path = require('path')
        var reply = [`Available ${global.config.prefix}${this.name[0]}:`]
        const dirs = (fPath) => {
            
            const folders = require('fs').readdirSync(fPath, { withFileTypes: true }).filter(file => file.isDirectory() && file.name !== 'hidden');
            const commandFiles = require('fs').readdirSync(fPath, { withFileTypes: true }).filter(file => file.name.endsWith('.js'));
            
            for (const file of commandFiles) {
                const cmd = require(path.join(fPath, file.name));
                if(botPermission(message, cmd.permissions, true))
                    reply.push(`${cmd.name.join(" / ")} ${cmd.args ? cmd.args+" --": '--'} ${cmd.description}`)
            }

            folders.forEach(folder => {
                reply.push("", folder.name, "-------")
                dirs(require('path').join(fPath, folder.name))
            })            
            
        };

        dirs(path.join(appRoot, "commands"))
        
        message.channel.send(reply.join("\n"), { code: true })

    },
};