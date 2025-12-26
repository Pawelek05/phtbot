require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const connectDB = require('./database');
const fs = require('fs');
const path = require('path');
const GuildConfig = require('./models/GuildConfig');
const getPrefix = require('./utils/getPrefix');
const channelXP = require('./systems/channelXP');
const { restartAll } = require('./systems/scrambleManager');


const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
client.commands = new Collection();


// load message commands
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
const cmd = require(`./commands/${file}`);
client.commands.set(cmd.name, cmd);
}


async function main() {
await connectDB();


// register slash commands per guild on startup (for simplicity only for guilds bot is in)
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
const slashCommands = [];
for (const cmd of client.commands.values()) {
slashCommands.push({ name: cmd.name, description: cmd.description || 'No description' });
}


client.once('ready', async () => {
console.log('Logged in as', client.user.tag);


// register guild commands to speed up testing (for each guild)
for (const guild of client.guilds.cache.values()) {
try {
await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, guild.id), { body: slashCommands });
console.log('Registered slash commands for', guild.id);
} catch (e) { console.error('Slash register error', e.message); }
}


// start scramble timers for configured guilds
await restartAll(client);
});


client.on('messageCreate', async (message) => {
if (message.author.bot || !message.guild) return;


const prefix = await getPrefix(message.guild.id);
if (!message.content.startsWith(prefix)) {
// non-command messages -> channel XP
await channelXP(message);
return;
}


const args = message.content.slice(prefix.length).trim().split(/ +/);
const commandName = args.shift().toLowerCase();
const command = client.commands.get(commandName);
if (!command) return;
try { await command.execute(message, args); } catch (e) { console.error(e); message.reply('Command error'); }
});


// simple slash handling
client.on('interactionCreate', async (interaction) => {
if (!interaction.isChatInputCommand()) return;
const cmd = client.commands.get(interaction.commandName);
if (!cmd) return;
// bind a simple object to mimic message for commands that expect message (we kept message API)
const fakeMessage = { guild: interaction.guild, author: interaction.user, member: interaction.member, channel: interaction.channel, client, reply: (txt)=>interaction.reply(txt) };
try {
await cmd.execute(fakeMessage, []);
} catch (e) { console.error(e); interaction.reply({ content: 'Slash command error', ephemeral: true }); }
});


await client.login(process.env.TOKEN);
}


main().catch(err => { console.error(err); process.exit(1); });