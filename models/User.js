const { Schema: S, model: M } = require("mongoose");


const userSchema = new S({
guildId: String,
userId: String,
xp: { type: Number, default: 0 },
level: { type: Number, default: 1 }
});
userSchema.index({ guildId: 1, userId: 1 }, { unique: true });
module.exports = M("User", userSchema);