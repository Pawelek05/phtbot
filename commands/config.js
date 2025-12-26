const GuildConfig = require("../models/GuildConfig");
const isOwner = require("../utils/isOwner");

module.exports = {
  name: "config",
  async execute(message, args) {
    if (!isOwner(message)) return;

    let config = await GuildConfig.findOne({ guildId: message.guild.id });

if (args[0] === "prefix") {
  if (!args[1]) return message.reply("❌ Please provide a prefix");
  
  if (!config) {
    config = await GuildConfig.create({ guildId: message.guild.id, prefix: args[1] });
  } else {
    config.prefix = args[1];
    await config.save();
  }

  message.reply(`✅ Prefix updated to: ${args[1]}`);
}


    if (args[0] === "summary") {
      message.channel.send(
        `Prefix: ${config.prefix}
Leveling: ${config.levelingEnabled}
Scramble: ${config.scrambleEnabled}`
      );
    }
  }
};
