// Vaste botidentiteit; geen serverinstelling of .env-override.
const ownerId = '709486570293559356';
module.exports = Object.freeze({
    statusText: 'Troy Scrips',
    isBotOwner: userId => typeof userId === 'string' && userId === ownerId
});
