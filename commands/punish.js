const {
  EmbedBuilder,
  SlashCommandBuilder,
} = require('discord.js');

const BOT_OWNER_ID = '743101635122954322';

const PUNISHMENTS = [
  {
    emoji: '1️⃣',
    title: 'Using commands in #general instead of #commands',
    reason: 'Using commands in #general instead of #commands',
    type: 'warn',
  },
  {
    emoji: '2️⃣',
    title: 'Using a language other than English',
    reason: 'Using a language other than English',
    type: 'warn',
  },
  {
    emoji: '3️⃣',
    title: 'Excessive pinging of the administration',
    reason: 'Excessive pinging of the administration',
    type: 'warn',
  },
  {
    emoji: '4️⃣',
    title: 'Spamming messages',
    reason: 'Spamming messages',
    type: 'warn',
  },
  {
    emoji: '5️⃣',
    title: 'Advertising applications from suspicious sources',
    reason: 'Advertising applications from suspicious sources',
    type: 'warn',
  },
  {
    emoji: '6️⃣',
    title: 'Insulting the administration',
    reason: 'Insulting the administration',
    type: 'timeout',
    durationMs: 3 * 24 * 60 * 60 * 1000, // 3 days
  },
  {
    emoji: '7️⃣',
    title: 'Spreading false information',
    reason: 'Spreading false information',
    type: 'warn',
  },
];

function extractUserId(text = '') {
  const match = text.match(/\d{17,20}/);
  return match ? match[0] : null;
}

function buildPanelEmbed(targetUser, moderatorTag) {
  return new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle('Punishment Panel')
    .setDescription(`Choose a punishment for <@${targetUser.id}> by reacting with a number below.`)
    .addFields(
      PUNISHMENTS.map((p) => ({
        name: `${p.emoji} ${p.title}`,
        value: p.type === 'warn'
          ? `Action: send \`?warn ${targetUser.id} ${p.reason}\``
          : 'Action: apply a **3-day timeout**',
      }))
    )
    .setFooter({ text: `Only ${moderatorTag} can use the reactions. Panel expires in 60 seconds.` })
    .setTimestamp();
}

function buildSuccessEmbed(targetUser, moderatorUser, punishment, actionText, dmSent) {
  return new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle('Punishment Applied')
    .setDescription(`Punishment has been applied to <@${targetUser.id}>.`)
    .addFields(
      { name: 'Selected option', value: `${punishment.emoji} ${punishment.title}` },
      { name: 'Reason', value: punishment.reason },
      { name: 'Action taken', value: actionText },
      { name: 'Private message sent', value: dmSent ? 'Yes' : 'No - user probably has DMs disabled' },
      { name: 'Moderator', value: `<@${moderatorUser.id}>` }
    )
    .setTimestamp();
}

function buildExpiredEmbed(targetUser) {
  return new EmbedBuilder()
    .setColor(0x95a5a6)
    .setTitle('Punishment Panel Expired')
    .setDescription(`No punishment was selected for <@${targetUser.id}> within 60 seconds.`)
    .setTimestamp();
}

function buildErrorEmbed(text) {
  return new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle('Punishment Error')
    .setDescription(text)
    .setTimestamp();
}

async function sendPunishmentDM(user, guildName, punishment) {
  const embed = new EmbedBuilder()
    .setColor(punishment.type === 'timeout' ? 0xe74c3c : 0xf39c12)
    .setTitle('Punishment Notice')
    .setDescription(`You have received a punishment on **${guildName}**.`)
    .addFields(
      {
        name: 'Punishment',
        value: punishment.type === 'timeout' ? '3-day timeout' : 'Warning',
      },
      {
        name: 'Reason',
        value: punishment.reason,
      }
    )
    .setTimestamp();

  try {
    await user.send({ embeds: [embed] });
    return true;
  } catch {
    return false;
  }
}

async function sendWarnCommand(channel, targetUserId, reason) {
  const warnMessage = await channel.send({
    content: `?warn ${targetUserId} ${reason}`,
    allowedMentions: { parse: [] },
  });

  setTimeout(async () => {
    try {
      await warnMessage.delete();
    } catch {}
  }, 2000);

  return `Sent \`?warn ${targetUserId} ${reason}\` and deleted it after 2 seconds.`;
}

async function createPunishPanel({
  client,
  guild,
  channel,
  moderatorUser,
  targetUserId,
  replyMessage,
}) {
  const isServerOwner = guild.ownerId === moderatorUser.id;
  const isBotOwner = moderatorUser.id === BOT_OWNER_ID;

  if (!isServerOwner && !isBotOwner) {
    const text = 'Only the server owner or the bot owner can use this command.';
    if (replyMessage.type === 'interaction') {
      return replyMessage.source.reply({ content: text, ephemeral: true });
    }
    return replyMessage.source.reply(text);
  }

  if (!targetUserId) {
    const text = 'Provide a user mention or a user ID.';
    if (replyMessage.type === 'interaction') {
      return replyMessage.source.reply({ content: text, ephemeral: true });
    }
    return replyMessage.source.reply(text);
  }

  const targetUser = await client.users.fetch(targetUserId).catch(() => null);
  if (!targetUser) {
    const text = 'User not found.';
    if (replyMessage.type === 'interaction') {
      return replyMessage.source.reply({ content: text, ephemeral: true });
    }
    return replyMessage.source.reply(text);
  }

  if (targetUser.bot && targetUser.id === client.user.id) {
    const text = 'You cannot use this command on this bot.';
    if (replyMessage.type === 'interaction') {
      return replyMessage.source.reply({ content: text, ephemeral: true });
    }
    return replyMessage.source.reply(text);
  }

  const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

  let panelMessage;

  if (replyMessage.type === 'interaction') {
    await replyMessage.source.reply({
      embeds: [buildPanelEmbed(targetUser, moderatorUser.tag)],
      ephemeral: false,
    });
    panelMessage = await replyMessage.source.fetchReply();
  } else {
    panelMessage = await channel.send({
      embeds: [buildPanelEmbed(targetUser, moderatorUser.tag)],
    });
  }

  for (const punishment of PUNISHMENTS) {
    try {
      await panelMessage.react(punishment.emoji);
    } catch {}
  }

  const collector = panelMessage.createReactionCollector({
    filter: (reaction, user) => {
      return (
        user.id === moderatorUser.id &&
        PUNISHMENTS.some((p) => p.emoji === reaction.emoji.name)
      );
    },
    time: 60_000,
    max: 1,
  });

  collector.on('collect', async (reaction) => {
    const selected = PUNISHMENTS.find((p) => p.emoji === reaction.emoji.name);
    if (!selected) return;

    try {
      let actionText = '';

      if (selected.type === 'warn') {
        actionText = await sendWarnCommand(channel, targetUser.id, selected.reason);
      } else if (selected.type === 'timeout') {
        if (!targetMember) {
          throw new Error('This user is not on the server, so a timeout cannot be applied.');
        }

        if (!targetMember.moderatable) {
          throw new Error('I cannot timeout this user. Check role hierarchy and Moderate Members permission.');
        }

        await targetMember.timeout(selected.durationMs, selected.reason);
        actionText = 'Applied a 3-day Discord timeout.';
      }

      const dmSent = await sendPunishmentDM(targetUser, guild.name, selected);

      try {
        await panelMessage.reactions.removeAll();
      } catch {}

      await panelMessage.edit({
        embeds: [buildSuccessEmbed(targetUser, moderatorUser, selected, actionText, dmSent)],
      });
    } catch (err) {
      try {
        await panelMessage.reactions.removeAll();
      } catch {}

      await panelMessage.edit({
        embeds: [buildErrorEmbed(`Failed to apply punishment.\n\n${err.message}`)],
      });
    }
  });

  collector.on('end', async (collected, reason) => {
    if (reason === 'time' && collected.size === 0) {
      try {
        await panelMessage.reactions.removeAll();
      } catch {}

      await panelMessage.edit({
        embeds: [buildExpiredEmbed(targetUser)],
      });
    }
  });
}

module.exports = {
  name: 'punish',
  aliases: ['punishpanel', 'ppanel'],

  data: new SlashCommandBuilder()
    .setName('punish')
    .setDescription('Open a punishment panel for a selected user.')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('User to punish')
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('userid')
        .setDescription('User ID to punish')
        .setRequired(false)
    ),

  async execute(message, args, client) {
    if (!message.guild) {
      return message.reply('This command can only be used in a server.');
    }

    const raw = args[0] || '';
    const targetUserId = extractUserId(raw);

    return createPunishPanel({
      client,
      guild: message.guild,
      channel: message.channel,
      moderatorUser: message.author,
      targetUserId,
      replyMessage: {
        type: 'message',
        source: message,
      },
    });
  },

  async executeSlash(interaction, client) {
    if (!interaction.guild) {
      return interaction.reply({
        content: 'This command can only be used in a server.',
        ephemeral: true,
      });
    }

    const selectedUser = interaction.options.getUser('user');
    const rawUserId = interaction.options.getString('userid');
    const targetUserId = selectedUser?.id || extractUserId(rawUserId || '');

    return createPunishPanel({
      client,
      guild: interaction.guild,
      channel: interaction.channel,
      moderatorUser: interaction.user,
      targetUserId,
      replyMessage: {
        type: 'interaction',
        source: interaction,
      },
    });
  },
};