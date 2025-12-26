// commands/leaderboard.js
const User = require("../models/User");
const GuildConfig = require("../models/GuildConfig");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "leaderboard",
  description: "Show top 10 users by level and XP",
  async execute(message, args) {
    try {
      const guildId = message.guild.id;

      // pobierz top 10: sortuj po level desc, xp desc
      const top = await User.find({ guildId })
        .sort({ level: -1, xp: -1 })
        .limit(10)
        .lean();

      if (!top || top.length === 0) {
        return message.channel.send("No leaderboard data yet.");
      }

      const cfg = (await GuildConfig.findOne({ guildId })) || {};
      const lines = [];
      let rank = 1;
      for (const u of top) {
        let name = u.userId;
        try {
          const member = await message.guild.members.fetch(u.userId).catch(() => null);
          if (member) name = member.user.username;
        } catch (e) {
          /* ignore */
        }

        // oblicz progress do następnego levelu (jeśli cfg istnieje)
        const nextXp =
          (cfg?.customLevelXP?.get && cfg?.customLevelXP?.get(String(u.level + 1))) ||
          ((cfg?.xpPerLevel || 100) * u.level);
        const xp = u.xp || 0;
        const percent = nextXp ? Math.round((Math.max(0, Math.min(1, xp / nextXp))) * 100) : 0;

        lines.push(
          `**#${rank}** • **${name}** — Level **${u.level}** (${xp} XP) • ${percent}% to next`
        );
        rank++;
      }

      const embed = new EmbedBuilder()
        .setTitle("Leaderboard — Top 10")
        .setDescription(lines.join("\n"))
        .setColor(0x57f287)
        .setFooter({ text: `Requested by ${message.author.username}` });

      await message.channel.send({ embeds: [embed] });
    } catch (err) {
      console.error("Leaderboard error:", err);
      message.channel.send("An error occurred while fetching the leaderboard.");
    }
  },
};
