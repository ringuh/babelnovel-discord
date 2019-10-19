module.exports = {
    name: ['commands'],
    description: 'Lists available commands',
    args: false,
    execute(message, args) {
        path = require('path')
        var reply = ["Available !commands:"]
        const dirs = (fPath) => {
            
            const folders = require('fs').readdirSync(fPath, { withFileTypes: true }).filter(file => file.isDirectory());
            const commandFiles = require('fs').readdirSync(fPath, { withFileTypes: true }).filter(file => file.name.endsWith('.js'));
            
            for (const file of commandFiles) {
                const cmd = require(path.join(fPath, file.name));
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