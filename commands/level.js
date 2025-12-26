// commands/level.js
const User = require("../models/User");
const GuildConfig = require("../models/GuildConfig");
const { EmbedBuilder } = require('discord.js');

function progressBar(current, total, size = 20) {
  const ratio = Math.max(0, Math.min(1, current / total));
  const full = Math.round(ratio * size);
  return '▰'.repeat(full) + '▱'.repeat(size - full) + ` ${Math.round(ratio * 100)}%`;
}

module.exports = {
  name: "level",
  description: "Show your level",
  async execute(message, args) {
    const guildId = message.guild.id;
    const userId = args[0] ? args[0].replace(/[<@!>]/g, "") : message.author.id;
    const user = await User.findOne({ guildId, userId }) || { xp: 0, level: 1 };
    const cfg = await GuildConfig.findOne({ guildId });
    const next = (cfg?.customLevelXP?.get(String(user.level + 1))) || ((cfg?.xpPerLevel || 100) * user.level);
    const xp = user.xp || 0;
    const bar = progressBar(xp, next, 20);

    const member = await message.guild.members.fetch(userId).catch(() => null);
    const embed = new EmbedBuilder()
      .setTitle(`${member?.user?.username || 'User'}'s Level`)
      .addFields(
        { name: 'Level', value: String(user.level), inline: true },
        { name: 'XP', value: `${xp} / ${next}`, inline: true },
        { name: 'Progress', value: bar, inline: false }
      )
      .setColor(0x57F287);

    await message.channel.send({ embeds: [embed] });
  }
};
