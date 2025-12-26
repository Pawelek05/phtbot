const leveling = require("./leveling");

let currentWord = null;

module.exports = async (client, config) => {
  if (!config.scrambleEnabled) return;

  const channel = await client.channels.fetch(config.scrambleChannel);
  if (!channel) return;

  const words = ["apple", "banana", "orange", "computer"];
  const word = words[Math.floor(Math.random() * words.length)];

  const scrambled = word.split("").sort(() => 0.5 - Math.random()).join("");
  currentWord = word;

  channel.send(`🔤 Unscramble: **${scrambled}**`);

  const filter = (m) => m.content.toLowerCase() === word;
  const collector = channel.createMessageCollector({
    filter,
    time: config.scrambleTimeout * 1000
  });

  collector.on("collect", (msg) => {
    leveling(msg, config.scrambleXP);
    channel.send(`✅ ${msg.author} guessed correctly!`);
    collector.stop();
  });

  collector.on("end", (c) => {
    if (c.size === 0)
      channel.send(`⏰ Time's up! The word was **${word}**`);
  });
};
