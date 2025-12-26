const User = require("../models/User");

module.exports = async (message, xpAmount) => {
  let user = await User.findOne({
    guildId: message.guild.id,
    userId: message.author.id
  });

  if (!user) {
    user = await User.create({
      guildId: message.guild.id,
      userId: message.author.id
    });
  }

  user.xp += xpAmount;

  const nextLevelXP = user.level * 100;
  if (user.xp >= nextLevelXP) {
    user.level++;
    message.channel.send(
      `🎉 ${message.author} leveled up to **${user.level}**!`
    );
  }

  await user.save();
};
