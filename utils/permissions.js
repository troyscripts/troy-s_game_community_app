const config = require("../config/config");

function isOwner(userId) {
    return config.Owners.includes(userId);
}

function isDeveloper(userId) {
    return config.Developers.includes(userId) || isOwner(userId);
}

function hasDeveloperRole(member) {
    const roleId = config.Roles?.Developer;
    return Boolean(roleId && roleId !== member?.guild?.id && !member?.user?.bot && member?.roles?.cache?.has(roleId));
}

function hasOwnerAccess(member, userId) {
    if (isOwner(userId) || member?.guild?.ownerId === userId) {
        return true;
    }

    if (hasDeveloperRole(member)) return true;

    const ownerRoleId = config.Roles?.Owner;
    return Boolean(ownerRoleId && member?.roles?.cache?.has(ownerRoleId));
}

function hasStaffRole(member) {
    if (member?.id && (hasOwnerAccess(member, member.id) || member.permissions?.has("Administrator"))) {
        return true;
    }

    if (!member?.roles?.cache) {
        return false;
    }

    return config.StaffRoles.some((roleId) => member.roles.cache.has(roleId));
}

function hasRole(member, roles = []) {
    if (!member?.roles?.cache) {
        return false;
    }

    return roles.some((roleId) => member.roles.cache.has(roleId));
}

function hasPermission(member, permissions = []) {
    // Owner recognition applies to bot staff actions, not Discord API permissions.
    // serverOwnerOnly/developerOnly restrictions are checked by canUseCommand first.
    if (member?.id && hasOwnerAccess(member, member.id)) return true;
    if (!member?.permissions) {
        return false;
    }

    if (member.permissions.has("Administrator")) {
        return true;
    }

    return permissions.every((permission) => member.permissions.has(permission));
}

function canUseCommand(interaction, command) {
    const userId = interaction.user.id;

    if (command.serverOwnerOnly && interaction.guild?.ownerId !== userId) {
        return false;
    }

    if (command.ownerOnly && !hasOwnerAccess(interaction.member, userId)) {
        return false;
    }

    if (command.developerOnly && !isDeveloper(userId)) {
        return false;
    }

    if (command.staffOnly && !hasStaffRole(interaction.member)) {
        return false;
    }

    if (command.permissions?.length) {
        return hasPermission(interaction.member, command.permissions);
    }

    return true;
}

module.exports = {
    isOwner,
    hasOwnerAccess,
    hasDeveloperRole,
    isDeveloper,
    hasStaffRole,
    hasRole,
    hasPermission,
    canUseCommand
};
