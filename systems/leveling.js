// systems/leveling.js
const User = require("../models/User");
const GuildConfig = require("../models/GuildConfig");

async function xpToNextLevel(user) {
  const cfg = await GuildConfig.findOne({ guildId: user.guildId });
  const custom = cfg?.customLevelXP?.get(String(user.level + 1));
  if (custom) return custom;
  const base = cfg?.xpPerLevel || 100;
  return user.level * base;
}

module.exports = async function grantXP(message, amount) {
  try {
    const guildId = message.guild.id;
    const userId = message.author.id;

    let user = await User.findOne({ guildId, userId });
    if (!user) user = await User.create({ guildId, userId });

    user.xp += amount;
    const needed = await xpToNextLevel(user);
    if (user.xp >= needed) {
      user.xp -= needed;
      user.level++;
      await user.save();

      // role reward
      const cfg = await GuildConfig.findOne({ guildId });
      const roleId = cfg?.levelRoles?.get(String(user.level));
      if (roleId) {
        const guild = message.guild;
        const member = await guild.members.fetch(userId).catch(() => null);
        if (member) {
          member.roles.add(roleId).catch(() => null);
        }
      }

      // announce
      if (cfg?.levelAnnounceChannel) {
        const ch = await message.client.channels.fetch(cfg.levelAnnounceChannel).catch(() => null);
        if (ch && ch.isTextBased()) {
          const embed = {
            title: "Level Up!",
            description: `<@${userId}> reached level **${user.level}**!`,
            color: 0x57F287
          };
          ch.send({ embeds: [embed] }).catch(() => null);
        }
      }

      return { leveled: true, newLevel: user.level };
    }

    await user.save();
    return { leveled: false };
  } catch (err) {
    console.error("Leveling error:", err);
    return { leveled: false };
  }
};
