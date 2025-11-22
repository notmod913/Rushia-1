const { parseRaidViewEmbed } = require('../utils/embedParser');
const Reminder = require('../database/Reminder');
const { sendLog, sendError } = require('../utils/logger');

async function processRaidMessage(message) {
  if (!message.guild || !message.embeds.length) return;

  const embed = message.embeds[0];
  const raidInfo = parseRaidViewEmbed(embed);
  if (!raidInfo) return;

  // raidInfo is an array of { userId, fatigueMillis }
  for (const fatiguedUser of raidInfo) {
    const { userId, fatigueMillis } = fatiguedUser;

    // To prevent duplicate reminders from being created for the same fatigue event
    // (since raid embeds can be updated frequently), we check for an existing reminder
    // within a small time window around when this one would be set.
    const fiveSeconds = 5000;
    const remindAt = new Date(Date.now() + fatigueMillis);
    const existingReminder = await Reminder.findOne({
      userId,
      type: 'raid',
      remindAt: {
        $gte: new Date(remindAt.getTime() - fiveSeconds),
        $lte: new Date(remindAt.getTime() + fiveSeconds),
      },
    });

    if (!existingReminder) {
      try {
        await Reminder.create({
          userId,
          channelId: message.channel.id,
          remindAt,
          type: 'raid',
          reminderMessage: `<@${userId}>, your raid fatigue has worn off! use </raid attack:1404667045332910220> to attack the boss again.`,
        });
        await sendLog(`[RAID REMINDER SET] User: ${userId}, Channel: ${message.channel.id}, In: ${Math.round(fatigueMillis / 1000)}s, Message ID: ${message.id}, Message Link: ${message.url}`);
      } catch (error) {
        if (error.code === 11000) {
          // Suppress duplicate key errors
        } else {
          console.error(`[ERROR] Failed to create reminder for raid fatigue: ${error.message}`, error);
          await sendError(`[ERROR] Failed to create reminder for raid fatigue: ${error.message}`);
        }
      }
    }
  }
}

module.exports = { processRaidMessage };