const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');


const pages = [
{ title: 'General', desc: '`/help` or `!help` - show this help. Use buttons to navigate.' },
{ title: 'Leveling', desc: '`!level` - show your level image\n`!config leveling on|off` - enable/disable leveling\n`!config levelrole <level> <roleId>` - award role' },
{ title: 'Channel XP', desc: '`!config channelxp add <channelId> <xp>` - add XP per message\n`!config channelxp remove <channelId>` - remove' },
{ title: 'Scramble', desc: '`!config scramble on|off` - enable game\n`!config scramble channel <channelId>` - set channel\n`!config scramble interval <seconds>` - how often' }
];


module.exports = {
name: 'help',
description: 'Show help with pagination',
async execute(message, args) {
let page = 0;
const embed = new EmbedBuilder().setTitle(pages[page].title).setDescription(pages[page].desc);


const back = new ButtonBuilder().setCustomId('help_back').setLabel('⬅️ Back').setStyle(ButtonStyle.Secondary).setDisabled(true);
const next = new ButtonBuilder().setCustomId('help_next').setLabel('Next ➡️').setStyle(ButtonStyle.Primary);
const row = new ActionRowBuilder().addComponents(back, next);


const msg = await message.channel.send({ embeds: [embed], components: [row] });


const collector = msg.createMessageComponentCollector({ time: 120000 });
collector.on('collect', i => {
if (i.user.id !== message.author.id) return i.reply({ content: 'This help session is not for you', ephemeral: true });
if (i.customId === 'help_next') page = Math.min(pages.length-1, page+1);
if (i.customId === 'help_back') page = Math.max(0, page-1);
back.setDisabled(page === 0);
next.setDisabled(page === pages.length-1);
embed.setTitle(pages[page].title).setDescription(pages[page].desc);
i.update({ embeds: [embed], components: [row] });
});


collector.on('end', () => { try { msg.edit({ components: [] }); } catch(e){} });
}
};