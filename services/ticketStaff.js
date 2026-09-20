// Only configured human staff roles count, never an unrelated role above them.
function selectStaffRoles(guild, configured, minimumId) {
    const staff = [...new Set(configured || [])]
        .map(id => guild.roles.cache.get(id))
        .filter(role => role && role.id !== guild.roles.everyone.id && !role.managed);
    if (!minimumId) return staff.map(role => role.id);
    const minimum = staff.find(role => role.id === minimumId);
    if (!minimum) {
        throw new Error('De minimumrol ontbreekt of staat niet in StaffRoles. Laat een beheerder de staffinstellingen of dit paneel aanpassen.');
    }
    return staff.filter(role => role.comparePositionTo(minimum) >= 0).map(role => role.id);
}
module.exports = { selectStaffRoles };
