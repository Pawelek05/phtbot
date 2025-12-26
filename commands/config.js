const GuildConfig = require("../models/GuildConfig");
const isOwner = require("../utils/isOwner");

module.exports = {
  name: "config",
  async execute(message, args) {
    if (!isOwner(message)) return;

    let config = await GuildConfig.findOne({ guildId: message.guild.id });

    if (args[0] === "prefix") {
      config.prefix = args[1];
      await config.save();
      message.reply("✅ Prefix updated");
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
