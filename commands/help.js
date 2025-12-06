const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

const helpCategories = {
  overview: {
    title: '🤖 Rushia Bot - Overview',
    description: 'Welcome to Luvi Helper Bot! Select a category from the dropdown below to learn more.',
    fields: [
      { name: '📋 Admin Commands', value: 'Server configuration and role management', inline: true },
      { name: '👤 User Commands', value: 'Personal notification settings', inline: true },
      { name: '🔍 Card Search', value: 'Search through 1000+ cards', inline: true },
      { name: '📦 Inventory Helper', value: 'Interactive inventory management', inline: true },
      { name: '🔧 Auto Features', value: 'Automatic detection and reminders', inline: true },
      { name: '💡 Tips', value: 'Helpful tips and tricks', inline: true }
    ]
  },
  admin: {
    title: '📋 Admin Commands',
    description: '*Requires Manage Roles permission*',
    fields: [
      { name: '/set-boss-role [role]', value: 'Set role to ping for all boss spawns (all tiers)' },
      { name: '/set-card-role [role]', value: 'Set role to ping for all card spawns (all rarities)' },
      { name: '/view-settings', value: 'View current server configuration' }
    ]
  },
  user: {
    title: '👤 User Commands',
    description: 'Manage your personal notification preferences',
    fields: [
      { name: '/notifications view', value: 'View your personal notification settings' },
      { name: '/notifications set', value: '**Types:**\n• expedition - Expedition completion reminders\n• stamina - Stamina refill reminders (100%)\n• raid - Raid fatigue recovery reminders\n• raidSpawnReminder - 30-minute raid spawn reminders' },
      { name: '/dm enable/disable', value: '**Types:**\n• expedition - Get expedition reminders via DM\n• stamina - Get stamina reminders via DM' }
    ]
  },
  search: {
    title: '🔍 Card Search',
    description: 'Search through 1000+ cards using mentions',
    fields: [
      { name: 'Usage', value: '`@bot f <query>` or `@bot find <query>`' },
      { name: 'Examples', value: '• `@bot f naruto` - Find Naruto characters\n• `@bot find fire duelist` - Find fire duelist cards\n• `@bot f bleach ice` - Find ice cards from Bleach\n• `@bot find support light` - Find light support cards' },
      { name: 'Multiple Results', value: 'Type number (1, 2, 3) to select' },
      { name: 'Single Result', value: 'Shows card details directly' }
    ]
  },
  inventory: {
    title: '📦 Inventory Helper',
    description: 'Interactive inventory management system',
    fields: [
      { name: 'How to Use', value: 'React with 📦 on your Luvi inventory embed' },
      { name: 'Features', value: '• Interactive dropdown to select cards\n• Print card names and IDs easily\n• Auto-updates when you change inventory pages' },
      { name: '🔍 Message Generator', value: 'React with 🔍 on inventory to build custom search commands' }
    ]
  },
  auto: {
    title: '🔧 Automatic Features',
    description: 'Features that work automatically in the background',
    fields: [
      { name: 'Boss Detection', value: 'Auto-detects all tier boss spawns from Luvi bot' },
      { name: 'Card Detection', value: 'Auto-detects all rarity card spawns from Luvi bot' },
      { name: 'Inventory Detection', value: 'Auto-reacts to inventory embeds with 📦 and 🔍' },
      { name: 'Smart Reminders', value: 'Automatically sets reminders when you:\n• Run out of stamina (100-minute reminder)\n• Send cards on expeditions (completion reminders)\n• Get raid fatigue (recovery reminders)' }
    ]
  },
  tips: {
    title: '💡 Tips & Tricks',
    description: 'Helpful information to get the most out of the bot',
    fields: [
      { name: 'Role Management', value: 'Leave role parameter empty to remove ping roles' },
      { name: 'DM Notifications', value: 'Raid reminders are always sent via DM' },
      { name: 'Permissions', value: 'Bot requires permission to mention roles' },
      { name: 'Settings', value: 'All personal settings are per-user across servers' },
      { name: 'Support', value: 'Contact bot owner for bugs or suggestions' }
    ]
  }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Shows setup instructions for Luvi Helper Bot'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle(helpCategories.overview.title)
      .setDescription(helpCategories.overview.description)
      .addFields(helpCategories.overview.fields)
      .setColor(0x0099ff)
      .setFooter({ text: 'Select a category from the dropdown below' });

    const dropdown = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`help_category_${interaction.user.id}`)
          .setPlaceholder('Select a help category')
          .addOptions([
            { label: 'Overview', value: 'overview', emoji: '🤖', description: 'Main help page' },
            { label: 'Admin Commands', value: 'admin', emoji: '📋', description: 'Server configuration' },
            { label: 'User Commands', value: 'user', emoji: '👤', description: 'Personal settings' },
            { label: 'Card Search', value: 'search', emoji: '🔍', description: 'Search cards' },
            { label: 'Inventory Helper', value: 'inventory', emoji: '📦', description: 'Inventory tools' },
            { label: 'Auto Features', value: 'auto', emoji: '🔧', description: 'Automatic features' },
            { label: 'Tips & Tricks', value: 'tips', emoji: '💡', description: 'Helpful tips' }
          ])
      );

    await interaction.reply({ embeds: [embed], components: [dropdown], ephemeral: true });
  },
};

async function handleHelpCategory(interaction) {
  if (!interaction.customId.startsWith('help_category_')) return false;

  const userId = interaction.customId.split('_')[2];
  if (interaction.user.id !== userId) {
    await interaction.reply({ content: 'This is not your help menu!', ephemeral: true });
    return true;
  }

  const category = interaction.values[0];
  const categoryData = helpCategories[category];

  const embed = new EmbedBuilder()
    .setTitle(categoryData.title)
    .setDescription(categoryData.description)
    .addFields(categoryData.fields)
    .setColor(0x0099ff)
    .setFooter({ text: 'Select another category to learn more' });

  await interaction.update({ embeds: [embed] });
  return true;
}

module.exports.handleHelpCategory = handleHelpCategory;
