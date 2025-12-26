module.exports = {
  name: "help",
  execute(message, prefix) {
    message.channel.send(`
**English Learning Bot Help**

${prefix}level → Show your level
${prefix}config summary → Show server configuration

**Scramble Game**
- Guess the word faster than others to earn XP

Only server owner can use config commands.
`);
  }
};
