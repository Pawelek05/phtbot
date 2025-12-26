const leveling = require("./leveling");

module.exports = async (message, config) => {
  const xp = config.channelXP?.get(message.channel.id);
  if (!xp) return;

  leveling(message, xp);
};
