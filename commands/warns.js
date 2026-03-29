const {
  EmbedBuilder,
  SlashCommandBuilder,
  MessageFlags,
} = require('discord.js');
const UserWarn = require('../models/UserWarn');

const BOT_OWNER_ID = '743101635122954322';

function extractUserId(text = '') {
  const match = String(text).match(/\d{17,20}/);
  return match ? match[0] : null;
}

function canUseCommand(guild, userId) {
  return guild.ownerId === userId || userId === BOT_OWNER_ID;
}

function getNextThresholdInfo(warnCount) {
  if (warnCount < 2) return 'At 2 warns: 30-minute timeout';
  if (warnCount < 3) return 'At 3 warns: 2-hour timeout';
  if (warnCount < 4) return 'At 4 warns: 7-hour timeout';
  if (warnCount < 5) return 'At 5 warns: 1-day timeout';
  if (warnCount < 6) return 'At 6 warns: 3-day timeout';
  return 'Current highest tier: 3-day timeout';
}

function buildWarnsEmbed(targetUser, guildName, warnCount) {
  return new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle('User Warn Count')
    .setDescription(`Warn information for <@${targetUser.id}> on **${guildName}**.`)
    .addFields(
      { name: 'Total warns', value: String(warnCount) },
      { name: 'Next threshold', value: getNextThresholdInfo(warnCount) }
    )
    .setTimestamp();
}

module.exports = {
  name: 'warns',
  aliases: ['warnings', 'checkwarns'],
  description: 'Show how many warns a user has.',
  data: new SlashCommandBuilder()
    .setName('warns')
    .setDescription('Show how many warns a user has.')
    .addUserOption((option) =>
      option.setName('user').setDescription('User to check').setRequired(false)
    )
    .addStringOption((option) =>
      option.setName('userid').setDescription('User ID to check').setRequired(false)
    ),

  async execute(message) {
    if (!message.guild) {
      return message.reply('This command can only be used in a server.');
    }

    if (!canUseCommand(message.guild, message.author.id)) {
      return message.reply('Only the server owner or the bot owner can use this command.');
    }

    const reply = await message.reply(
      'Use **/warns** for the private on-channel result. Prefix commands cannot show a private on-channel panel.'
    ).catch(() => null);

    try {
      await message.delete();
    } catch {}

    if (reply) {
      setTimeout(() => {
        reply.delete().catch(() => {});
      }, 8000);
    }
  },

  async executeSlash(interaction, client) {
    if (!interaction.guild) {
      return interaction.reply({
        content: 'This command can only be used in a server.',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!canUseCommand(interaction.guild, interaction.user.id)) {
      return interaction.reply({
        content: 'Only the server owner or the bot owner can use this command.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const selectedUser = interaction.options.getUser('user');
    const rawUserId = interaction.options.getString('userid');
    const targetUserId = selectedUser?.id || extractUserId(rawUserId || '');

    if (!targetUserId) {
      return interaction.reply({
        content: 'Provide a user mention or a user ID.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const targetUser = await client.users.fetch(targetUserId).catch(() => null);
    if (!targetUser) {
      return interaction.reply({
        content: 'User not found.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const warnDoc = await UserWarn.findOne({
      guildId: interaction.guild.id,
      userId: targetUser.id,
    }).lean();

    const warnCount = warnDoc?.warnCount || 0;

    await interaction.reply({
      embeds: [buildWarnsEmbed(targetUser, interaction.guild.name, warnCount)],
      flags: MessageFlags.Ephemeral,
    });
  },
};