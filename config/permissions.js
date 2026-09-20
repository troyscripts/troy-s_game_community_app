const config = require("./config");

module.exports = {
    get Owner() { return config.Owners; },
    get Developer() { return config.Developers; },
    get StaffRoles() { return config.StaffRoles; },
    get Roles() { return config.Roles; },

    AdminPermissions: ["Administrator"],
    ModeratorPermissions: [
        "BanMembers",
        "KickMembers",
        "ManageMessages",
        "ModerateMembers"
    ],
    SupportPermissions: ["ManageChannels", "ManageMessages"]
};
