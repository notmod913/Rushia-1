const mongoose = require('mongoose');

const botSettingsSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },

  // Legacy single role system
  bossRoleId: { type: String },
  cardPingId: { type: String },
  
  // Multi-role system
  multiRoleEnabled: { type: Boolean, default: false },
  
  // Boss tier roles
  tier1RoleId: { type: String },
  tier2RoleId: { type: String },
  tier3RoleId: { type: String },
  
  // Card rarity roles
  commonRoleId: { type: String },
  uncommonRoleId: { type: String },
  rareRoleId: { type: String },
  exoticRoleId: { type: String },
  legendaryRoleId: { type: String }
});

module.exports = mongoose.model('BotSettings', botSettingsSchema, 'guilds');
