const { getUserSettings, updateUserSettings } = require('../utils/userSettingsManager');
const { COLORS } = require('../config/constants');

async function handleNotificationView(interaction) {
  const userId = interaction.user.id;
  let settings = getUserSettings(userId);
  if (!settings) {
    settings = { expedition: true, stamina: true, raid: true, staminaDM: false, expeditionDM: false, raidSpawnReminder: true };
  }

  const getStatusIcon = (enabled) => enabled ? '✅' : '❌';
  const getDMStatus = (enabled) => enabled ? '📩 DM' : '💬 Channel';

  await interaction.reply({
    embeds: [{
      title: '🔔 Your Notification Settings',
      description: 'Configure your personal reminder preferences below.',
      fields: [
        { 
          name: '⚔️ Expedition Reminders', 
          value: `${getStatusIcon(settings.expedition)} ${settings.expedition ? 'Enabled' : 'Disabled'}\n${getDMStatus(settings.expeditionDM)}`, 
          inline: true 
        },
        { 
          name: '⚡ Stamina Reminders', 
          value: `${getStatusIcon(settings.stamina)} ${settings.stamina ? 'Enabled' : 'Disabled'}\n${getDMStatus(settings.staminaDM)}`, 
          inline: true 
        },
        { 
          name: '🛡️ Raid Fatigue', 
          value: `${getStatusIcon(settings.raid)} ${settings.raid ? 'Enabled' : 'Disabled'}\n📩 Always DM`, 
          inline: true 
        },
        { 
          name: '🎯 Raid Spawn Reminder', 
          value: `${getStatusIcon(settings.raidSpawnReminder !== false)} ${settings.raidSpawnReminder !== false ? 'Enabled' : 'Disabled'}\n💬 Channel only`, 
          inline: true 
        },
      ],
      footer: { text: 'Use /notifications set or /dm commands to modify settings' },
      color: COLORS.INFO,
    }],
    flags: 1 << 6,
  });
}

async function handleNotificationSet(interaction) {
  const userId = interaction.user.id;
  const type = interaction.options.getString('type');
  const enabled = interaction.options.getBoolean('enabled');

  await updateUserSettings(userId, { [type]: enabled });

  let replyContent;
  if (type === 'raidSpawnReminder') {
    replyContent = `Raid spawn reminders (30-min after /raid spawn) have been **${enabled ? 'enabled' : 'disabled'}**.`;
  } else {
    replyContent = `Notifications for **${type}** have been **${enabled ? 'enabled' : 'disabled'}**.`;
  }

  await interaction.reply({
    content: replyContent,
    flags: 1 << 6,
  });
}

module.exports = { handleNotificationView, handleNotificationSet };