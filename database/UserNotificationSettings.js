const mongoose = require('mongoose');

const userNotificationSettingsSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  expedition: { type: Boolean, default: true },
  stamina: { type: Boolean, default: true },
  raid: { type: Boolean, default: true },
  staminaDM: { type: Boolean, default: false },
  expeditionDM: { type: Boolean, default: false },
  raidSpawnReminder: { type: Boolean, default: true },
});

module.exports = mongoose.model('UserNotificationSettings', userNotificationSettingsSchema, 'users');
