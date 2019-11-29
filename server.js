global.config = require('./config.json');
global.config.db = global.config[global.config.db]
const { prefix, discord_token, bypass_bots, numerics } = global.config;
Object.keys(global.config.numerics).forEach(k => {
    if (k.endsWith("_seconds")) global.config.numerics[k] *= 1000
    else if (k.endsWith("_minutes")) global.config.numerics[k] *= 60 * 1000
    else if (k.endsWith("_hours")) global.config.numerics[k] *= 60 * 60 * 1000
    else if (k.endsWith("_days")) global.config.numerics[k] *= 24 * 60 * 60 * 1000
})
const { launchBrowser } = require('./funcs/babelNovel')
const { Client, Collection, Message } = require('discord.js');
const fs = require('fs');
const path = require('path')
const { botPermission } = require('./funcs/commandTools')
const client = new Client();
client.commands = new Collection();

const db = require('./models')

Message.prototype.Expire = async function (prevMsg, keep, expire = numerics.epub_lifespan_seconds) {
    if (prevMsg) {
        await prevMsg.channel.stopTyping(true)
        prevMsg.delete(expire).catch(err => null)
    }
    if (!keep) this.delete(expire).catch(err => null)

};


const loadCommands = (fPath) => {
    const folders = fs.readdirSync(fPath, { withFileTypes: true }).filter(file => file.isDirectory());
    const commandFiles = fs.readdirSync(fPath, { withFileTypes: true }).filter(file => file.name.endsWith('.js'));

    for (const file of commandFiles) {
        const command = require(path.join(fPath, file.name));
        command.name.forEach(al => client.commands.set(al, command))
    }

    folders.forEach(folder => {
        loadCommands(require('path').join(fPath, folder.name))
    })


};
loadCommands(path.join(__dirname, "commands"))

client.once('ready', async () => {
    console.log('Discord bot running!');
    const commandJs = require('./commands/commands')
    client.user.setActivity(`${prefix}${commandJs.name[0]}`, { type: "LISTENING" });
    await launchBrowser()
});

client.on('message', message => {

    // ignore non-prefix and other bots excluding REPEAT BOT 621467973122654238
    if (!message.content.startsWith(prefix) ||
        (message.author.bot &&
            (!bypass_bots.includes(message.author.id)
                || message.author.id === client.user.id
            )
        )
    )
        return;
    // mobile discord wants to offer ! command instead of !command
    if (message.content.startsWith(`${prefix} `))
        message.content = message.content.replace(`${prefix} `, prefix)

    let args = message.content.slice(prefix.length).split(/ +/);
    let parameters = []
    if (args.includes("|"))
        parameters = args.splice(args.indexOf("|"), args.length).slice(1)

    const command = args.shift().toLowerCase();

    if (!client.commands.has(command)) return;

    try {
        let cmd = client.commands.get(command)
        if (botPermission(message, cmd.permissions))
            cmd.execute(message, args, parameters);
    } catch (error) {
        console.error(error.message);
        message.reply('there was an error trying to execute that command!');
    }
});

client.login(discord_token).catch(err => console.log(err.message))


