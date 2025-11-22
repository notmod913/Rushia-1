const { parseExpeditionEmbed } = require('../utils/embedParser');
const Reminder = require('../database/Reminder');
const { sendLog, sendError } = require('../utils/logger');

async function processExpeditionMessage(message) {
  if (!message.guild || !message.embeds.length) return;

  const embed = message.embeds[0];
  const expeditionInfo = parseExpeditionEmbed(embed);
  if (!expeditionInfo) return;

  let userId = message.interaction?.user?.id;

  if (!userId && expeditionInfo.username) {
    try {
      const members = await message.guild.members.fetch({ query: expeditionInfo.username, limit: 1 });
      const member = members.first();
      if (member) userId = member.id;
      else console.warn(`[WARN] Could not find a guild member with username: ${expeditionInfo.username}`);
    } catch (err) {
      console.error(`[ERROR] Failed to fetch member for username: ${expeditionInfo.username}`, err);
    }
  }

  if (userId) {
    const now = Date.now();
    for (const card of expeditionInfo.cards) {
      const existingReminder = await Reminder.findOne({ userId, cardId: card.cardId });
      if (!existingReminder) {
        try {
          const remindAt = new Date(now + card.remainingMillis);
          await Reminder.create({
            userId,
            cardId: card.cardId,
            channelId: message.channel.id,
            remindAt,
            type: 'expedition',
            reminderMessage: `<@${userId}>, your expedition cards are ready to be claimed!\n-# Use </expeditions:1426499105936379922> to resend your expedition cards. `, 
          });
          await sendLog(`[EXPEDITION REMINDER SET] User: ${userId}, Card: ${card.cardName} (${card.cardId}), Channel: ${message.channel.id}, Message ID: ${message.id}, Message Link: ${message.url}`);
        } catch (error) {
          if (error.code === 11000) {
            console.log(`[INFO] Suppressed duplicate key error for expedition reminder. User: ${userId}, Card: ${card.cardId}`);
          } else {
            console.error(`[ERROR] Failed to create reminder for expedition: ${error.message}`, error);
            await sendError(`[ERROR] Failed to create reminder for expedition: ${error.message}`);
          }
        }
      }
    }
  } else {
    console.warn(`[WARN] Could not determine a userId for the expedition message. Title: ${embed.title}`);
  }
}

module.exports = { processExpeditionMessage };