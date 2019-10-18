module.exports = {
    name: ['commands', 'list', 'cmd', 'cmds', 'command'],
    description: 'Lists available commands',
    args: false,
    execute(message, args) {
        path = require('path')
        var reply = ["Available !commands:"]
        const dirs = (fPath) => {
            
            const folders = require('fs').readdirSync(fPath, { withFileTypes: true }).filter(file => file.isDirectory());
            const commandFiles = require('fs').readdirSync(fPath, { withFileTypes: true }).filter(file => file.name.endsWith('.js'));
            
            for (const file of commandFiles) {
                const command = require(path.join(fPath, file.name));
                reply.push(`${command.name.join(" / ")} ${command.args+' ' || ''}-- ${command.description}`)
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