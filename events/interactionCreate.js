const { Events } = require('discord.js');
const Reminder = require('../database/Reminder');
const { sendLog, sendError } = require('../utils/logger');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const RateLimiter = require('../optimization/rateLimiter');


module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (interaction.isCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) return;

            // Rate limiting check
            if (RateLimiter.isRateLimited(interaction.user.id)) {
                return interaction.reply({ 
                    content: 'You are being rate limited. Please slow down!', 
                    flags: 1 << 6 
                });
            }

            // Log command usage
            await sendLog(`[COMMAND] ${interaction.commandName} used by ${interaction.user.tag} (${interaction.user.id})`, {
                commandName: interaction.commandName,
                userId: interaction.user.id,
                username: interaction.user.tag,
                guildId: interaction.guild?.id,
                guildName: interaction.guild?.name,
                channelId: interaction.channel?.id
            });

            try {
                const startTime = Date.now();
                await command.execute(interaction);
                const duration = Date.now() - startTime;
                
                // Log command completion with duration
                await sendLog(`[COMMAND COMPLETED] ${interaction.commandName} completed in ${duration}ms`, {
                    commandName: interaction.commandName,
                    userId: interaction.user.id,
                    duration,
                    guildId: interaction.guild?.id
                });
            } catch (error) {
                console.error(`Error executing command ${interaction.commandName}:`, error);
                await sendError(`[COMMAND ERROR] ${interaction.commandName} failed for user ${interaction.user.id}: ${error.message}`, {
                    commandName: interaction.commandName,
                    userId: interaction.user.id,
                    error: error.message,
                    guildId: interaction.guild?.id
                });
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error executing this command!', flags: 1 << 6 });
                } else {
                    await interaction.reply({ content: 'There was an error executing this command!', flags: 1 << 6 });
                }
            }
        } else if (interaction.isButton()) {
            const { customId, user, channel, message } = interaction;



            if (customId.startsWith('stamina_')) {
                const mentionedUserIdMatch = message.content.match(/<@(\d+)>/);
                const mentionedUserId = mentionedUserIdMatch ? mentionedUserIdMatch[1] : null;

                if (mentionedUserId && user.id !== mentionedUserId) {
                    return interaction.reply({ content: "You can't interact with this button.", flags: 1 << 6 });
                }

                await interaction.deferReply({ flags: 1 << 6 });

                const percentage = parseInt(customId.split('_')[1], 10);
                const maxStamina = 50;
                const staminaToRegen = (maxStamina * percentage) / 100;
                const minutesToRegen = staminaToRegen * 2; // 5 stamina per 10 mins = 1 stamina per 2 mins
                const remindAt = new Date(Date.now() + minutesToRegen * 60 * 1000);

                try {
                    const existingReminder = await Reminder.findOne({ userId: user.id, type: 'stamina' });
                    let confirmationMessage = `You will be reminded when your stamina reaches ${percentage}%.`;

                    if (existingReminder) {
                        await Reminder.deleteOne({ _id: existingReminder._id });
                        confirmationMessage = `Your previous stamina reminder was overwritten. You will now be reminded when when your stamina reaches ${percentage}%.`;
                    } else {
                        confirmationMessage = `You will be reminded when your stamina reaches ${percentage}%.`;
                    }

                    await Reminder.create({
                        userId: user.id,
                        channelId: channel.id,
                        remindAt,
                        type: 'stamina',
                        reminderMessage: `<@${user.id}>, your stamina has regenerated to ${percentage}%!\n-# you can configure your notifications via /notifications set/view`
                    });

                    await interaction.editReply({ content: confirmationMessage });
                    await sendLog(`[STAMINA REMINDER SET] User: ${user.id}, Percentage: ${percentage}%, Channel: ${channel.id}, Message ID: ${message.id}, Message Link: ${message.url}`);

                    const originalMessage = interaction.message;
                    const disabledRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder().setCustomId('stamina_25').setLabel('Remind at 25% Stamina').setStyle(ButtonStyle.Primary).setDisabled(true),
                            new ButtonBuilder().setCustomId('stamina_50').setLabel('Remind at 50% Stamina').setStyle(ButtonStyle.Primary).setDisabled(true),
                            new ButtonBuilder().setCustomId('stamina_100').setLabel('Remind at 100% Stamina').setStyle(ButtonStyle.Primary).setDisabled(true),
                        );
                    await originalMessage.edit({ components: [disabledRow] });
                } catch (error) {
                    console.error(`[ERROR] Failed to create stamina reminder: ${error.message}`, error);
                    await sendError(`[ERROR] Failed to create stamina reminder: ${error.message}`);
                    await interaction.editReply({ content: 'Sorry, there was an error setting your reminder.' });
                }
            }
        }
    }
};