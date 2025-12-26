// utils/getOrCreateConfig.js
const GuildConfig = require("../models/GuildConfig");

async function getOrCreateConfig(guildId) {
  if (!guildId) return null;
  let cfg = await GuildConfig.findOne({ guildId });
  if (!cfg) {
    cfg = await GuildConfig.create({
      guildId,
      // upewnij się, że Map'y są zainicjowane jako pusty obiekt/mapa
      features: { leveling: true, channelXP: true, scramble: false },
      channelXP: {},
      levelRoles: {}
    });
  }
  // normalize: ensure Map-like objects exist
  if (!cfg.features) cfg.features = new Map(Object.entries({ leveling: true, channelXP: true, scramble: false }));
  if (!cfg.channelXP || !(cfg.channelXP instanceof Map)) {
    // if mongoose returned plain object, convert to Map if needed
    try { cfg.channelXP = new Map(Object.entries(cfg.channelXP || {})); } catch(e) { cfg.channelXP = new Map(); }
  }
  if (!cfg.levelRoles || !(cfg.levelRoles instanceof Map)) {
    try { cfg.levelRoles = new Map(Object.entries(cfg.levelRoles || {})); } catch(e) { cfg.levelRoles = new Map(); }
  }
  return cfg;
}

module.exports = getOrCreateConfig;
