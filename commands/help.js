// commands/help.js
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const getOrCreateConfig = require('../utils/getOrCreateConfig');

module.exports = {
  name: 'help',
  description: 'Show help with pagination and server features status',
  async execute(message, args) {
    const guildId = message.guild?.id;
    const cfg = guildId ? await getOrCreateConfig(guildId) : null;

const feature = (key) => {
  if (!cfg) return false;
  if (cfg.features instanceof Map) return !!cfg.features.get(key);
  if (typeof cfg.features === 'object' && cfg.features !== null) return !!cfg.features[key];
  return false;
};


    const prefix = cfg?.prefix || "!";

    const pages = [
      { title: 'General', desc: `${prefix}help - show this help. Use buttons to navigate.` },
      { title: 'Leveling', desc: `${prefix}level - show your level\n${prefix}leaderboard - top 10\n${prefix}config leveling on|off\n${prefix}config levelrole <level> <roleId>\n${prefix}config announce <channelId|off>` },
      { title: 'Channel XP', desc: `${prefix}config channelxp add <channelId> <xp>\n${prefix}config channelxp remove <channelId>\n${prefix}config channelxp enable|disable` },
      { title: 'Scramble Game', desc: `${prefix}config scramble on|off\n${prefix}config scramble channel <channelId>\n${prefix}config scramble interval <seconds>\n${prefix}config scramble xp <amount>\n${prefix}config scramble timeout <seconds>` },
      { title: 'Server Feature Status', desc:
        `Leveling: ${feature('leveling') ? '✅ Enabled' : '❌ Disabled'}\nChannel XP: ${feature('channelXP') ? '✅ Enabled' : '❌ Disabled'}\nScramble: ${feature('scramble') ? '✅ Enabled' : '❌ Disabled'}\n\nConfig commands: Owner-only.` }
    ];

    let page = 0;
    const embed = new EmbedBuilder().setTitle(pages[page].title).setDescription(pages[page].desc).setColor(0x5865F2).setFooter({ text: `Page ${page + 1} / ${pages.length}` });
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
    collector.on('end', () => { try { msg.edit({ components: [] }); } catch(e){} });
  }
};
