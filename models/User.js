const { Schema, model } = require("mongoose");

const userSchema = new Schema({
  guildId: String,
  userId: String,
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 }
});

module.exports = model("User", userSchema);
