const { parseRaidSpawnEmbed } = require('../utils/embedParser');
const Reminder = require('../database/Reminder');
const { sendLog, sendError } = require('../utils/logger');

async function processRaidSpawnMessage(message) {
  if (!message.guild || !message.embeds.length) return;

  const embed = message.embeds[0];
  const raidSpawnInfo = parseRaidSpawnEmbed(embed);
  if (!raidSpawnInfo) return;

  let userId = message.interaction?.user?.id;

  if (userId) {
    try {
      const remindAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      
      await Reminder.create({
        userId,
        channelId: message.channel.id,
        remindAt,
        type: 'raidSpawn',
        reminderMessage: `<@${userId}>,You can now use </raid spawn:1404667045332910220> to spawn a new raid boss!`,
      });
      
      await sendLog(`[RAID SPAWN REMINDER SET] User: ${userId}, Channel: ${message.channel.id}, Message ID: ${message.id}, Message Link: ${message.url}`);
    } catch (error) {
      if (error.code === 11000) {
        console.log(`[INFO] Suppressed duplicate key error for raid spawn reminder. User: ${userId}`);
      } else {
        console.error(`[ERROR] Failed to create raid spawn reminder: ${error.message}`, error);
        await sendError(`[ERROR] Failed to create raid spawn reminder: ${error.message}`);
      }
    }
  } else {
    console.warn(`[WARN] Could not determine userId for raid spawn message. Title: ${embed.title}`);
  }
}

module.exports = { processRaidSpawnMessage };
