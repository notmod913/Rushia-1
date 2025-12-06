const { sendLog } = require('../utils/logger');
const { BOT_OWNER_ID } = require('../config/constants');

async function processPingNotification(message) {
  // Check if the bot owner is mentioned in the message
  if (!message.mentions.users.has(BOT_OWNER_ID)) return;
  
  // Don't process if it's the bot owner's own message
  if (message.author.id === BOT_OWNER_ID) return;

  if (message.author.bot) return;
  
  try {
    // React with custom emoji to acknowledge the ping
    await message.react('<:hi:1444003280039448576>');
    
    // Get the bot owner user
    const botOwner = await message.client.users.fetch(BOT_OWNER_ID);
    
    // Create the notification message with link
    const notificationMessage = `🔔 **You were mentioned!**\n\n` +
      `**Server:** ${message.guild ? message.guild.name : 'DM'}\n` +
      `**Channel:** ${message.channel.name || 'Direct Message'}\n` +
      `**Author:** ${message.author.tag}\n` +
      `**Message:** ${message.content}\n\n` +
      `**Jump to message:** ${message.url}`;
    
    // Send DM to bot owner
    await botOwner.send(notificationMessage);
    
    await sendLog(`[PING NOTIFICATION] Sent ping notification to bot owner from ${message.author.tag} in ${message.guild?.name || 'DM'}`);
    
  } catch (error) {
    console.error(`[ERROR] Failed to process ping notification: ${error.message}`, error);
  }
}

module.exports = { processPingNotification };
