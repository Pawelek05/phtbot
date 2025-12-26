module.exports = (message) =>
  message.guild.ownerId === message.author.id;
