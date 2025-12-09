const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { LUVI_BOT_ID } = require('../config/constants');
const fields = require('../config/builderFields.js');

// Store data for users
const generatorData = new Map();

// Get all available fields (excluding name which is handled separately)
const availableFields = fields.filter(field => field.key !== 'name' && field.values && field.values.length > 0);

function parseInventoryEmbed(embed) {
  const cards = [];
  
  if (embed.fields && embed.fields.length > 0) {
    embed.fields.forEach((field) => {
      const nameMatch = field.name.match(/<:LU_(?:C|UC|R|E|L|M):[^>]+>\s*([^|]+?)(?:\s*\|.*)?$/);
      const valueMatch = field.value.match(/#(\d+)\s*\|\s*ID:\s*`(\d+)`/);
      
      if (nameMatch && valueMatch) {
        let cleanName = nameMatch[1].trim().replace(/🔒/g, '').replace(/\s+/g, ' ').trim();
        cards.push({
          name: cleanName,
          position: valueMatch[1],
          id: valueMatch[2]
        });
      }
    });
  }
  
  return cards;
}

function createNameDropdown(cards, userId) {
  const options = [
    {
      label: '✅ Select All (Current Page)',
      description: `Add all ${Math.min(cards.length, 25)} cards from this page`,
      value: 'SELECT_ALL'
    },
    ...cards.slice(0, 25).map((card, index) => ({
      label: `${card.name} #${card.position}`,
      description: `ID: ${card.id}`,
      value: `${index}`
    }))
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

function createFieldDropdown(field, userId) {
  const options = field.values.map(value => ({
    label: value,
    value: value.toLowerCase()
  }));
  
  const maxValues = field.type === 'toggle' ? 1 : Math.min(options.length, 25);
  
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`field_select_${field.key}_${userId}`)
    .setPlaceholder(`Select ${field.key}`)
    .setMinValues(1)
    .setMaxValues(maxValues)
    .addOptions(options);
  
  return new ActionRowBuilder().addComponents(selectMenu);
}

function createFieldSelectionMenu(userId, selectedFields) {
  const buttons = [];
  
  availableFields.forEach(field => {
    const isSelected = selectedFields.hasOwnProperty(field.key);
    const button = new ButtonBuilder()
      .setCustomId(`add_field_${field.key}_${userId}`)
      .setLabel(field.key.charAt(0).toUpperCase() + field.key.slice(1))
      .setStyle(isSelected ? ButtonStyle.Success : ButtonStyle.Secondary);
    buttons.push(button);
  });
  
  const finishButton = new ButtonBuilder()
    .setCustomId(`finish_generator_${userId}`)
    .setLabel('🎯 Generate Command')
    .setStyle(ButtonStyle.Primary);
  
  buttons.push(finishButton);
  
  // Split buttons into rows (max 5 per row)
  const rows = [];
  for (let i = 0; i < buttons.length; i += 5) {
    rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
  }
  
  return rows;
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
  if (Object.keys(selectedFields).length === 0) {
    return 'None';
  }
  
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
  
  if (!embed.title || 
      !embed.title.includes('<:LU_Inventory:') || 
      !embed.title.includes("'s Inventory")) return;
  
  try {
    await message.react('🔍');
  } catch (error) {
    console.error('Failed to react to inventory:', error);
  }
}

async function handleGeneratorReaction(reaction, user) {
  if (user.bot) return;
  if (reaction.emoji.name !== '🔍') return;
  
  const message = reaction.message;
  if (!message.embeds.length) return;
  
  const embed = message.embeds[0];
  if (!embed.title || 
      !embed.title.includes('<:LU_Inventory:') || 
      !embed.title.includes("'s Inventory")) return;
  
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
  
  // Initialize generator data
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
    .setTitle('🛠️ Command Builder - Card Selection')
    .setDescription(`**How to use:**\n1️⃣ Select a card from the dropdown menu\n2️⃣ Click **Add** to add it to your command\n3️⃣ Click **Remove** to remove selected card\n4️⃣ Click **Next Section** when ready\n\n**📝 Building Command:** \`<@${LUVI_BOT_ID}> inv\`\n**🎯 Added Names:** None`)
    .setColor(0x3498db);
  
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

async function handleNameSelect(interaction) {
  if (!interaction.customId.startsWith('name_select_')) return false;
  
  try {
    const userId = interaction.customId.split('_')[2];
    if (interaction.user.id !== userId) {
      await interaction.reply({ content: 'This is not your generator!', ephemeral: true });
      return true;
    }
    
    const userData = generatorData.get(userId);
    if (!userData) {
      await interaction.reply({ content: 'Generator data not found!', ephemeral: true });
      return true;
    }
    
    // Handle SELECT_ALL option
    if (interaction.values[0] === 'SELECT_ALL') {
      const cardsToAdd = userData.cards.slice(0, 25);
      cardsToAdd.forEach(card => {
        if (!userData.selectedNames.includes(card.name)) {
          userData.selectedNames.push(card.name);
        }
      });
      
      const dropdown = createNameDropdown(userData.cards, userId);
      const actionButtons = createNameActionButtons(userId, false);
      const selectedText = userData.selectedNames.join(', ');
      const commandPreview = buildCommandPreview(userData);
      
      const embed = new EmbedBuilder()
        .setTitle('🛠️ Command Builder - Card Selection')
        .setDescription(`**How to use:**\n1️⃣ Select a card from the dropdown menu\n2️⃣ Click **Add** to add it to your command\n3️⃣ Click **Remove** to remove selected card\n4️⃣ Click **Next Section** when ready\n\n**📝 Building Command:** \`${commandPreview}\`\n**✅ Added All Cards:** ${cardsToAdd.length} cards added\n**🎯 Added Names:** ${selectedText}`)
        .setColor(0x3498db);
      
      await interaction.update({
        embeds: [embed],
        components: [dropdown, actionButtons]
      });
      
      return true;
    }
    
    const selectedIndex = parseInt(interaction.values[0]);
    const selectedCard = userData.cards[selectedIndex];
    userData.currentSelection = selectedCard;
    
    const dropdown = createNameDropdown(userData.cards, userId);
    const actionButtons = createNameActionButtons(userId, true);
    const selectedText = userData.selectedNames.length > 0 ? userData.selectedNames.join(', ') : 'None';
    const commandPreview = buildCommandPreview(userData);
    
    const embed = new EmbedBuilder()
      .setTitle('🛠️ Command Builder - Card Selection')
      .setDescription(`**How to use:**\n1️⃣ Select a card from the dropdown menu\n2️⃣ Click **Add** to add it to your command\n3️⃣ Click **Remove** to remove selected card\n4️⃣ Click **Next Section** when ready\n\n**📝 Building Command:** \`${commandPreview}\`\n**🔽 Current Selection:** ${selectedCard.name}\n**🎯 Added Names:** ${selectedText}`)
      .setColor(0x3498db);
    
    await interaction.update({
      embeds: [embed],
      components: [dropdown, actionButtons]
    });
    
    return true;
  } catch (error) {
    console.error('Error in handleNameSelect:', error);
    return true;
  }
}

async function handleAddName(interaction) {
  if (!interaction.customId.startsWith('add_name_')) return false;
  
  const userId = interaction.customId.split('_')[2];
  if (interaction.user.id !== userId) {
    await interaction.reply({ content: 'This is not your generator!', ephemeral: true });
    return true;
  }
  
  const userData = generatorData.get(userId);
  if (!userData || !userData.currentSelection) {
    await interaction.reply({ content: 'No card selected!', ephemeral: true });
    return true;
  }
  
  const cardName = userData.currentSelection.name;
  if (!userData.selectedNames.includes(cardName)) {
    userData.selectedNames.push(cardName);
  }
  
  const dropdown = createNameDropdown(userData.cards, userId);
  const actionButtons = createNameActionButtons(userId, true);
  const selectedText = userData.selectedNames.join(', ');
  const commandPreview = buildCommandPreview(userData);
  
  const embed = new EmbedBuilder()
    .setTitle('🛠️ Command Builder - Card Selection')
    .setDescription(`**How to use:**\n1️⃣ Select a card from the dropdown menu\n2️⃣ Click **Add** to add it to your command\n3️⃣ Click **Remove** to remove selected card\n4️⃣ Click **Next Section** when ready\n\n**📝 Building Command:** \`${commandPreview}\`\n**🔽 Current Selection:** ${cardName}\n**🎯 Added Names:** ${selectedText}`)
    .setColor(0x3498db);
  
  await interaction.update({
    embeds: [embed],
    components: [dropdown, actionButtons]
  });
  
  return true;
}

async function handleRemoveName(interaction) {
  if (!interaction.customId.startsWith('remove_name_')) return false;
  
  const userId = interaction.customId.split('_')[2];
  if (interaction.user.id !== userId) {
    await interaction.reply({ content: 'This is not your generator!', ephemeral: true });
    return true;
  }
  
  const userData = generatorData.get(userId);
  if (!userData || !userData.currentSelection) {
    await interaction.reply({ content: 'No card selected!', ephemeral: true });
    return true;
  }
  
  const cardName = userData.currentSelection.name;
  userData.selectedNames = userData.selectedNames.filter(name => name !== cardName);
  
  const dropdown = createNameDropdown(userData.cards, userId);
  const actionButtons = createNameActionButtons(userId, true);
  const selectedText = userData.selectedNames.length > 0 ? userData.selectedNames.join(', ') : 'None';
  const commandPreview = buildCommandPreview(userData);
  
  const embed = new EmbedBuilder()
    .setTitle('🛠️ Command Builder - Card Selection')
    .setDescription(`**How to use:**\n1️⃣ Select a card from the dropdown menu\n2️⃣ Click **Add** to add it to your command\n3️⃣ Click **Remove** to remove selected card\n4️⃣ Click **Next Section** when ready\n\n**📝 Building Command:** \`${commandPreview}\`\n**🔽 Current Selection:** ${cardName}\n**🎯 Added Names:** ${selectedText}`)
    .setColor(0x3498db);
  
  await interaction.update({
    embeds: [embed],
    components: [dropdown, actionButtons]
  });
  
  return true;
}

async function handleNextSection(interaction) {
  if (!interaction.customId.startsWith('next_section_')) return false;
  
  const userId = interaction.customId.split('_')[2];
  if (interaction.user.id !== userId) {
    await interaction.reply({ content: 'This is not your generator!', ephemeral: true });
    return true;
  }
  
  const userData = generatorData.get(userId);
  if (!userData) {
    await interaction.reply({ content: 'Generator data not found!', ephemeral: true });
    return true;
  }
  
  const fieldRows = createFieldSelectionMenu(userId, userData.selectedFields);
  const selectedText = userData.selectedNames.length > 0 ? userData.selectedNames.join(', ') : 'None';
  const commandPreview = buildCommandPreview(userData);
  const fieldsText = formatSelectedFields(userData.selectedFields);
  
  const embed = new EmbedBuilder()
    .setTitle('🛠️ Command Builder - Field Selection')
    .setDescription(`**📝 Building Command:** \`${commandPreview}\`\n**🎯 Selected Names:** ${selectedText}\n**⚙️ Selected Fields:**\n${fieldsText}\n\nClick buttons below to add more fields:`)
    .setColor(0x27ae60);
  
  await interaction.update({
    embeds: [embed],
    components: fieldRows
  });
  
  return true;
}

async function handleAddField(interaction) {
  if (!interaction.customId.startsWith('add_field_')) return false;
  
  const parts = interaction.customId.split('_');
  const fieldKey = parts[2];
  const userId = parts[3];
  
  if (interaction.user.id !== userId) {
    await interaction.reply({ content: 'This is not your generator!', ephemeral: true });
    return true;
  }
  
  const userData = generatorData.get(userId);
  if (!userData) {
    await interaction.reply({ content: 'Generator data not found!', ephemeral: true });
    return true;
  }
  
  const field = availableFields.find(f => f.key === fieldKey);
  if (!field) return false;
  
  const dropdown = createFieldDropdown(field, userId);
  
  const embed = new EmbedBuilder()
    .setTitle(`Select ${field.key.charAt(0).toUpperCase() + field.key.slice(1)}`)
    .setDescription(`Choose values for **${field.key}**`)
    .setColor(0xff9900);
  
  await interaction.reply({
    embeds: [embed],
    components: [dropdown],
    ephemeral: true
  });
  
  return true;
}

async function handleFieldSelect(interaction) {
  if (!interaction.customId.startsWith('field_select_')) return false;
  
  const parts = interaction.customId.split('_');
  const fieldKey = parts[2];
  const userId = parts[3];
  
  if (interaction.user.id !== userId) {
    await interaction.reply({ content: 'This is not your generator!', ephemeral: true });
    return true;
  }
  
  const userData = generatorData.get(userId);
  if (!userData) {
    await interaction.reply({ content: 'Generator data not found!', ephemeral: true });
    return true;
  }
  
  userData.selectedFields[fieldKey] = interaction.values;

  await interaction.reply({
    content: `✅ Selected **${fieldKey}**: ${interaction.values.join(', ')}`,
    ephemeral: true
  });
  
  // Update the main embed to show new selections
  try {
    const mainMessage = generatorData.get(`main_message_${userId}`);
    if (mainMessage) {
      const fieldRows = createFieldSelectionMenu(userId, userData.selectedFields);
      const selectedText = userData.selectedNames.length > 0 ? userData.selectedNames.join(', ') : 'None';
      const commandPreview = buildCommandPreview(userData);
      const fieldsText = formatSelectedFields(userData.selectedFields);
      
      const embed = new EmbedBuilder()
        .setTitle('🛠️ Command Builder - Field Selection')
        .setDescription(`**📝 Building Command:** \`${commandPreview}\`\n**🎯 Selected Names:** ${selectedText}\n**⚙️ Selected Fields:**\n${fieldsText}\n\nClick buttons below to add more fields:`)
        .setColor(0x27ae60);
      
      await mainMessage.edit({
        embeds: [embed],
        components: fieldRows
      });
    }
  } catch (error) {
    console.error('Failed to update main message:', error);
  }
  
  return true;
}

async function handleFinishGenerator(interaction) {
  if (!interaction.customId.startsWith('finish_generator_')) return false;
  
  const userId = interaction.customId.split('_')[2];
  
  if (interaction.user.id !== userId) {
    await interaction.reply({ content: 'This is not your generator!', ephemeral: true });
    return true;
  }
  
  const userData = generatorData.get(userId);
  if (!userData) {
    await interaction.reply({ content: 'Generator data not found!', ephemeral: true });
    return true;
  }
  
  const command = buildCommandPreview(userData);
  
  const embed = new EmbedBuilder()
    .setTitle('🎯 Generated Command')
    .setDescription(`\`\`\`${command}\`\`\``)
    .setColor(0x27ae60);
  
  await interaction.update({
    embeds: [embed],
    components: []
  });
  
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
      
      // Check if cards changed
      if (JSON.stringify(newCards) !== JSON.stringify(userData.cards)) {
        userData.cards = newCards;
        
        // Update dropdown message
        const mainMessage = generatorData.get(`main_message_${userId}`);
        if (mainMessage) {
          const dropdown = createNameDropdown(newCards, userId);
          const actionButtons = createNameActionButtons(userId, userData.currentSelection !== null);
          const selectedText = userData.selectedNames.length > 0 ? userData.selectedNames.join(', ') : 'None';
          const commandPreview = buildCommandPreview(userData);
          
          const updateEmbed = new EmbedBuilder()
            .setTitle('🛠️ Command Builder - Card Selection')
            .setDescription(`**How to use:**\n1️⃣ Select a card from the dropdown menu\n2️⃣ Click **Add** to add it to your command\n3️⃣ Click **Remove** to remove selected card\n4️⃣ Click **Next Section** when ready\n\n**📝 Building Command:** \`${commandPreview}\`\n**🎯 Added Names:** ${selectedText}`)
            .setColor(0x3498db);
          
          await mainMessage.edit({
            embeds: [updateEmbed],
            components: [dropdown, actionButtons]
          });
        }
      }
    } catch (error) {
      console.error('Error in inventory watcher:', error);
      clearInterval(checkInterval);
    }
  }, 2000);
  
  // Stop watching after 10 minutes
  setTimeout(() => clearInterval(checkInterval), 10 * 60 * 1000);
}

module.exports = {
  processInventoryMessage,
  handleGeneratorReaction,
  handleNameSelect,
  handleAddName,
  handleRemoveName,
  handleNextSection,
  handleAddField,
  handleFieldSelect,
  handleFinishGenerator
};
