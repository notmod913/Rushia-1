const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Shows setup instructions for Luvi Helper Bot'),

  async execute(interaction) {
 const helpMessage = `
**🤖 Luvi Helper Bot - Complete Guide**

**📋 ADMIN COMMANDS** *(Requires Manage Roles permission)*
• \`/set-boss-role [role]\` — Set role to ping for all boss spawns (all tiers)
• \`/card_role [role]\` — Set role to ping for all card spawns (all rarities)
• \`/view-settings\` — View current server configuration

**👤 USER COMMANDS**
• \`/notifications view\` — View your personal notification settings
• \`/notifications set <type> <enabled>\` — Configure notifications:
  - **expedition** — Expedition completion reminders
  - **stamina** — Stamina refill reminders (100%)
  - **raid** — Raid fatigue recovery reminders
  - **raidSpawnReminder** — 30-minute raid spawn reminders

• \`/dm enable/disable <type>\` — Configure DM notifications:
  - **expedition** — Get expedition reminders via DM
  - **stamina** — Get stamina reminders via DM

**🔍 CARD SEARCH**
• \`@bot f <query>\` or \`@bot find <query>\` — Search through 1000+ cards
  - **Examples:**
    - \`@bot f naruto\` — Find Naruto characters
    - \`@bot find fire duelist\` — Find fire duelist cards
    - \`@bot f bleach ice\` — Find ice cards from Bleach
    - \`@bot find support light\` — Find light support cards
  - **Multiple results:** Type number (1, 2, 3) to select
  - **Single result:** Shows card details directly

**📦 INVENTORY HELPER**
• React with 📦 on your Luvi inventory to get interactive dropdown
• Select cards and print names/IDs easily

**🔧 AUTOMATIC FEATURES**
• **Boss Detection** — Auto-detects all tier boss spawns from Luvi bot
• **Card Detection** — Auto-detects all rarity card spawns from Luvi bot
• **Inventory Detection** — Auto-reacts to inventory embeds with 📦
• **Smart Reminders** — Automatically sets reminders when you:
  - Run out of stamina (100-minute reminder)
  - Send cards on expeditions (completion reminders)
  - Get raid fatigue (recovery reminders)

**💡 TIPS**
• Leave role parameter empty to remove ping roles
• Raid reminders are always sent via DM
• Bot requires permission to mention roles
• All personal settings are per-user across servers

**🆘 Need Help?** Contact support for bugs or suggestions.
`;

    await interaction.reply({ content: helpMessage, flags: 1 << 6 }); 
  },
};
