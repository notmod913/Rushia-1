const { parseCardEmbed } = require('../utils/embedParser');
const { getSettings } = require('../utils/settingsManager');
const { sendLog, sendError } = require('../utils/logger');

async function processCardMessage(message) {
  if (!message.guild || !message.embeds.length) return;

  const embed = message.embeds[0];
  const settings = getSettings(message.guild.id);
  if (!settings) return;

  const cardInfo = parseCardEmbed(embed);
  if (!cardInfo) return;

  let roleId = null;
  
  // Check if multi-role system is enabled
  if (settings.multiRoleEnabled) {
    // Map rarity to role field
    const rarityMap = {
      'Common': 'commonRoleId',
      'Uncommon': 'uncommonRoleId',
      'Rare': 'rareRoleId',
      'Exotic': 'exoticRoleId',
      'Legendary': 'legendaryRoleId'
    };
    
    const roleField = rarityMap[cardInfo.rarity];
    if (roleField) {
      roleId = settings[roleField];
    }
  } else {
    // Use legacy single role
    roleId = settings.cardPingId;
  }

  if (roleId) {
    try {
      const content = `<@&${roleId}> A **${cardInfo.rarity}** card just spawned!\n**${cardInfo.cardName}** from *${cardInfo.seriesName}*`;
      await message.channel.send({ content, allowedMentions: { roles: [roleId] } });
      await sendLog(`[CARD DETECTED] ${cardInfo.cardName} (${cardInfo.rarity}) from ${cardInfo.seriesName} in guild ${message.guild.name}`);
    } catch (err) {
      console.error(`[ERROR] Failed to send card ping: ${err.message}`, err);
      await sendError(`[ERROR] Failed to send card ping: ${err.message}`);
    }
  }
}

module.exports = { processCardMessage };
