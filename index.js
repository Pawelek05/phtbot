require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const connectDB = require("./database");
const getPrefix = require("./utils/getPrefix");
const GuildConfig = require("./models/GuildConfig");
const channelXP = require("./systems/channelXP");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

connectDB();

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  const prefix = await getPrefix(message.guild.id);
  if (!message.content.startsWith(prefix)) {
    const config = await GuildConfig.findOne({ guildId: message.guild.id });
    if (config?.levelingEnabled)
      channelXP(message, config);
    return;
  }

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = require(`./commands/${commandName}.js`);
  if (command) command.execute(message, args, prefix);
});

client.login(process.env.TOKEN);
