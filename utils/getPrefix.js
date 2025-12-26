const GuildConfig = require("../models/GuildConfig");
module.exports = async (guildId) => {
if (!guildId) return "!";
let cfg = await GuildConfig.findOne({ guildId });
if (!cfg) {
cfg = await GuildConfig.create({ guildId });
}
return cfg.prefix || "!";
};