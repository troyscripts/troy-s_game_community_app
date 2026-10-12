const { send } = require("./localization");
const { MessageFlags } = require("discord.js");

// Een openbare defer kan niet achteraf privé worden gemaakt.
async function replyAfterDefer(interaction, payload) {
    if ((Number(payload.flags) & MessageFlags.Ephemeral) !== 0) {
        await interaction.deleteReply();
        return send(interaction, "followUp", payload);
    }

    return send(interaction, "editReply", payload);
}

module.exports = { replyAfterDefer };
