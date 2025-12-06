const { SlashCommandBuilder } = require('discord.js');
const { updateUserSettings, getUserSettings } = require('../utils/userSettingsManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dm')
    .setDescription('Enable or disable DM notifications.')
    .addSubcommand(subcommand =>
      subcommand
        .setName('enable')
        .setDescription('Enable DM notifications for a specific type.')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('The notification type to enable.')
            .setRequired(true)
            .addChoices(
              { name: 'Expedition', value: 'expedition' },
              { name: 'Stamina', value: 'stamina' }
            )))
    .addSubcommand(subcommand =>
      subcommand
        .setName('disable')
        .setDescription('Disable DM notifications for a specific type.')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('The notification type to disable.')
            .setRequired(true)
            .addChoices(
              { name: 'Expedition', value: 'expedition' },
              { name: 'Stamina', value: 'stamina' }
            ))),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const type = interaction.options.getString('type');
    const enabled = subcommand === 'enable';
    const dmType = `${type}DM`;

    await updateUserSettings(interaction.user.id, { [dmType]: enabled });

    const replyContent = `You will now ${enabled ? 'receive' : 'stop receiving'} ${type} reminders in your DMs.`;

    await interaction.reply({
      content: replyContent,
      flags: 1 << 6,
    });
  },
};