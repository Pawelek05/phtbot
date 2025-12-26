const GuildConfig = require("../models/GuildConfig");
if (sub === "channelxp") {
const op = args[1];
if (!op) return message.reply("Usage: config channelxp add|remove|enable|disable <channelId> <xp>");
if (op === "add") {
const channelId = args[2];
const xp = Number(args[3] || 0);
if (!channelId || !xp) return message.reply("Usage: config channelxp add <channelId> <xp>");
cfg.channelXP.set(channelId, xp);
await cfg.save();
return message.reply(`✅ ${xp} XP will be granted for messages in <#${channelId}>`);
}
if (op === "remove") {
const channelId = args[2];
cfg.channelXP.delete(channelId);
await cfg.save();
return message.reply(`✅ Channel XP removed for ${channelId}`);
}
if (op === "enable" || op === "disable") {
cfg.channelXPEnabled = (op === "enable");
await cfg.save();
return message.reply(`✅ Channel XP ${cfg.channelXPEnabled ? "enabled" : "disabled"}`);
}
}


if (sub === "scramble") {
const op = args[1];
if (!op) return message.reply("Usage: config scramble on|off|channel <channelId>|interval <seconds>|xp <amount>|timeout <secs>");
if (op === "on") {
cfg.scrambleEnabled = true; cfg.features.set("scramble", true);
await cfg.save();
startForGuild(message.client, cfg);
return message.reply("✅ Scramble enabled for this server");
}
if (op === "off") {
cfg.scrambleEnabled = false; cfg.features.set("scramble", false);
await cfg.save();
stopForGuild(message.guild.id);
return message.reply("✅ Scramble disabled for this server");
}
if (op === "channel") {
const ch = args[2];
if (!ch) return message.reply("Provide channelId");
cfg.scrambleChannel = ch; await cfg.save();
startForGuild(message.client, cfg);
return message.reply(`✅ Scramble channel set to ${ch}`);
}
if (op === "interval") { const val = Number(args[2]); if (!val) return message.reply("Provide seconds"); cfg.scrambleInterval = val; await cfg.save(); return message.reply(`✅ Scramble interval set to ${val}s`); }
if (op === "xp") { const val = Number(args[2]); if (!val) return message.reply("Provide xp"); cfg.scrambleXP = val; await cfg.save(); return message.reply(`✅ Scramble XP set to ${val}`); }
if (op === "timeout") { const val = Number(args[2]); if (!val) return message.reply("Provide seconds"); cfg.scrambleTimeout = val; await cfg.save(); return message.reply(`✅ Scramble timeout set to ${val}s`); }
}


return message.reply("Unknown subcommand");
}
};