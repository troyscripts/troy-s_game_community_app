// Discord role IDs are unique across servers. Add another server's VIP role here if needed.
// Birthday role is read per server from Birthday.Role; bonuses never stack.
module.exports = {
    Enabled: true,
    VIPRoles: (process.env.VIP_ROLE_IDS || "").split(",").map(id => id.trim()).filter(id => /^\d{17,20}$/.test(id))
};
