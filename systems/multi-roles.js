const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const BotSettings = require('../database/BotSettings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('multi-roles')
    .setDescription('Enable or disable multi-role system for bosses and cards')
    .addSubcommand(subcommand =>
      subcommand
        .setName('enable')
        .setDescription('Enable multi-role system (separate roles for each tier/rarity)'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('disable')
        .setDescription('Disable multi-role system (use single role for all bosses/cards)'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('set-boss')
        .setDescription('Set role for a specific boss tier')
        .addStringOption(option =>
          option.setName('tier')
            .setDescription('Boss tier')
            .setRequired(true)
            .addChoices(
              { name: 'Tier 1', value: 'tier1' },
              { name: 'Tier 2', value: 'tier2' },
              { name: 'Tier 3', value: 'tier3' }
            ))
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('Role to ping for this tier')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('set-card')
        .setDescription('Set role for a specific card rarity')
        .addStringOption(option =>
          option.setName('rarity')
            .setDescription('Card rarity')
            .setRequired(true)
            .addChoices(
              { name: 'Common', value: 'common' },
              { name: 'Uncommon', value: 'uncommon' },
              { name: 'Rare', value: 'rare' },
              { name: 'Exotic', value: 'exotic' },
              { name: 'Legendary', value: 'legendary' }
            ))
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('Role to ping for this rarity')
            .setRequired(false)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    let settings = await BotSettings.findOne({ guildId });
    if (!settings) {
      settings = new BotSettings({ guildId });
    }

    if (subcommand === 'enable') {
      settings.multiRoleEnabled = true;
      await settings.save();
      
      return interaction.reply({
        content: '✅ Multi-role system enabled! Use `/multi-roles set-boss` and `/multi-roles set-card` to configure roles for each tier/rarity.',
        ephemeral: true
      });
    }

    if (subcommand === 'disable') {
      settings.multiRoleEnabled = false;
      await settings.save();
      
      return interaction.reply({
        content: '✅ Multi-role system disabled! Bot will use single roles set via `/set-boss-role` and `/set-card-role`.',
        ephemeral: true
      });
    }

    if (subcommand === 'set-boss') {
      if (!settings.multiRoleEnabled) {
        return interaction.reply({
          content: '❌ Multi-role system is not enabled! Use `/multi-roles enable` first.',
          ephemeral: true
        });
      }

      const tier = interaction.options.getString('tier');
      const role = interaction.options.getRole('role');
      
      const fieldName = `${tier}RoleId`;
      settings[fieldName] = role ? role.id : null;
      await settings.save();

      if (role) {
        return interaction.reply({
          content: `✅ ${tier.toUpperCase()} boss role set to ${role}`,
          ephemeral: true
        });
      } else {
        return interaction.reply({
          content: `✅ ${tier.toUpperCase()} boss role removed`,
          ephemeral: true
        });
      }
    }

    if (subcommand === 'set-card') {
      if (!settings.multiRoleEnabled) {
        return interaction.reply({
          content: '❌ Multi-role system is not enabled! Use `/multi-roles enable` first.',
          ephemeral: true
        });
      }

      const rarity = interaction.options.getString('rarity');
      const role = interaction.options.getRole('role');
      
      const fieldName = `${rarity}RoleId`;
      settings[fieldName] = role ? role.id : null;
      await settings.save();

      if (role) {
        return interaction.reply({
          content: `✅ ${rarity.charAt(0).toUpperCase() + rarity.slice(1)} card role set to ${role}`,
          ephemeral: true
        });
      } else {
        return interaction.reply({
          content: `✅ ${rarity.charAt(0).toUpperCase() + rarity.slice(1)} card role removed`,
          ephemeral: true
        });
      }
    }
  },
};
