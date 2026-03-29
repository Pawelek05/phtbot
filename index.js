require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Collection,
  REST,
  Routes,
  Partials,
  MessageFlags,
} = require('discord.js');
const connectDB = require('./database');
const fs = require('fs');
const path = require('path');
const GuildConfig = require('./models/GuildConfig');
const getPrefix = require('./utils/getPrefix');
const channelXP = require('./systems/channelXP');
const { restartAll } = require('./systems/scrambleManager');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
  ],
});

client.commands = new Collection();

// load commands
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter((f) => f.endsWith('.js'));
for (const file of commandFiles) {
  const cmd = require(`./commands/${file}`);
  client.commands.set(cmd.name, cmd);

  if (Array.isArray(cmd.aliases)) {
    for (const alias of cmd.aliases) {
      client.commands.set(alias, cmd);
    }
  }
}

async function main() {
  await connectDB();

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  client.once('clientReady', async () => {
    console.log('Logged in as', client.user.tag);

    const slashCommands = [];
    const added = new Set();

    for (const cmd of client.commands.values()) {
      if (added.has(cmd.name)) continue;
      added.add(cmd.name);

      if (cmd.data && typeof cmd.data.toJSON === 'function') {
        slashCommands.push(cmd.data.toJSON());
      } else {
        slashCommands.push({
          name: cmd.name,
          description: cmd.description || 'No description',
        });
      }
    }

    for (const guild of client.guilds.cache.values()) {
      try {
        await rest.put(
          Routes.applicationGuildCommands(process.env.CLIENT_ID, guild.id),
          { body: slashCommands }
        );
        console.log('Registered slash commands for', guild.id);
      } catch (e) {
        console.error('Slash register error', e.message);
      }
    }

    await restartAll(client);
  });

  client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const prefix = await getPrefix(message.guild.id);

    if (!message.content.startsWith(prefix)) {
      await channelXP(message);
      return;
    }

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();
    const command = client.commands.get(commandName);
    if (!command) return;

    try {
      await command.execute(message, args, client);
    } catch (e) {
      console.error(e);
      message.reply('Command error').catch(() => {});
    }
  });

  client.on('interactionCreate', async (interaction) => {
    try {
      if (interaction.isButton()) {
        if (interaction.customId.startsWith('punish:')) {
          const punishCommand = client.commands.get('punish');
          if (punishCommand && typeof punishCommand.handleButton === 'function') {
            await punishCommand.handleButton(interaction, client);
          }
        }
        return;
      }

      if (!interaction.isChatInputCommand()) return;

      const cmd = client.commands.get(interaction.commandName);
      if (!cmd) return;

      if (typeof cmd.executeSlash === 'function') {
        await cmd.executeSlash(interaction, client);
        return;
      }

      const args = [];
      try {
        for (const opt of interaction.options.data) {
          if (opt.type === 1 && opt.options) {
            args.push(opt.name);
            for (const subOpt of opt.options) {
              args.push(subOpt.value ?? subOpt.name);
            }
          } else {
            args.push(opt.value ?? opt.name);
          }
        }
      } catch {}

      const fakeMessage = {
        guild: interaction.guild,
        author: interaction.user,
        member: interaction.member,
        channel: interaction.channel,
        client,
        reply: (contentOrOptions) => {
          if (typeof contentOrOptions === 'string') {
            return interaction.reply({
              content: contentOrOptions,
              fetchReply: true,
            });
          }

          return interaction.reply({
            ...contentOrOptions,
            fetchReply: true,
          });
        },
      };

      await cmd.execute(fakeMessage, args, client);
    } catch (e) {
      console.error('Interaction error:', e);
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: 'Interaction error',
            flags: MessageFlags.Ephemeral,
          });
        } else {
          await interaction.reply({
            content: 'Interaction error',
            flags: MessageFlags.Ephemeral,
          });
        }
      } catch {}
    }
  });

  await client.login(process.env.TOKEN);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});