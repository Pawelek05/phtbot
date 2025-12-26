module.exports = (messageOrInteraction) => {
// Accept either Message or Interaction
try {
const guild = messageOrInteraction.guild;
const authorId = messageOrInteraction.member?.user?.id || messageOrInteraction.author?.id || messageOrInteraction.user?.id;
return guild && guild.ownerId === authorId;
} catch (e) {
return false;
}
};