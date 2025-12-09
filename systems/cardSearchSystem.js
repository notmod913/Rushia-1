const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Load cards data
const cardsPath = path.join(__dirname, '..', 'cards.json');
let cards = [];
try {
  cards = JSON.parse(fs.readFileSync(cardsPath, 'utf8'));
} catch (error) {
  console.error('Failed to load cards.json:', error);
}

// Store search results for user selection
const userSearches = new Map();

function searchCards(query) {
  const terms = query.toLowerCase().split(' ');
  const results = [];
  
  for (const card of cards) {
    let matches = true;
    
    for (const term of terms) {
      const searchText = `${card.name} ${card.series} ${card.element} ${card.role}`.toLowerCase();
      if (!searchText.includes(term)) {
        matches = false;
        break;
      }
    }
    
    if (matches) results.push(card);
  }
  
  return results;
}

function createCardEmbed(card) {
  const embed = new EmbedBuilder()
    .setTitle(card.name)
    .setColor(0x00ff00)
    .addFields(
      { name: 'Series', value: card.series, inline: true },
      { name: 'Element', value: card.element, inline: true },
      { name: 'Role', value: card.role, inline: true }
    )
    .setImage(card.image_url);
  
  return embed;
}

function createResultsEmbed(results, userId) {
  const embed = new EmbedBuilder()
    .setTitle(`Found ${results.length} results`)
    .setDescription('Reply with the number to select:')
    .setColor(0xffff00);
  
  for (let i = 0; i < Math.min(results.length, 10); i++) {
    const card = results[i];
    embed.addFields({
      name: `${i + 1}. ${card.name}`,
      value: `${card.series} | ${card.element} ${card.role}`,
      inline: false
    });
  }
  
  userSearches.set(userId, results);
  return embed;
}

module.exports = {
  // Handle card search from mentions
  handleSearch: async (message, query) => {
    // Check if query contains commas (multiple searches)
    if (query.includes(',')) {
      const queries = query.split(',').map(q => q.trim()).filter(q => q.length > 0);
      
      const loadingEmbed = new EmbedBuilder()
        .setTitle('🔍 Searching Multiple Cards...')
        .setDescription(`\`\`\`\n▓▓▓░░░░░░░ Searching ${queries.length} cards...\n\`\`\``)
        .setColor(0x808080);
      
      const loadingMsg = await message.reply({ embeds: [loadingEmbed] });
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const allResults = [];
      for (const q of queries) {
        const results = searchCards(q);
        if (results.length > 0) {
          allResults.push({ query: q, card: results[0] });
        } else {
          allResults.push({ query: q, card: null });
        }
      }
      
      const embed = new EmbedBuilder()
        .setTitle(`📋 Search Results (${allResults.length} queries)`)
        .setColor(0x00ff00);
      
      for (const result of allResults) {
        if (result.card) {
          embed.addFields({
            name: `✅ ${result.query}`,
            value: `**${result.card.name}**\n${result.card.series} | ${result.card.element} ${result.card.role}`,
            inline: false
          });
        } else {
          embed.addFields({
            name: `❌ ${result.query}`,
            value: 'No card found',
            inline: false
          });
        }
      }
      
      await loadingMsg.edit({ embeds: [embed] });
      return;
    }
    
    // Single search (original behavior)
    const loadingEmbed = new EmbedBuilder()
      .setTitle('🔍 Searching...')
      .setDescription('```\n▓▓▓░░░░░░░ Searching cards...\n```')
      .setColor(0x808080);
    
    const loadingMsg = await message.reply({ embeds: [loadingEmbed] });
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const results = searchCards(query);
    
    if (results.length === 0) {
      const noResultsEmbed = new EmbedBuilder()
        .setTitle('❌ No Results')
        .setDescription('No cards found matching your search.')
        .setColor(0xff0000);
      await loadingMsg.edit({ embeds: [noResultsEmbed] });
      return;
    }
    
    if (results.length === 1) {
      const embed = createCardEmbed(results[0]);
      await loadingMsg.edit({ embeds: [embed] });
    } else {
      const embed = createResultsEmbed(results, message.author.id);
      await loadingMsg.edit({ embeds: [embed] });
    }
  },
  
  // Handle number selection
  handleSelection: async (message) => {
    const userId = message.author.id;
    const selection = parseInt(message.content);
    
    if (!userSearches.has(userId)) return false;
    
    // Show loading for selection
    const loadingEmbed = new EmbedBuilder()
      .setTitle('⚡ Loading Card...')
      .setDescription('```\n░░░▓▓▓▓▓░░ Loading card details...\n```')
      .setColor(0x808080);
    
    const loadingMsg = await message.reply({ embeds: [loadingEmbed] });
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const results = userSearches.get(userId);
    
    if (selection >= 1 && selection <= results.length) {
      const card = results[selection - 1];
      const embed = createCardEmbed(card);
      await loadingMsg.edit({ embeds: [embed] });
      userSearches.delete(userId);
      return true;
    } else {
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Invalid Selection')
        .setDescription('Please choose a valid number.')
        .setColor(0xff0000);
      await loadingMsg.edit({ embeds: [errorEmbed] });
      return true;
    }
  }
};
