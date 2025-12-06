const Reminder = require('../database/Reminder');
const { getUserSettings } = require('../utils/userSettingsManager');
const { sendLog, sendError } = require('../utils/logger');
const { SCHEDULER } = require('../config/constants');

async function checkReminders(client) {
  try {
    const now = new Date();
    const dueReminders = await Reminder.find({ remindAt: { $lte: now } }).limit(SCHEDULER.BATCH_SIZE);

    if (dueReminders.length === 0) return;

    const remindersToProcess = dueReminders.reduce((acc, reminder) => {
      const key = reminder.type === 'raid_reset' ? `${reminder.guildId}-${reminder.type}` : `${reminder.userId}-${reminder.reminderMessage}`;
      if (!acc[key]) {
        acc[key] = {
          userId: reminder.userId,
          guildId: reminder.guildId,
          channelId: reminder.channelId,
          reminderMessage: reminder.reminderMessage,
          type: reminder.type, // Add type to the grouped data
          reminderIds: [],
        };
      }
      acc[key].reminderIds.push(reminder._id);
      return acc;
    }, {});

    const sendPromises = [];
    const remindersToDelete = [];

    for (const key in remindersToProcess) {
      const reminderData = remindersToProcess[key];
      remindersToDelete.push(...reminderData.reminderIds);

      const sendPromise = (async () => {
        try {
          let userSettings = getUserSettings(reminderData.userId);
          if (!userSettings) {
            const { updateUserSettings } = require('../utils/userSettingsManager');
            await updateUserSettings(reminderData.userId, {
              expedition: true,
              stamina: true,
              raid: true,
              staminaDM: false,
              expeditionDM: false,
              raidSpawnReminder: true
            });
            userSettings = getUserSettings(reminderData.userId);
          }
          const sendReminder = userSettings[reminderData.type] !== false;
          
          // Determine DM preference based on reminder type
          let sendInDm = false;
          if (reminderData.type === 'raid') {
            sendInDm = true; // Raid always DM
          } else if (reminderData.type === 'stamina') {
            sendInDm = userSettings && userSettings.staminaDM;
          } else if (reminderData.type === 'expedition') {
            sendInDm = userSettings && userSettings.expeditionDM;
          }

          if (sendReminder) {
            if (sendInDm) {
              const user = await client.users.fetch(reminderData.userId);
              if (user) {
                await user.send(reminderData.reminderMessage);
                await sendLog(`[REMINDER SENT] User: ${reminderData.userId} via DM`);
              }
            } else {
              const channel = await client.channels.fetch(reminderData.channelId);
              if (channel) {
                await channel.send(reminderData.reminderMessage);
                await sendLog(`[REMINDER SENT] User: ${reminderData.userId} in Channel: ${reminderData.channelId}`);
              }
            }
          }
        } catch (error) {
          if (error.code === 50007) { // Cannot send messages to this user
            console.log(`User ${reminderData.userId} cannot be DMed. Deleting reminder.`);
          } else {
            console.error(`Failed to send reminder for user ${reminderData.userId}:`, error);
            await sendError(`[ERROR] Failed to send reminder for user ${reminderData.userId}:\n${error.message}`);
          }
        }
      })();
      sendPromises.push(sendPromise);
    }

    await Promise.all(sendPromises);

    // Clean up all processed reminders
    if (remindersToDelete.length > 0) {
      try {
        await Reminder.deleteMany({ _id: { $in: remindersToDelete } });
      } catch (error) {
        console.error(`Failed to delete reminders:`, error);
        await sendError(`[ERROR] Failed to delete reminders:\n${error.message}`);
      }
    }

  } catch (error) {
    console.error(`[ERROR] Error in checkReminders: ${error.message}`, error);
  }

}

function startScheduler(client) {
  (function schedule() {
    checkReminders(client).finally(() => setTimeout(schedule, SCHEDULER.CHECK_INTERVAL));
  })();
  sendLog('[SCHEDULER] Reminder scheduler started.');
}

module.exports = { startScheduler };
