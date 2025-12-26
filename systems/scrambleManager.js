const { EmbedBuilder } = require("discord.js");
const GuildConfigModel = require("../models/GuildConfig");

// In-memory trackers
const timers = new Map(); // guildId -> intervalId
const active = new Map(); // guildId -> { word, collector }

const WORDS = [
  "apple","banana","orange","computer","language",
  "school","teacher","student","puzzle","window",
  "keyboard","program"
];

function scrambleWord(word) {
  return word.split("").sort(() => 0.5 - Math.random()).join("");
}

function formatTime(seconds) {
  if (!seconds) return "30s";
  if (seconds % 3600 === 0) return `${seconds / 3600}h`;
  if (seconds % 60 === 0) return `${seconds / 60}m`;
  return `${seconds}s`;
}

async function startForGuild(client, cfg) {
  if (!cfg.scrambleEnabled || !cfg.scrambleChannel) return;

  const guildId = cfg.guildId;

  // prevent double intervals
  if (timers.has(guildId)) {
    clearInterval(timers.get(guildId));
    timers.delete(guildId);
  }

  const run = async () => {
    try {
      if (active.has(guildId)) return;

      const channel = await client.channels.fetch(cfg.scrambleChannel).catch(() => null);
      if (!channel || !channel.isTextBased()) return;

      const word = WORDS[Math.floor(Math.random() * WORDS.length)];
      const scrambled = scrambleWord(word);

      const timeoutSec = cfg.scrambleTimeout || 30;
      const rewardXP = cfg.scrambleXP || 50;

      const embed = new EmbedBuilder()
        .setTitle("🧩 Scramble Challenge!")
        .setColor(0xF1C40F)
        .setDescription(
          `**Unscramble the word below** and send the correct answer in chat.\n\n` +
          `🔤 **Scrambled word:**\n\`\`\`${scrambled}\`\`\``
        )
        .addFields(
          { name: "⏳ Time limit", value: formatTime(timeoutSec), inline: true },
          { name: "🎁 Reward", value: `${rewardXP} XP`, inline: true }
        )
        .setFooter({ text: "First correct answer wins!" });

      await channel.send({ embeds: [embed] });

      const filter = (m) =>
        m.content.toLowerCase().trim() === word && !m.author.bot;

      const collector = channel.createMessageCollector({
        filter,
        time: timeoutSec * 1000
      });

      active.set(guildId, { word, collector });

      collector.on("collect", async (m) => {
        if (!active.has(guildId)) return;

        active.delete(guildId);
        collector.stop("winner");

        const winEmbed = new EmbedBuilder()
          .setColor(0x2ECC71)
          .setDescription(
            `✅ ${m.author} guessed the word **correctly**!\n\n` +
            `🏆 **Reward:** ${rewardXP} XP`
          );

        await channel.send({ embeds: [winEmbed] });

        const leveling = require("./leveling");
        await leveling(m, rewardXP);
      });

      collector.on("end", async (_, reason) => {
        active.delete(guildId);

        if (reason !== "winner") {
          const loseEmbed = new EmbedBuilder()
            .setColor(0xE74C3C)
            .setDescription(
              `⏰ Time's up!\n\nThe correct word was: **${word}**`
            );
          await channel.send({ embeds: [loseEmbed] });
        }
      });

    } catch (e) {
      console.error("Scramble run error:", e);
    }
  };

  // run immediately + interval
  run();
  const intervalSec = cfg.scrambleInterval || 300;
  const id = setInterval(run, intervalSec * 1000);
  timers.set(guildId, id);
}

async function stopForGuild(guildId) {
  if (timers.has(guildId)) {
    clearInterval(timers.get(guildId));
    timers.delete(guildId);
  }

  if (active.has(guildId)) {
    const { collector } = active.get(guildId);
    collector?.stop("stopped");
    active.delete(guildId);
  }
}

async function restartAll(client) {
  const configs = await GuildConfigModel.find({ 'features.scramble': true });
  for (const cfg of configs) {
    startForGuild(client, cfg);
  }
}

module.exports = { startForGuild, stopForGuild, restartAll };
