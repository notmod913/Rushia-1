const mongoose = require('mongoose');

const botSettingsSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },

  bossRoleId: { type: String },

  cardPingId: { type: String }
});

module.exports = mongoose.model('BotSettings', botSettingsSchema, 'guilds');
