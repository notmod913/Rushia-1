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

  const bossRole = settings.bossRoleId;

  if (bossRole) {
    try {
      const content = `<@&${bossRole}> **${bossInfo.tier} Boss Spawned!**\nBoss: **${bossInfo.bossName}**`;
      await message.channel.send({ content, allowedMentions: { roles: [bossRole] } });
      await sendLog(`[BOSS DETECTED] ${bossInfo.bossName} (${bossInfo.tier}) in guild ${message.guild.name}`);
    } catch (err) {
      console.error(`[ERROR] Failed to send boss ping: ${err.message}`, err);
      await sendError(`[ERROR] Failed to send boss ping: ${err.message}`);
    }
  }
}

module.exports = { processBossMessage };