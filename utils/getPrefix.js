const GuildConfig = require("../models/GuildConfig");
const cache = new Map(); // guildId -> {prefix, expires}

module.exports = async (guildId) => {
  if (!guildId) return "!";
  const now = Date.now();
  const cached = cache.get(guildId);
  if (cached && cached.expires > now) return cached.prefix;

  let cfg = await GuildConfig.findOne({ guildId });
  if (!cfg) cfg = await GuildConfig.create({ guildId });

  const prefix = cfg.prefix || "!";
  cache.set(guildId, { prefix, expires: now + 5000 }); // 5s cache
  return prefix;
};
