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

  if (settings.cardPingId) {
    try {
      const content = `<@&${settings.cardPingId}> A **${cardInfo.rarity}** card just spawned!\n**${cardInfo.cardName}** from *${cardInfo.seriesName}*`;
      await message.channel.send({ content, allowedMentions: { roles: [settings.cardPingId] } });
      await sendLog(`[CARD DETECTED] ${cardInfo.cardName} (${cardInfo.rarity}) from ${cardInfo.seriesName} in guild ${message.guild.name}`);
    } catch (err) {
      console.error(`[ERROR] Failed to send card ping: ${err.message}`, err);
      await sendError(`[ERROR] Failed to send card ping: ${err.message}`);
    }
  }
}

module.exports = { processCardMessage };