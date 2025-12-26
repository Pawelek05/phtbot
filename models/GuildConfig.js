const { Schema, model } = require("mongoose");

const guildSchema = new Schema({
  guildId: { type: String, required: true },
  
  // Domyślny prefix ustawiony na "!"
  prefix: { type: String, default: "!" },

  // System poziomów
  levelingEnabled: { type: Boolean, default: true },
  xpPerLevel: { type: Number, default: 100 },
  levelRoles: { type: Map, of: String }, // np. { "5": "RoleID" }

  // Scramble Game
  scrambleEnabled: { type: Boolean, default: false },
  scrambleChannel: { type: String, default: null },
  scrambleXP: { type: Number, default: 50 },
  scrambleTimeout: { type: Number, default: 30 }, // w sekundach

  // XP za wiadomości na kanałach
  channelXP: { type: Map, of: Number } // np. { "ChannelID": 10 }
});

// Jeśli dokument nie istnieje, automatycznie użyje wartości domyślnych
module.exports = model("GuildConfig", guildSchema);
