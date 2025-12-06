const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const BotSettings = require('../database/BotSettings');
const { BOT_OWNER_ID, COLORS } = require('../config/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('view-settings')
    .setDescription('View current boss tier and card ping roles'),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      return interaction.reply({ content: 'This command can only be used in a server.', flags: 1 << 6 });
    }

    const member = interaction.member;

    const hasPermission =
      member.permissions.has(PermissionsBitField.Flags.ManageRoles) ||
      interaction.user.id === BOT_OWNER_ID;

    if (!hasPermission) {
      return interaction.reply({
        content: '❌ You do not have permission to use this command.',
        flags: 1 << 6,
      });
    }

    try {
      const guildId = interaction.guild.id;
      const settings = await BotSettings.findOne({ guildId });

      if (!settings) {
        return interaction.reply({
          content: '⚠️ No settings found for this server.',
         flags: 1 << 6,
        });
      }

      const bossRole = settings.bossRoleId ? `<@&${settings.bossRoleId}>` : '❌ Not set';

      const cardRoleDisplay = settings.cardPingId ? `<@&${settings.cardPingId}>` : '❌ Not set';

      const embed = {
        color: COLORS.INFO,
        title: '📊 Current Role Settings',
        description: [
          `**Boss Role:** ${bossRole}`,
          '',
          `**Card Role:** ${cardRoleDisplay}`
        ].join('\n'),
        footer: { text: 'Luvi Helper Settings' }
      };

      await interaction.reply({ embeds: [embed], flags: 1 << 6 });
    } catch (error) {
      console.error(`[ERROR] Failed to view settings: ${error.message}`, error);
      await interaction.reply({ content: '❌ An error occurred while trying to view settings.', flags: 1 << 6 });
    }
  },
};
