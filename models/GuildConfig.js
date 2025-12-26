const { Schema, model } = require("mongoose");

const guildSchema = new Schema({
  guildId: String,
  prefix: { type: String, default: "!" },

  levelingEnabled: { type: Boolean, default: true },
  xpPerLevel: { type: Number, default: 100 },
  levelRoles: { type: Map, of: String },

  scrambleEnabled: { type: Boolean, default: false },
  scrambleChannel: String,
  scrambleXP: { type: Number, default: 50 },
  scrambleTimeout: { type: Number, default: 30 },

  channelXP: { type: Map, of: Number }
});

module.exports = model("GuildConfig", guildSchema);
