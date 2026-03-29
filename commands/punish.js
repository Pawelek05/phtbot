const {
  EmbedBuilder,
  SlashCommandBuilder,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const UserWarn = require('../models/UserWarn');

const BOT_OWNER_ID = '743101635122954322';
const PANEL_TTL_MS = 60_000;

const activePanels = new Map();

const PUNISHMENTS = [
  {
    id: 1,
    title: 'Using commands in #general instead of #commands',
    reason: 'Using commands in #general instead of #commands',
  },
  {
    id: 2,
    title: 'Using a language other than English',
    reason: 'Using a language other than English',
  },
  {
    id: 3,
    title: 'Excessive pinging of the administration',
    reason: 'Excessive pinging of the administration',
  },
  {
    id: 4,
    title: 'Spamming messages',
    reason: 'Spamming messages',
  },
  {
    id: 5,
    title: 'Advertising applications from suspicious sources',
    reason: 'Advertising applications from suspicious sources',
  },
  {
    id: 6,
    title: 'Insulting the administration',
    reason: 'Insulting the administration',
  },
  {
    id: 7,
    title: 'Spreading false information',
    reason: 'Spreading false information',
  },
];

function extractUserId(text = '') {
  const match = String(text).match(/\d{17,20}/);
  return match ? match[0] : null;
}

function canUseCommand(guild, userId) {
  return guild.ownerId === userId || userId === BOT_OWNER_ID;
}

function getTimeoutDurationMs(warnCount) {
  if (warnCount >= 6) return 3 * 24 * 60 * 60 * 1000;
  if (warnCount === 5) return 24 * 60 * 60 * 1000;
  if (warnCount === 4) return 7 * 60 * 60 * 1000;
  if (warnCount === 3) return 2 * 60 * 60 * 1000;
  if (warnCount === 2) return 30 * 60 * 1000;
  return 0;
}

function formatDuration(ms) {
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (ms === 30 * minute) return '30 minutes';
  if (ms === 2 * hour) return '2 hours';
  if (ms === 7 * hour) return '7 hours';
  if (ms === 1 * day) return '1 day';
  if (ms === 3 * day) return '3 days';

  return `${Math.round(ms / minute)} minutes`;
}

function buildPanelEmbed(targetUser, guildName) {
  return new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle('Punishment Panel')
    .setDescription(
      [
        `Select a punishment for <@${targetUser.id}> using the buttons below.`,
        '',
        '**Every option adds 1 warn.**',
        '',
        'Automatic timeouts:',
        '• 2 warns → 30 minutes',
        '• 3 warns → 2 hours',
        '• 4 warns → 7 hours',
        '• 5 warns → 1 day',
        '• 6+ warns → 3 days',
        '',
        `Server: **${guildName}**`,
      ].join('\n')
    )
    .addFields(
      PUNISHMENTS.map((p) => ({
        name: `${p.id}. ${p.title}`,
        value: `Reason: ${p.reason}`,
      }))
    )
    .setFooter({ text: 'This private panel expires in 60 seconds.' })
    .setTimestamp();
}

function buildSuccessEmbed(targetUser, selected, warnCount, actionText, dmSent) {
  return new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle('Punishment Applied')
    .setDescription(`Punishment has been applied to <@${targetUser.id}>.`)
    .addFields(
      { name: 'Selected option', value: `${selected.id}. ${selected.title}` },
      { name: 'Reason', value: selected.reason },
      { name: 'Total warns', value: String(warnCount) },
      { name: 'Action taken', value: actionText },
      {
        name: 'Punished user DM sent',
        value: dmSent ? 'Yes' : 'No - the user probably has DMs disabled',
      }
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

function createPanelId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function buildButtonRows(panelId, moderatorId, targetUserId) {
  const buttons = PUNISHMENTS.map((p) =>
    new ButtonBuilder()
      .setCustomId(`punish:${panelId}:${moderatorId}:${targetUserId}:${p.id}`)
      .setLabel(String(p.id))
      .setStyle(ButtonStyle.Secondary)
  );

  const firstRow = new ActionRowBuilder().addComponents(buttons.slice(0, 5));
  const secondRow = new ActionRowBuilder().addComponents(buttons.slice(5, 7));

  return [firstRow, secondRow];
}

async function incrementWarn(guildId, userId) {
  return UserWarn.findOneAndUpdate(
    { guildId, userId },
    { $inc: { warnCount: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

async function sendPunishmentDM(user, guildName, reason, warnCount, appliedTimeoutMs) {
  const embed = new EmbedBuilder()
    .setColor(appliedTimeoutMs > 0 ? 0xe74c3c : 0xf39c12)
    .setTitle('Punishment Notice')
    .setDescription(`You have received a punishment on **${guildName}**.`)
    .addFields(
      { name: 'Reason', value: reason },
      { name: 'Total warns', value: String(warnCount) },
      {
        name: 'Action',
        value:
          appliedTimeoutMs > 0
            ? `Warning added and a **${formatDuration(appliedTimeoutMs)}** timeout has been applied.`
            : 'Warning added. No timeout has been applied at this warning level.',
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

async function applyPunishment({ client, guild, targetUserId, punishmentId }) {
  const selected = PUNISHMENTS.find((p) => p.id === punishmentId);
  if (!selected) {
    throw new Error('Invalid punishment option.');
  }

  const targetUser = await client.users.fetch(targetUserId).catch(() => null);
  if (!targetUser) {
    throw new Error('User not found.');
  }

  if (targetUser.id === client.user.id) {
    throw new Error('You cannot use this command on this bot.');
  }

  const warnDoc = await incrementWarn(guild.id, targetUser.id);
  const warnCount = warnDoc.warnCount;

  const timeoutMs = getTimeoutDurationMs(warnCount);
  let appliedTimeoutMs = 0;
  let actionText = 'Warning added. No timeout has been applied at this warning level.';

  if (timeoutMs > 0) {
    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      actionText = `Warning added. The automatic ${formatDuration(timeoutMs)} timeout could not be applied because the user is not in this server.`;
    } else if (!targetMember.moderatable) {
      actionText = `Warning added. The automatic ${formatDuration(timeoutMs)} timeout could not be applied because I cannot moderate this user.`;
    } else {
      await targetMember.timeout(timeoutMs, `${selected.reason} | Warn #${warnCount}`);
      appliedTimeoutMs = timeoutMs;
      actionText = `Warning added. Applied a ${formatDuration(timeoutMs)} timeout.`;
    }
  }

  const dmSent = await sendPunishmentDM(
    targetUser,
    guild.name,
    selected.reason,
    warnCount,
    appliedTimeoutMs
  );

  return {
    targetUser,
    selected,
    warnCount,
    actionText,
    dmSent,
  };
}

module.exports = {
  name: 'punish',
  aliases: ['punishpanel', 'ppanel'],
  description: 'Open a private punishment panel for a selected user.',
  data: new SlashCommandBuilder()
    .setName('punish')
    .setDescription('Open a private punishment panel for a selected user.')
    .addUserOption((option) =>
      option.setName('user').setDescription('User to punish').setRequired(false)
    )
    .addStringOption((option) =>
      option.setName('userid').setDescription('User ID to punish').setRequired(false)
    ),

  async execute(message) {
    if (!message.guild) {
      return message.reply('This command can only be used in a server.');
    }

    if (!canUseCommand(message.guild, message.author.id)) {
      return message.reply('Only the server owner or the bot owner can use this command.');
    }

    const reply = await message.reply(
      'Use **/punish** for the private panel. Prefix commands cannot show a private on-channel panel.'
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

    if (targetUser.id === client.user.id) {
      return interaction.reply({
        content: 'You cannot use this command on this bot.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const panelId = createPanelId();
    const panelState = {
      panelId,
      guildId: interaction.guild.id,
      moderatorId: interaction.user.id,
      targetUserId: targetUser.id,
      closed: false,
      timeout: null,
    };

    activePanels.set(panelId, panelState);

    await interaction.reply({
      embeds: [buildPanelEmbed(targetUser, interaction.guild.name)],
      components: buildButtonRows(panelId, interaction.user.id, targetUser.id),
      flags: MessageFlags.Ephemeral,
    });

    panelState.timeout = setTimeout(async () => {
      const current = activePanels.get(panelId);
      if (!current || current.closed) return;

      current.closed = true;
      activePanels.delete(panelId);

      try {
        await interaction.editReply({
          embeds: [buildExpiredEmbed(targetUser)],
          components: [],
        });
      } catch {}
    }, PANEL_TTL_MS);
  },

  async handleButton(interaction, client) {
    const parts = interaction.customId.split(':');
    if (parts.length !== 5 || parts[0] !== 'punish') return;

    const [, panelId, moderatorId, targetUserId, punishmentIdRaw] = parts;
    const punishmentId = Number(punishmentIdRaw);

    const panelState = activePanels.get(panelId);

    if (!panelState || panelState.closed) {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'This punishment panel has expired.',
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }
      return;
    }

    if (interaction.user.id !== moderatorId) {
      await interaction.reply({
        content: 'This panel is not for you.',
        flags: MessageFlags.Ephemeral,
      }).catch(() => {});
      return;
    }

    panelState.closed = true;
    activePanels.delete(panelId);
    if (panelState.timeout) {
      clearTimeout(panelState.timeout);
    }

    await interaction.deferUpdate();

    try {
      const result = await applyPunishment({
        client,
        guild: interaction.guild,
        targetUserId,
        punishmentId,
      });

      await interaction.editReply({
        embeds: [
          buildSuccessEmbed(
            result.targetUser,
            result.selected,
            result.warnCount,
            result.actionText,
            result.dmSent
          ),
        ],
        components: [],
      });
    } catch (err) {
      await interaction.editReply({
        embeds: [buildErrorEmbed(`Failed to apply punishment.\n\n${err.message}`)],
        components: [],
      }).catch(async () => {
        await interaction.followUp({
          embeds: [buildErrorEmbed(`Failed to apply punishment.\n\n${err.message}`)],
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      });
    }
  },
};