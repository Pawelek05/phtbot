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

function buildRemoveWarnsEmbed(targetUser, guildName, previousWarns, removedWarns, currentWarns) {
  return new EmbedBuilder()
    .setColor(0xe67e22)
    .setTitle('Warns Removed')
    .setDescription(`Warns have been updated for <@${targetUser.id}> on **${guildName}**.`)
    .addFields(
      { name: 'Previous warns', value: String(previousWarns) },
      { name: 'Removed warns', value: String(removedWarns) },
      { name: 'Current warns', value: String(currentWarns) }
    )
    .setTimestamp();
}

async function removeWarns(guildId, userId, amount) {
  const doc = await UserWarn.findOne({ guildId, userId });

  const previousWarns = doc?.warnCount || 0;

  if (previousWarns <= 0) {
    return {
      previousWarns: 0,
      removedWarns: 0,
      currentWarns: 0,
    };
  }

  if (!amount) {
    await UserWarn.deleteOne({ guildId, userId });
    return {
      previousWarns,
      removedWarns: previousWarns,
      currentWarns: 0,
    };
  }

  const removedWarns = Math.min(amount, previousWarns);
  const currentWarns = Math.max(0, previousWarns - removedWarns);

  if (currentWarns === 0) {
    await UserWarn.deleteOne({ guildId, userId });
  } else {
    doc.warnCount = currentWarns;
    await doc.save();
  }

  return {
    previousWarns,
    removedWarns,
    currentWarns,
  };
}

module.exports = {
  name: 'removewarns',
  aliases: ['removewarn', 'clearwarns'],
  description: 'Remove warns from a user.',
  data: new SlashCommandBuilder()
    .setName('removewarns')
    .setDescription('Remove warns from a user.')
    .addUserOption((option) =>
      option.setName('user').setDescription('User to update').setRequired(false)
    )
    .addStringOption((option) =>
      option.setName('userid').setDescription('User ID to update').setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName('amount')
        .setDescription('How many warns to remove. Leave empty to remove all warns.')
        .setMinValue(1)
        .setRequired(false)
    ),

  async execute(message) {
    if (!message.guild) {
      return message.reply('This command can only be used in a server.');
    }

    if (!canUseCommand(message.guild, message.author.id)) {
      return message.reply('Only the server owner or the bot owner can use this command.');
    }

    const reply = await message.reply(
      'Use **/removewarns** for the private on-channel result. Prefix commands cannot show a private on-channel panel.'
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
    const amount = interaction.options.getInteger('amount');
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

    const result = await removeWarns(interaction.guild.id, targetUser.id, amount);

    await interaction.reply({
      embeds: [
        buildRemoveWarnsEmbed(
          targetUser,
          interaction.guild.name,
          result.previousWarns,
          result.removedWarns,
          result.currentWarns
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  },
};