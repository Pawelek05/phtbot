// commands/config.js
const GuildConfig = require("../models/GuildConfig");
const isOwner = require("../utils/isOwner");
const { startForGuild, stopForGuild } = require("../systems/scrambleManager");

function extractIdFromMention(mention) {
  if (!mention) return null;
  // channel: <#id>, role: <@&id>, user: <@!id>
  const m = mention.match(/<[@#&!]?!?&?(\d+)>/);
  if (m) return m[1];
  // if raw id
  if (/^\d{5,}$/.test(mention)) return mention;
  return null;
}

module.exports = {
  name: "config",
  description: "Server configuration (owner only)",
  // message = Message-like object (we also accept the fakeMessage built for slash)
  async execute(message, args = []) {
    try {
      // allow being called with an `interaction` object too -> we expect index.js to pass same fakeMessage
      // check permissions (owner)
      if (!isOwner(message)) return message.reply("Only the server owner can use config commands.");

      // args: array of strings (from prefix command split OR built from interaction options)
      const sub = args[0];
      if (!sub) return message.reply("Usage: config <prefix|leveling|levelrole|announce|channelxp|scramble> ...");

      // Use atomic upsert where possible for prefix; for others get-or-create
      let cfg = await GuildConfig.findOne({ guildId: message.guild.id });
      if (!cfg) cfg = await GuildConfig.create({ guildId: message.guild.id });

      // ---------- prefix ----------
      if (sub === "prefix") {
        const newP = args[1];
        if (!newP) return message.reply("Provide a prefix, e.g. `config prefix ?`.");
        const updated = await GuildConfig.findOneAndUpdate(
          { guildId: message.guild.id },
          { $set: { prefix: newP } },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        return message.reply(`✅ Prefix set to \`${updated.prefix}\``);
      }

      // ---------- leveling on/off ----------
      if (sub === "leveling") {
        const op = args[1];
        if (!op) return message.reply("Usage: config leveling on|off");
        cfg.features.set("leveling", op === "on");
        await cfg.save();
        return message.reply(`✅ Leveling ${op === "on" ? "enabled" : "disabled"}`);
      }

      // ---------- levelrole ----------
      if (sub === "levelrole") {
        const level = args[1];
        let roleId = args[2];
        if (!level || !roleId) return message.reply("Usage: config levelrole <level> <roleId|@roleMention>");
        roleId = extractIdFromMention(roleId) || roleId;
        cfg.levelRoles.set(String(level), roleId);
        await cfg.save();
        return message.reply(`✅ Role <@&${roleId}> will be awarded at level ${level}`);
      }

      // ---------- announce channel ----------
      if (sub === "announce") {
        let channelId = args[1];
        if (!channelId) return message.reply("Usage: config announce <channelId|#channel|off>");
        if (channelId === "off") {
          cfg.levelAnnounceChannel = null;
          await cfg.save();
          return message.reply(`✅ Level announce channel disabled`);
        }
        channelId = extractIdFromMention(channelId) || channelId;
        cfg.levelAnnounceChannel = channelId;
        await cfg.save();
        return message.reply(`✅ Level announce channel set to <#${channelId}>`);
      }

      // ---------- channel xp ----------
      if (sub === "channelxp") {
        const op = args[1];
        if (!op) return message.reply("Usage: config channelxp add|remove|enable|disable <channelId> <xp>");
        if (op === "add") {
          let channelId = args[2];
          const xp = Number(args[3] || 0);
          if (!channelId || !xp) return message.reply("Usage: config channelxp add <channelId> <xp>");
          channelId = extractIdFromMention(channelId) || channelId;
          cfg.channelXP.set(channelId, xp);
          await cfg.save();
          return message.reply(`✅ ${xp} XP will be granted for messages in <#${channelId}>`);
        }
        if (op === "remove") {
          let channelId = args[2];
          if (!channelId) return message.reply("Usage: config channelxp remove <channelId>");
          channelId = extractIdFromMention(channelId) || channelId;
          cfg.channelXP.delete(channelId);
          await cfg.save();
          return message.reply(`✅ Channel XP removed for <#${channelId}>`);
        }
        if (op === "enable" || op === "disable") {
          cfg.channelXPEnabled = (op === "enable");
          await cfg.save();
          return message.reply(`✅ Channel XP ${cfg.channelXPEnabled ? "enabled" : "disabled"}`);
        }
      }

      // ---------- scramble game ----------
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
          let ch = args[2];
          if (!ch) return message.reply("Provide channelId");
          ch = extractIdFromMention(ch) || ch;
          cfg.scrambleChannel = ch;
          await cfg.save();
          startForGuild(message.client, cfg);
          return message.reply(`✅ Scramble channel set to <#${ch}>`);
        }
        if (op === "interval") {
          const val = Number(args[2]); if (!val) return message.reply("Provide seconds");
          cfg.scrambleInterval = val; await cfg.save(); return message.reply(`✅ Scramble interval set to ${val}s`);
        }
        if (op === "xp") {
          const val = Number(args[2]); if (!val) return message.reply("Provide xp");
          cfg.scrambleXP = val; await cfg.save(); return message.reply(`✅ Scramble XP set to ${val}`);
        }
        if (op === "timeout") {
          const val = Number(args[2]); if (!val) return message.reply("Provide seconds");
          cfg.scrambleTimeout = val; await cfg.save(); return message.reply(`✅ Scramble timeout set to ${val}s`);
        }
      }

      return message.reply("Unknown subcommand. Use `config <prefix|leveling|levelrole|announce|channelxp|scramble>`.");
    } catch (err) {
      console.error("Config command error:", err);
      return message.reply("An error occurred while processing the config command.");
    }
  }
};
