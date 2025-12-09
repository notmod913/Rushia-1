const { parseBossEmbed } = require('../utils/embedParser');
const { getSettings } = require('../utils/settingsManager');
const { sendLog, sendError } = require('../utils/logger');

async function processBossMessage(message) {
  if (!message.guild || !message.embeds.length) return;

  const embed = message.embeds[0];
  const settings = getSettings(message.guild.id);
  if (!settings) return;

  const bossInfo = parseBossEmbed(embed);
  if (!bossInfo) return;

  let roleId = null;
  
  // Check if multi-role system is enabled
  if (settings.multiRoleEnabled) {
    // Map tier to role field
    const tierMap = {
      'Tier 1': 'tier1RoleId',
      'Tier 2': 'tier2RoleId',
      'Tier 3': 'tier3RoleId'
    };
    
    const roleField = tierMap[bossInfo.tier];
    if (roleField) {
      roleId = settings[roleField];
    }
  } else {
    // Use legacy single role
    roleId = settings.bossRoleId;
  }

  if (roleId) {
    try {
      const content = `<@&${roleId}> **${bossInfo.tier} Boss Spawned!**\nBoss: **${bossInfo.bossName}**`;
      await message.channel.send({ content, allowedMentions: { roles: [roleId] } });
      await sendLog(`[BOSS DETECTED] ${bossInfo.bossName} (${bossInfo.tier}) in guild ${message.guild.name}`);
    } catch (err) {
      console.error(`[ERROR] Failed to send boss ping: ${err.message}`, err);
      await sendError(`[ERROR] Failed to send boss ping: ${err.message}`);
    }
  }
}

module.exports = { processBossMessage };
