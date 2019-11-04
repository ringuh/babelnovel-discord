const Discord = require('discord.js');
const fs = require('fs');
global.config = require('./config.json');
const path = require('path')
global.appRoot = path.resolve(__dirname);
const { BabelNovel } = require('./funcs/babelNovel')
const { botPermission } = require('./funcs/commandTools')
const client = new Discord.Client();
client.commands = new Discord.Collection();

//const database = require('./funcs/database')
//database.connection()
const db = require('./models')

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
loadCommands(path.join(appRoot, "commands"))

client.once('ready', () => {
    console.log('Discord bot running!');
    const commandJs = require('./commands/commands')
    client.user.setActivity(`${global.config.prefix}${commandJs.name[0]}`, { type: "LISTENING" });

    BabelNovel(client)



});

client.on('message', message => {
    // ignore non-prefix and other bots excluding REPEAT BOT 621467973122654238
    if (!message.content.startsWith(global.config.prefix) ||
        (message.author.bot && message.author.id !== "621467973122654238"))
        return;
    // mobile discord wants to offer ! command instead of !command
    if (message.content.startsWith(`${global.config.prefix} `))
        message.content = message.content.replace(`${global.config.prefix} `, global.config.prefix)

    let args = message.content.slice(global.config.prefix.length).split(/ +/);
    let parameters = []
    if(args.includes("|"))
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

client.login(global.config.discord_token);


