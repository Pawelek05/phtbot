const { Schema, model } = require("mongoose");


const guildSchema = new Schema({
guildId: { type: String, required: true, unique: true },
prefix: { type: String, default: "!" },


// Leveling
levelingEnabled: { type: Boolean, default: true },
xpPerLevel: { type: Number, default: 100 }, // base XP required multiplier
customLevelXP: { type: Map, of: Number }, // explicit xp needed per level
levelRoles: { type: Map, of: String }, // level -> roleId
levelAnnounceChannel: { type: String, default: null },


// Channel XP
channelXPEnabled: { type: Boolean, default: true },
channelXP: { type: Map, of: Number }, // channelId -> xp per message


// Scramble game
scrambleEnabled: { type: Boolean, default: false },
scrambleChannel: { type: String, default: null },
scrambleInterval: { type: Number, default: 300 }, // seconds
scrambleXP: { type: Number, default: 50 },
scrambleTimeout: { type: Number, default: 30 }, // seconds


// feature toggles
features: {
type: Map,
of: Boolean,
default: {
leveling: true,
channelXP: true,
scramble: false
}
}
});


module.exports = model("GuildConfig", guildSchema);