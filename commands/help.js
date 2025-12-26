// commands/help.js
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');

module.exports = {
  name: 'help',
  description: 'Show help with pagination and server feature status',
  async execute(message, args) {
    const guildId = message.guild?.id;
    let cfg = null;
    if (guildId) {
      cfg = await GuildConfig.findOne({ guildId });
      if (!cfg) cfg = await GuildConfig.create({ guildId });
    }

    const prefix = cfg?.prefix || "!";

    const feature = (key, fallback) => {
      if (!cfg) return fallback ?? false;
      const mapVal = cfg.features?.get(key);
      if (typeof mapVal === 'boolean') return mapVal;
      if (key === 'leveling') return cfg.levelingEnabled ?? fallback ?? false;
      if (key === 'channelXP') return cfg.channelXPEnabled ?? fallback ?? false;
      if (key === 'scramble') return cfg.scrambleEnabled ?? fallback ?? false;
      return fallback ?? false;
    };

    const pages = [
      {
        title: 'General',
        desc:
`${prefix}help - show this help. Use buttons to navigate.

You can use slash commands (registered on guilds) or prefix commands.
Example: \`${prefix}level\` or use the slash command \`/level\`.`
      },
      {
        title: 'Leveling',
        desc:
`${prefix}level - show your level (image/embed)
${prefix}leaderboard - show top 10 users (level + XP)
${prefix}config leveling on|off - enable/disable leveling (owner only)
${prefix}config levelrole <level> <roleId> - award role at a level
${prefix}config announce <channelId|off> - set channel for level announcements`
      },
      {
        title: 'Channel XP',
        desc:
`${prefix}config channelxp add <channelId> <xp> - grant XP per message on channel
${prefix}config channelxp remove <channelId> - remove channel XP
${prefix}config channelxp enable|disable - toggle channel XP feature`
      },
      {
        title: 'Scramble Game',
        desc:
`${prefix}config scramble on|off - enable/disable scramble game (owner only)
${prefix}config scramble channel <channelId> - set scramble channel
${prefix}config scramble interval <seconds> - set how often a scrambled word appears
${prefix}config scramble xp <amount> - XP reward for correct answer
${prefix}config scramble timeout <seconds> - how long a scramble stays active`
      },
      {
        title: 'Server Feature Status',
        desc:
`Leveling: ${feature('leveling') ? '✅ Enabled' : '❌ Disabled'}
Channel XP: ${feature('channelXP') ? '✅ Enabled' : '❌ Disabled'}
Scramble Game: ${feature('scramble') ? '✅ Enabled' : '❌ Disabled'}

Config commands: 👑 Owner-only (server owner) - only owner can change bot config.`
      }
    ];

    let page = 0;
    const embed = new EmbedBuilder()
      .setTitle(pages[page].title)
      .setDescription(pages[page].desc)
      .setColor(0x5865F2)
      .setFooter({ text: `Page ${page + 1} / ${pages.length}` });

    const back = new ButtonBuilder().setCustomId('help_back').setLabel('⬅️ Back').setStyle(ButtonStyle.Secondary).setDisabled(true);
    const next = new ButtonBuilder().setCustomId('help_next').setLabel('Next ➡️').setStyle(ButtonStyle.Primary);
    const row = new ActionRowBuilder().addComponents(back, next);

    const msg = await message.channel.send({ embeds: [embed], components: [row] });

    const collector = msg.createMessageComponentCollector({ time: 2 * 60 * 1000 });
    collector.on('collect', async (i) => {
      if (i.user.id !== message.author.id) return i.reply({ content: 'This help session is not for you', ephemeral: true });
      if (i.customId === 'help_next') page = Math.min(pages.length - 1, page + 1);
      if (i.customId === 'help_back') page = Math.max(0, page - 1);
      back.setDisabled(page === 0);
      next.setDisabled(page === pages.length - 1);
      embed.setTitle(pages[page].title).setDescription(pages[page].desc).setFooter({ text: `Page ${page + 1} / ${pages.length}` });
      await i.update({ embeds: [embed], components: [row] });
    });

    collector.on('end', () => { try { msg.edit({ components: [] }); } catch (e) {} });
  }
};