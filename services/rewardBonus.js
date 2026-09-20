const config = require('../config/config');
const bonuses = require('../config/rewardBonuses');
const logger = require('../utils/logger');

function hasRole(member, id) {
    if (!id) return false;
    const roles = member?.roles;
    return Array.isArray(roles) ? roles.includes(id) : Boolean(roles?.cache?.has(id));
}
function rewardMultiplier(member) {
    if (!bonuses.Enabled) return 1;
    return hasRole(member, config.Birthday?.Role) || bonuses.VIPRoles.some(id => hasRole(member, id)) ? 2 : 1;
}
function applyRewardBonus(amount, member) {
    // Called only for earned positive rewards, never for transfers or administrative edits.
    if (!Number.isSafeInteger(amount) || amount < 0) throw new RangeError('Ongeldige beloning');
    const result = amount * rewardMultiplier(member);
    if (!Number.isSafeInteger(result)) throw new RangeError('Beloning te groot');
    return result;
}
async function messageRewardMember(message) {
    if (message.member) return message.member;
    const cached = message.guild?.members.cache.get(message.author.id);
    if (cached) return cached;
    try { return await message.guild.members.fetch(message.author.id); }
    catch (error) {
        logger.warn(`Bonusrol niet te controleren [${message.guild?.id}, ${message.author.id}]: ${error.code || 'onbekend'}. Basisbeloning toegepast.`);
        return null;
    }
}
module.exports = {rewardMultiplier, applyRewardBonus, messageRewardMember};
