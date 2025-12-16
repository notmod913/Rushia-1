const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { LUVI_BOT_ID } = require('../config/constants');
const fields = require('../config/builderFields.js');

const generatorData = new Map();
const availableFields = fields.filter(field => field.key !== 'name' && field.values && field.values.length > 0);

function parseInventoryEmbed(embed) {
  const cards = [];
  if (embed.fields && embed.fields.length > 0) {
    embed.fields.forEach((field) => {
      const nameMatch = field.name.match(/<:LU_(?:C|UC|R|E|L|M):[^>]+>\s*([^|]+?)(?:\s*\|.*)?$/);
      const valueMatch = field.value.match(/#(\d+)\s*\|\s*ID:\s*`(\d+)`/);
      if (nameMatch && valueMatch) {
        let cleanName = nameMatch[1].trim().replace(/🔒/g, '').replace(/\s+/g, ' ').trim();
        cards.push({ name: cleanName, position: valueMatch[1], id: valueMatch[2] });
      }
    });
  }
  return cards;
}

function createNameDropdown(cards, userId) {
  const options = [
    { label: '✅ Select All (Current Page)', description: `Add all ${Math.min(cards.length, 25)} cards from this page`, value: 'SELECT_ALL' },
    ...cards.slice(0, 25).map((card, index) => ({ label: `${card.name} #${card.position}`, description: `ID: ${card.id}`, value: `${index}` }))
  ];
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`name_select_${userId}`)
    .setPlaceholder('🔽 Select a card from your inventory')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(options);
  return new ActionRowBuilder().addComponents(selectMenu);
}

function createNameActionButtons(userId, hasSelection = false) {
  const addButton = new ButtonBuilder()
    .setCustomId(`add_name_${userId}`)
    .setLabel('➕ Add')
    .setStyle(ButtonStyle.Success)
    .setDisabled(!hasSelection);
  const removeButton = new ButtonBuilder()
    .setCustomId(`remove_name_${userId}`)
    .setLabel('➖ Remove')
    .setStyle(ButtonStyle.Danger)
    .setDisabled(!hasSelection);
  const nextButton = new ButtonBuilder()
    .setCustomId(`next_section_${userId}`)
    .setLabel('➡️ Next Section')
    .setStyle(ButtonStyle.Primary);
  return new ActionRowBuilder().addComponents(addButton, removeButton, nextButton);
}

function getAvailableFieldsForSelection(selectedFields) {
  return availableFields.filter(field => !selectedFields.hasOwnProperty(field.key));
}

function createFieldSelectionDropdown(userId, selectedFields) {
  const availableForSelection = getAvailableFieldsForSelection(selectedFields);
  if (availableForSelection.length === 0) return null;
  const options = availableForSelection.map(field => ({
    label: field.key.charAt(0).toUpperCase() + field.key.slice(1),
    description: `Select values for ${field.key}`,
    value: field.key
  }));
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select_field_${userId}`)
    .setPlaceholder('🔽 Select a field to configure')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(options);
  return new ActionRowBuilder().addComponents(selectMenu);
}

function createFieldValueDropdown(field, userId) {
  const options = field.values.map(value => ({ label: value, value: value.toLowerCase() }));
  const maxValues = field.type === 'toggle' ? 1 : Math.min(options.length, 25);
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`fieldval_${userId}_${field.key}`)
    .setPlaceholder(`Select ${field.key} values`)
    .setMinValues(1)
    .setMaxValues(maxValues)
    .addOptions(options);
  return new ActionRowBuilder().addComponents(selectMenu);
}

function createGenerateButton(userId) {
  const finishButton = new ButtonBuilder()
    .setCustomId(`finish_generator_${userId}`)
    .setLabel('🎯 Generate Command')
    .setStyle(ButtonStyle.Success);
  return new ActionRowBuilder().addComponents(finishButton);
}

function buildCommandPreview(userData) {
  let command = `<@${LUVI_BOT_ID}> inv`;
  if (userData.selectedNames.length > 0) {
    command += ` -name ${userData.selectedNames.join(',')}`;
  }
  Object.entries(userData.selectedFields).forEach(([key, values]) => {
    if (values.length > 0) {
      command += ` -${key} ${values.join(',')}`;
    }
  });
  return command;
}

function formatSelectedFields(selectedFields) {
  if (Object.keys(selectedFields).length === 0) return 'None';
  return Object.entries(selectedFields)
    .map(([key, values]) => `**${key}:** ${values.join(', ')}`)
    .join('\n');
}

async function processInventoryMessage(message) {
  if (message.author.id !== LUVI_BOT_ID) return;
  if (!message.embeds.length) {
    setTimeout(async () => {
      try {
        const fetchedMessage = await message.channel.messages.fetch(message.id);
        if (fetchedMessage.embeds.length > 0) {
          await processInventoryEmbed(fetchedMessage);
        }
      } catch (error) {
        console.error('Error fetching message after delay:', error);
      }
    }, 2000);
    return;
  }
  await processInventoryEmbed(message);
}

async function processInventoryEmbed(message) {
  const embed = message.embeds[0];
  if (!embed.title || !embed.title.includes('<:LU_Inventory:') || !embed.title.includes("'s Inventory")) return;
  try {
    await message.react('🔍');
    await message.react('🆔');
  } catch (error) {
    console.error('Failed to react to inventory:', error);
  }
}

async function handleGeneratorReaction(reaction, user) {
  if (user.bot) return;
  if (reaction.emoji.name === '🔍') {
    await handleCommandBuilderReaction(reaction, user);
  } else if (reaction.emoji.name === '🆔') {
    await handleIDExtractorReaction(reaction, user);
  }
}

async function handleCommandBuilderReaction(reaction, user) {
  const message = reaction.message;
  if (!message.embeds.length) return;
  const embed = message.embeds[0];
  if (!embed.title || !embed.title.includes('<:LU_Inventory:') || !embed.title.includes("'s Inventory")) return;
  const usernameMatch = embed.title.match(/<:LU_Inventory:[^>]+>\s*(.+?)'s Inventory/);
  if (!usernameMatch) return;
  const inventoryUsername = usernameMatch[1];
  if (user.username !== inventoryUsername) return;
  try {
    await reaction.users.remove(user);
    await reaction.users.remove(reaction.client.user);
  } catch (error) {
    console.error('Failed to remove reactions:', error);
  }
  const cards = parseInventoryEmbed(embed);
  if (!cards.length) return;
  generatorData.set(user.id, {
    cards,
    selectedNames: [],
    selectedFields: {},
    currentSelection: null,
    inventoryMessageId: message.id,
    inventoryChannelId: message.channel.id
  });
  const dropdown = createNameDropdown(cards, user.id);
  const actionButtons = createNameActionButtons(user.id, false);
  const generatorEmbed = new EmbedBuilder()
    .setTitle('🛠️ Command Builder')
    .setColor(0x3498db)
    .addFields(
      { name: '🔍 Currently Selected', value: 'None', inline: true },
      { name: '📝 Command', value: `\`<@${LUVI_BOT_ID}> inv\``, inline: true }
    );
  try {
    const dropdownMessage = await message.channel.send({
      content: `<@${user.id}>`,
      embeds: [generatorEmbed],
      components: [dropdown, actionButtons]
    });
    generatorData.set(`dropdown_${user.id}`, dropdownMessage.id);
    generatorData.set(`main_message_${user.id}`, dropdownMessage);
    startInventoryWatcher(user.id, message);
  } catch (error) {
    console.error('Failed to send generator message:', error);
  }
}

async function handleIDExtractorReaction(reaction, user) {
  const message = reaction.message;
  if (!message.embeds.length) return;
  const embed = message.embeds[0];
  if (!embed.title || !embed.title.includes('<:LU_Inventory:') || !embed.title.includes("'s Inventory")) return;
  const usernameMatch = embed.title.match(/<:LU_Inventory:[^>]+>\s*(.+?)'s Inventory/);
  if (!usernameMatch) return;
  const inventoryUsername = usernameMatch[1];
  if (user.username !== inventoryUsername) return;
  try {
    await reaction.users.remove(user);
    await reaction.users.remove(reaction.client.user);
  } catch (error) {
    console.error('Failed to remove reactions:', error);
  }
  const cards = parseInventoryEmbed(embed);
  if (!cards.length) return;
  generatorData.set(`idextractor_${user.id}`, {
    cards,
    allIds: cards.map(card => card.id),
    inventoryMessageId: message.id,
    inventoryChannelId: message.channel.id
  });
  const idList = cards.map(card => card.id).join(',');
  try {
    const idMessage = await message.channel.send(idList || 'No cards');
    generatorData.set(`idmessage_${user.id}`, idMessage);
    startIDWatcher(user.id, message);
  } catch (error) {
    console.error('Failed to send ID list:', error);
  }
}

async function handleNameSelect(interaction) {
  if (!interaction.customId.startsWith('name_select_')) return false;
  try {
    await interaction.deferUpdate();
    const userId = interaction.customId.split('_')[2];
    if (interaction.user.id !== userId) {
      await interaction.followUp({ content: 'This is not your generator!', flags: 1 << 6 });
      return true;
    }
    const userData = generatorData.get(userId);
    if (!userData) {
      await interaction.followUp({ content: 'Generator data not found!', flags: 1 << 6 });
      return true;
    }
    if (interaction.values[0] === 'SELECT_ALL') {
      const cardsToAdd = userData.cards.slice(0, 25);
      cardsToAdd.forEach(card => {
        if (!userData.selectedNames.includes(card.name)) {
          userData.selectedNames.push(card.name);
        }
      });
      const dropdown = createNameDropdown(userData.cards, userId);
      const actionButtons = createNameActionButtons(userId, false);
      const commandPreview = buildCommandPreview(userData);
      const embed = new EmbedBuilder()
        .setTitle('🛠️ Command Builder')
        .setColor(0x3498db)
        .addFields(
          { name: '🔍 Currently Selected', value: 'All Added', inline: true },
          { name: '📝 Command', value: `\`${commandPreview}\``, inline: true }
        );
      await interaction.editReply({ embeds: [embed], components: [dropdown, actionButtons] });
      return true;
    }
    const selectedIndex = parseInt(interaction.values[0]);
    const selectedCard = userData.cards[selectedIndex];
    userData.currentSelection = selectedCard;
    const dropdown = createNameDropdown(userData.cards, userId);
    const actionButtons = createNameActionButtons(userId, true);
    const commandPreview = buildCommandPreview(userData);
    const embed = new EmbedBuilder()
      .setTitle('🛠️ Command Builder')
      .setColor(0x3498db)
      .addFields(
        { name: '🔍 Currently Selected', value: `**${selectedCard.name}**`, inline: true },
        { name: '📝 Command', value: `\`${commandPreview}\``, inline: true }
      );
    await interaction.editReply({ embeds: [embed], components: [dropdown, actionButtons] });
    return true;
  } catch (error) {
    console.error('Error in handleNameSelect:', error);
    return true;
  }
}

async function handleAddName(interaction) {
  if (!interaction.customId.startsWith('add_name_')) return false;
  await interaction.deferUpdate();
  const userId = interaction.customId.split('_')[2];
  if (interaction.user.id !== userId) {
    await interaction.followUp({ content: 'This is not your generator!', flags: 1 << 6 });
    return true;
  }
  const userData = generatorData.get(userId);
  if (!userData || !userData.currentSelection) {
    await interaction.followUp({ content: 'No card selected!', flags: 1 << 6 });
    return true;
  }
  const cardName = userData.currentSelection.name;
  if (!userData.selectedNames.includes(cardName)) {
    userData.selectedNames.push(cardName);
  }
  const dropdown = createNameDropdown(userData.cards, userId);
  const actionButtons = createNameActionButtons(userId, true);
  const commandPreview = buildCommandPreview(userData);
  const embed = new EmbedBuilder()
    .setTitle('🛠️ Command Builder')
    .setColor(0x3498db)
    .addFields(
      { name: '🔍 Currently Selected', value: `**${userData.currentSelection.name}**`, inline: true },
      { name: '📝 Command', value: `\`${commandPreview}\``, inline: true }
    );
  await interaction.editReply({ embeds: [embed], components: [dropdown, actionButtons] });
  return true;
}

async function handleRemoveName(interaction) {
  if (!interaction.customId.startsWith('remove_name_')) return false;
  await interaction.deferUpdate();
  const userId = interaction.customId.split('_')[2];
  if (interaction.user.id !== userId) {
    await interaction.followUp({ content: 'This is not your generator!', flags: 1 << 6 });
    return true;
  }
  const userData = generatorData.get(userId);
  if (!userData || !userData.currentSelection) {
    await interaction.followUp({ content: 'No card selected!', flags: 1 << 6 });
    return true;
  }
  const cardName = userData.currentSelection.name;
  userData.selectedNames = userData.selectedNames.filter(name => name !== cardName);
  const dropdown = createNameDropdown(userData.cards, userId);
  const actionButtons = createNameActionButtons(userId, true);
  const commandPreview = buildCommandPreview(userData);
  const embed = new EmbedBuilder()
    .setTitle('🛠️ Command Builder')
    .setColor(0x3498db)
    .addFields(
      { name: '🔍 Currently Selected', value: `**${userData.currentSelection.name}**`, inline: true },
      { name: '📝 Command', value: `\`${commandPreview}\``, inline: true }
    );
  await interaction.editReply({ embeds: [embed], components: [dropdown, actionButtons] });
  return true;
}

async function handleNextSection(interaction) {
  if (!interaction.customId.startsWith('next_section_')) return false;
  await interaction.deferUpdate();
  const userId = interaction.customId.split('_')[2];
  if (interaction.user.id !== userId) {
    await interaction.followUp({ content: 'This is not your generator!', flags: 1 << 6 });
    return true;
  }
  const userData = generatorData.get(userId);
  if (!userData) {
    await interaction.followUp({ content: 'Generator data not found!', flags: 1 << 6 });
    return true;
  }
  const fieldDropdown = createFieldSelectionDropdown(userId, userData.selectedFields);
  const commandPreview = buildCommandPreview(userData);
  const fieldsText = formatSelectedFields(userData.selectedFields);
  
  const components = [];
  if (fieldDropdown) {
    components.push(fieldDropdown);
  }
  components.push(createGenerateButton(userId));
  
  const embed = new EmbedBuilder()
    .setTitle('🛠️ Command Builder')
    .setColor(0x27ae60)
    .addFields(
      { name: '📝 Command', value: `\`${commandPreview}\``, inline: false },
      { name: '⚙️ Fields', value: fieldsText, inline: false }
    );
  await interaction.editReply({ embeds: [embed], components });
  return true;
}

async function handleSelectField(interaction) {
  if (!interaction.customId.startsWith('select_field_')) return false;
  await interaction.deferReply({ flags: 1 << 6 });
  const userId = interaction.customId.split('_')[2];
  if (interaction.user.id !== userId) {
    await interaction.editReply({ content: 'This is not your generator!' });
    return true;
  }
  const userData = generatorData.get(userId);
  if (!userData) {
    await interaction.editReply({ content: 'Generator data not found!' });
    return true;
  }
  const fieldKey = interaction.values[0];
  const field = availableFields.find(f => f.key === fieldKey);
  if (!field) return false;
  const valueDropdown = createFieldValueDropdown(field, userId);
  const embed = new EmbedBuilder()
    .setTitle(`Configure ${field.key.charAt(0).toUpperCase() + field.key.slice(1)}`)
    .setDescription(`Select values for **${field.key}**`)
    .setColor(0xff9900);
  await interaction.editReply({ embeds: [embed], components: [valueDropdown] });
  return true;
}

async function handleSelectFieldValue(interaction) {
  if (!interaction.customId.startsWith('fieldval_')) return false;
  await interaction.deferUpdate();
  const customId = interaction.customId;
  const match = customId.match(/^fieldval_([^_]+)_(.+)$/);
  if (!match) return false;
  const userId = match[1];
  const fieldKey = match[2];
  if (interaction.user.id !== userId) {
    await interaction.followUp({ content: 'This is not your generator!', flags: 1 << 6 });
    return true;
  }
  const userData = generatorData.get(userId);
  if (!userData) {
    await interaction.followUp({ content: 'Generator data not found!', flags: 1 << 6 });
    return true;
  }
  userData.selectedFields[fieldKey] = interaction.values;
  const embed = new EmbedBuilder()
    .setTitle('✅ Field Configured')
    .setDescription(`**${fieldKey}:** ${interaction.values.join(', ')}`)
    .setColor(0x27ae60);
  await interaction.editReply({ embeds: [embed], components: [] });
  
  try {
    const mainMessage = generatorData.get(`main_message_${userId}`);
    if (mainMessage) {
      const fieldDropdown = createFieldSelectionDropdown(userId, userData.selectedFields);
      const commandPreview = buildCommandPreview(userData);
      const fieldsText = formatSelectedFields(userData.selectedFields);
      
      const components = [];
      if (fieldDropdown) {
        components.push(fieldDropdown);
      }
      components.push(createGenerateButton(userId));
      
      const mainEmbed = new EmbedBuilder()
        .setTitle('🛠️ Command Builder')
        .setColor(0x27ae60)
        .addFields(
          { name: '📝 Command', value: `\`${commandPreview}\``, inline: false },
          { name: '⚙️ Fields', value: fieldsText, inline: false }
        );
      
      await mainMessage.edit({ embeds: [mainEmbed], components });
    }
  } catch (error) {
    console.error('Error updating main message:', error);
  }
  
  return true;
}

async function handleFinishGenerator(interaction) {
  if (!interaction.customId.startsWith('finish_generator_')) return false;
  await interaction.deferUpdate();
  const userId = interaction.customId.split('_')[2];
  if (interaction.user.id !== userId) {
    await interaction.followUp({ content: 'This is not your generator!', flags: 1 << 6 });
    return true;
  }
  const userData = generatorData.get(userId);
  if (!userData) {
    await interaction.followUp({ content: 'Generator data not found!', flags: 1 << 6 });
    return true;
  }
  const command = buildCommandPreview(userData);
  const embed = new EmbedBuilder()
    .setTitle('🎯 Generated Command')
    .setColor(0x27ae60)
    .addFields(
      { name: 'Command', value: `\`\`\`${command}\`\`\``, inline: false }
    );
  await interaction.editReply({ embeds: [embed], components: [] });
  generatorData.delete(userId);
  generatorData.delete(`dropdown_${userId}`);
  generatorData.delete(`main_message_${userId}`);
  return true;
}

function startInventoryWatcher(userId, inventoryMessage) {
  const checkInterval = setInterval(async () => {
    const userData = generatorData.get(userId);
    if (!userData) {
      clearInterval(checkInterval);
      return;
    }
    try {
      const channel = await inventoryMessage.client.channels.fetch(userData.inventoryChannelId);
      const message = await channel.messages.fetch(userData.inventoryMessageId);
      if (!message.embeds.length) return;
      const embed = message.embeds[0];
      const newCards = parseInventoryEmbed(embed);
      if (JSON.stringify(newCards) !== JSON.stringify(userData.cards)) {
        userData.cards = newCards;
        const mainMessage = generatorData.get(`main_message_${userId}`);
        if (mainMessage) {
          const dropdown = createNameDropdown(newCards, userId);
          const actionButtons = createNameActionButtons(userId, userData.currentSelection !== null);
          const commandPreview = buildCommandPreview(userData);
          const updateEmbed = new EmbedBuilder()
            .setTitle('🛠️ Command Builder')
            .setColor(0x3498db)
            .addFields(
              { name: '🔍 Currently Selected', value: userData.currentSelection ? `**${userData.currentSelection.name}**` : 'None', inline: true },
              { name: '📝 Command', value: `\`${commandPreview}\``, inline: true }
            );
          await mainMessage.edit({ embeds: [updateEmbed], components: [dropdown, actionButtons] });
        }
      }
    } catch (error) {
      console.error('Error in inventory watcher:', error);
      clearInterval(checkInterval);
    }
  }, 2000);
  setTimeout(() => clearInterval(checkInterval), 10 * 60 * 1000);
}

function startIDWatcher(userId, inventoryMessage) {
  const checkInterval = setInterval(async () => {
    const userData = generatorData.get(`idextractor_${userId}`);
    if (!userData) {
      clearInterval(checkInterval);
      return;
    }
    try {
      const channel = await inventoryMessage.client.channels.fetch(userData.inventoryChannelId);
      const message = await channel.messages.fetch(userData.inventoryMessageId);
      if (!message.embeds.length) return;
      const embed = message.embeds[0];
      const newCards = parseInventoryEmbed(embed);
      if (JSON.stringify(newCards) !== JSON.stringify(userData.cards)) {
        const newIds = newCards.filter(card => !userData.allIds.includes(card.id)).map(card => card.id);
        userData.cards = newCards;
        userData.allIds.push(...newIds);
        const idMessage = generatorData.get(`idmessage_${userId}`);
        if (idMessage) {
          await idMessage.edit(userData.allIds.join(',') || 'No cards');
        }
      }
    } catch (error) {
      console.error('Error in ID watcher:', error);
      clearInterval(checkInterval);
    }
  }, 2000);
  setTimeout(() => clearInterval(checkInterval), 10 * 60 * 1000);
}

module.exports = {
  processInventoryMessage,
  handleGeneratorReaction,
  handleNameSelect,
  handleAddName,
  handleRemoveName,
  handleNextSection,
  handleSelectField,
  handleSelectFieldValue,
  handleFinishGenerator
};
