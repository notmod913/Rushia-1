const Reminder = require('../database/Reminder');
const { sendLog, sendError } = require('../utils/logger');
const { STAMINA } = require('../config/constants');

async function processStaminaMessage(message) {
  if (!message.guild || !message.content.includes("you don't have enough stamina!")) return;

  let userId;

  if (message.interaction?.user?.id) {
    userId = message.interaction.user.id;
  } else if (message.mentions.users.size > 0) {
    userId = message.mentions.users.first().id;
  } else if (message.reference) {
    try {
      const referencedMessage = await message.channel.messages.fetch(message.reference.messageId);
      userId = referencedMessage.author.id;
    } catch (error) {
      console.error('Error fetching referenced message:', error);
    }
  }

  if (userId) {
    const minutesToRegen = STAMINA.MAX * STAMINA.REGEN_RATE;
    const remindAt = new Date(Date.now() + minutesToRegen * 60 * 1000);

    try {
      await Reminder.findOneAndUpdate(
        { userId, type: 'stamina' },
        {
          userId,
          channelId: message.channel.id,
          remindAt,
          type: 'stamina',
          reminderMessage: `<@${userId}>, your stamina has reached 10/10 \n use </clash:1426499105936379915>`
        },
        { upsert: true, new: true }
      );

      await message.channel.send({
        content: `<@${userId}>, I'll remind you when your stamina is 10/10.`,
      });
      await sendLog(`[STAMINA REMINDER SET] User: ${userId}, Channel: ${message.channel.id}, Message ID: ${message.id}`);
    } catch (error) {
      console.error(`[ERROR] Failed to create stamina reminder: ${error.message}`, error);
      await sendError(`[ERROR] Failed to create stamina reminder: ${error.message}`);
    }
  }
}

module.exports = { processStaminaMessage };