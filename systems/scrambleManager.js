const GuildConfigModel = require("../models/GuildConfig");


// In-memory trackers
const timers = new Map(); // guildId -> intervalId
const active = new Map(); // guildId -> {word, collector}


const WORDS = ["apple","banana","orange","computer","language","school","teacher","student","puzzle","window","keyboard","program"];


function scrambleWord(word) {
return word.split("").sort(() => 0.5 - Math.random()).join("");
}


async function startForGuild(client, cfg) {
if (!cfg.scrambleEnabled || !cfg.scrambleChannel) return;
const guildId = cfg.guildId;
if (timers.has(guildId)) clearInterval(timers.get(guildId));


const run = async () => {
try {
if (active.has(guildId)) return; // previous still active
const channel = await client.channels.fetch(cfg.scrambleChannel).catch(() => null);
if (!channel || !channel.isTextBased()) return;


const word = WORDS[Math.floor(Math.random() * WORDS.length)];
const scrambled = scrambleWord(word);
const msg = await channel.send(`🔤 Unscramble: **${scrambled}**`);


const filter = (m) => m.content.toLowerCase().trim() === word && !m.author.bot;
const collector = channel.createMessageCollector({ filter, time: (cfg.scrambleTimeout || 30) * 1000 });


active.set(guildId, { word, collector });


collector.on("collect", async (m) => {
// first collector wins
if (!active.has(guildId)) return;
active.delete(guildId);
collector.stop();
await channel.send(`✅ ${m.author} guessed correctly and earned ${cfg.scrambleXP || 50} XP!`);
// give xp
const leveling = require("./leveling");
await leveling(m, cfg.scrambleXP || 50);
});


collector.on("end", (collected) => {
active.delete(guildId);
if (collected.size === 0) channel.send(`⏰ Time's up! The word was **${word}**`);
});


} catch (e) { console.error("scramble run error", e); }
};


// Start immediately then every interval
run();
const id = setInterval(run, (cfg.scrambleInterval || 300) * 1000);
timers.set(guildId, id);
}


async function stopForGuild(guildId) {
if (timers.has(guildId)) {
clearInterval(timers.get(guildId));
timers.delete(guildId);
}
if (active.has(guildId)) {
const { collector } = active.get(guildId);
collector?.stop();
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