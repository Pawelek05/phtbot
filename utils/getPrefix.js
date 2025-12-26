const GuildConfig = require("../models/GuildConfig");

module.exports = async (guildId) => {
  let config = await GuildConfig.findOne({ guildId });
  if (!config) {
    config = await GuildConfig.create({ guildId }); // domyślny prefix zostanie ustawiony
  }
  return config.prefix;
};
