const { db } = require("./database");

function getState(channelId) {
    return db.prepare(`
        SELECT * FROM counting_state
        WHERE channel_id = ?
    `).get(channelId);
}

function setState(channelId, guildId, currentNumber, lastUserId = null) {
    const number = Math.max(0, Number(currentNumber) || 0);

    db.prepare(`
        INSERT INTO counting_state
            (channel_id, guild_id, current_number, last_user_id, updated_at)
        VALUES (?, ?, ?, ?, strftime('%s','now'))
        ON CONFLICT(channel_id) DO UPDATE SET
            guild_id = excluded.guild_id,
            current_number = excluded.current_number,
            last_user_id = excluded.last_user_id,
            updated_at = excluded.updated_at
    `).run(channelId, guildId, number, lastUserId);

    return getState(channelId);
}

const submitNumber = db.transaction(({
    channelId,
    guildId,
    userId,
    number
}) => {
    let state = getState(channelId);

    if (!state) {
        state = setState(channelId, guildId, 0, null);
    }

    if (state.last_user_id === userId) {
        return {
            status: "repeat",
            currentNumber: state.current_number,
            expectedNumber: state.current_number + 1
        };
    }

    const expectedNumber = state.current_number + 1;
    if (!Number.isSafeInteger(number) || number !== expectedNumber) {
        setState(channelId, guildId, 0, null);
        return {
            status: "reset",
            currentNumber: 0,
            expectedNumber: 1
        };
    }

    setState(channelId, guildId, number, userId);
    return {
        status: "accepted",
        currentNumber: number,
        expectedNumber: number + 1
    };
});

module.exports = {
    getState,
    setState,
    submitNumber
};
