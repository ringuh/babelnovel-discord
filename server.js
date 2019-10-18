const Discord = require('discord.js');
const fs = require('fs');
global.config = require('./config.json');
const path = require('path')
global.appRoot = path.resolve(__dirname);
const LatestChapters = require('./funcs/latest_chapters')
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
    client.user.setActivity(`${global.config.prefix}commands`, { type: "LISTENING" });

    LatestChapters(client)
    
    
    
});

client.on('message', message => {
    // ignore non-prefix and other bots excluding REPEAT BOT 621467973122654238
    if (!message.content.startsWith(global.config.prefix) ||
        (message.author.bot && message.author.id !== "621467973122654238"))
        return;

    const args = message.content.slice(global.config.prefix.length).split(/ +/);
    const command = args.shift().toLowerCase();

    if (!client.commands.has(command)) return;

    try {
        client.commands.get(command).execute(message, args);
    } catch (error) {
        console.error(error);
        message.reply('there was an error trying to execute that command!');
    }
});

client.login(global.config.discord_token);


