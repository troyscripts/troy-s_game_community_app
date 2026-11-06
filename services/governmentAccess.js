// Deliberately independent of bot staff permissions and role hierarchy.
function canHandle(member, access) {
 if (!member || member.user?.bot) return false;
 return access.users.includes(member.id) || access.roles.some(id => id !== member.guild.id && member.roles.cache.has(id));
}
module.exports = { canHandle };
