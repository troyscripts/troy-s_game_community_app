const polls = require('../services/polls');
module.exports = { customId: 'poll', execute: polls.vote };
