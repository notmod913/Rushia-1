const { EmbedBuilder } = require('discord.js');
const { getUserSettings } = require('../utils/userSettingsManager');
const { sendLog } = require('../utils/logger');
const { LUVI_BOT_ID } = require('../config/constants');

const REMINDER_DELAY = 30 * 60 * 1000; // 30 minutes
const raidSpawnUsers = new Map(); // Track users who used /raid spawn

// Detect when user uses Luvi's /raid spawn command
async function detectRaidSpawnCommand(interaction) {
  // Only track Luvi bot interactions
  if (interaction.user.id !== LUVI_BOT_ID) return;
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'raid') return;
  
  const subcommand = interaction.options?.getSubcommand(false);
  if (subcommand !== 'spawn') return;

  const userId = interaction.user.id;
  const username = interaction.user.tag;
  const guildName = interaction.guild?.name || 'a server';
  
  // Check user settings
  const userSettings = getUserSettings(userId);
  const raidSpawnEnabled = !userSettings || userSettings.raidSpawnReminder !== false;

  if (!raidSpawnEnabled) return;

  // Store user info for reminder (no DM option)
  raidSpawnUsers.set(userId, {
    username,
    guildName,
    guildId: interaction.guild?.id,
    channelId: interaction.channel?.id,
    timestamp: Date.now()
  });

  // Log the command usage
  await sendLog(`[RAID SPAWN DETECTED] ${username} used Luvi's /raid spawn in ${guildName}`, {
    userId,
    username,
    guildId: interaction.guild?.id,
    guildName,
    commandName: 'raid spawn'
  });

  // Schedule the reminder
  setTimeout(async () => {
    const userInfo = raidSpawnUsers.get(userId);
    if (!userInfo) return;

    try {
      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('⏰ 30-Minute Raid Reminder')
        .setDescription(`You used Luvi's \`/raid spawn\` 30 minutes ago in **${userInfo.guildName}**.`)
        .addFields(
          { name: 'Command', value: '/raid spawn', inline: true },
          { name: 'Server', value: userInfo.guildName, inline: true }
        )
        .setTimestamp();

      // Always send in channel (no DM option for raid spawn)
      const channel = await interaction.client.channels.fetch(userInfo.channelId);
      if (channel) {
        await channel.send({ 
          content: `<@${userId}>`, 
          embeds: [embed] 
        });
        await sendLog(`[RAID SPAWN REMINDER] Channel reminder sent to ${userInfo.username} (${userId})`);
      }

      // Clean up
      raidSpawnUsers.delete(userId);

    } catch (error) {
      console.error(`[RAID SPAWN REMINDER ERROR] Failed to remind user ${userId}:`, error.message);
      await sendLog(`[ERROR] Failed to send raid spawn reminder to ${userId}: ${error.message}`);
      raidSpawnUsers.delete(userId);
    }
  }, REMINDER_DELAY);
}

module.exports = { detectRaidSpawnCommand };