const leveling = require("./leveling");
const GuildConfig = require("../models/GuildConfig");


module.exports = async function handleMessageForXP(message) {
try {
const cfg = await GuildConfig.findOne({ guildId: message.guild.id });
if (!cfg) return;
if (!cfg.features?.get("channelXP")) return;
if (!cfg.channelXPEnabled) return;


const xp = cfg.channelXP?.get(message.channel.id) || 0;
if (!xp) return;


// Basic anti-spam / cooldown could be added; for now keep simple
await leveling(message, xp);
} catch (e) {
console.error("channelXP error:", e);
}
};