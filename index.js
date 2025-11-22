require('dotenv').config();
const { 
  Client, 
  GatewayIntentBits, 
  Collection, 
  Events, 
  PermissionsBitField,
  ActivityType
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const { startScheduler } = require('./tasks/reminderScheduler');
const { initializeSettings } = require('./utils/settingsManager');
const { initializeUserSettings } = require('./utils/userSettingsManager');
const DatabaseManager = require('./database/database');
const { sendLog, initializeLogsDB } = require('./utils/logger');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Load commands from ./commands folder
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.data && command.execute) {
    client.commands.set(command.data.name, command);
    console.log(`Loaded command: ${command.data.name}`);
  } else {
    console.warn(`Skipped loading ${file}: missing data or execute`);
  }
}

// Load event handlers from ./events folder
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

// Load system handlers
const { processBossMessage } = require('./systems/tierPingSystem');
const { processCardMessage } = require('./systems/cardPingSystem');
const { processStaminaMessage } = require('./systems/staminaReminderSystem');
const { processExpeditionMessage } = require('./systems/expeditionReminderSystem');
const { processRaidMessage } = require('./systems/raidReminderSystem');
const { detectRaidSpawnCommand } = require('./systems/spawnReminderSystem');
const { LUVI_BOT_ID } = require('./config/constants');

const processedMessages = new Set();

client.on(Events.MessageCreate, async (message) => {
  if (message.author.id !== LUVI_BOT_ID) return;
  
  const messageKey = `${message.id}-${message.createdTimestamp}`;
  if (processedMessages.has(messageKey)) return;
  processedMessages.add(messageKey);
  
  if (processedMessages.size > 1000) {
    const entries = Array.from(processedMessages);
    processedMessages.clear();
    entries.slice(-500).forEach(key => processedMessages.add(key));
  }

  await processStaminaMessage(message);
  await processExpeditionMessage(message);
  await processRaidMessage(message);
  await processBossMessage(message);
  await processCardMessage(message);
});

client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
  if (newMessage.author.id !== LUVI_BOT_ID) return;
  
  const messageKey = `${newMessage.id}-${newMessage.editedTimestamp}`;
  if (processedMessages.has(messageKey)) return;
  processedMessages.add(messageKey);
  
  await processExpeditionMessage(newMessage);
  await processRaidMessage(newMessage);
});

// Guild join welcome/setup guide
client.on(Events.GuildCreate, async (guild) => {
  try {
    const defaultChannel = guild.channels.cache
      .filter(ch => 
        ch.type === 0 && 
        ch.permissionsFor(guild.members.me).has(PermissionsBitField.Flags.SendMessages)
      )
      .first();

    if (!defaultChannel) {
      await sendLog(`No accessible text channel found in guild ${guild.name}`, { guildId: guild.id });
      return;
    }

    const guideMessage = `
**Hello! Thanks for adding Luvi Helper Bot!**

**Setup Commands:**
1️⃣ **Boss Role:** \`/set-boss-role role:@Role\`
2️⃣ **Card Role:** \`/set-card-role role:@Role\`
3️⃣ **View Config:** \`/view-settings\`
4️⃣ **User Settings:** \`/notifications set\`

**Features:**
• Boss spawn notifications (all tiers)
• Card spawn notifications (all rarities)
• Stamina reminders (auto 100%)
• Expedition reminders
• Raid fatigue reminders

Use \`/help\` for detailed setup guide.
`;

    await defaultChannel.send(guideMessage);
    await sendLog(`Sent setup guide message in guild ${guild.name}`, { guildId: guild.id });
  } catch (error) {
    await sendError(`Failed to send setup message in guild ${guild.name}: ${error.message}`, { guildId: guild.id });
  }
});

// Connect to MongoDB and login the bot
(async () => {
  try {
    await DatabaseManager.connect();
    await DatabaseManager.createIndexes();
    await initializeLogsDB();
    
    // Schedule daily cleanup
    setInterval(() => {
      DatabaseManager.cleanup().catch(console.error);
    }, 24 * 60 * 60 * 1000); // Daily

    client.once(Events.ClientReady, async readyClient => {
        await sendLog(`Bot logged in as ${readyClient.user.tag}`);
        await initializeSettings();
        await initializeUserSettings();
        startScheduler(readyClient);

        // Rich presence with detailed status like C++ example
        const startTime = Math.floor(Date.now() / 1000);
        let guildCount = readyClient.guilds.cache.size;
        let userCount = readyClient.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
        
        const activities = [
          {
            name: 'Message Processor',
            type: ActivityType.Playing,
            details: 'Processing Discord Messages',
            state: 'Regex Matching | Entity Detection',
            timestamps: { start: startTime }
          },
          {
            name: 'Task Scheduler',
            type: ActivityType.Watching,
            details: 'Managing User Reminders',
            state: 'Cron Jobs | MongoDB Queries',
            timestamps: { start: startTime }
          },
          {
            name: 'Notification Engine',
            type: ActivityType.Custom,
            details: 'Real-time Alert System',
            state: 'Event Listeners | Role Mentions',
            timestamps: { start: startTime }
          },
          {
            name: 'Database Manager',
            type: ActivityType.Listening,
            details: 'MongoDB Connection Pool',
            state: 'Mongoose ODM | Index Optimization',
            timestamps: { start: startTime }
          }
        ];
        
        let currentActivity = 0;
        const updateActivity = () => {
          readyClient.user.setPresence({
            activities: [activities[currentActivity]],
            status: 'online'
          });
          
          currentActivity = (currentActivity + 1) % activities.length;
        };
        
        updateActivity();
        setInterval(updateActivity, 15000); // Change every 15 seconds
    });

    await client.login(process.env.BOT_TOKEN);
  } catch (err) {
    console.error('Failed to connect or login:', err);
    process.exit(1);
  }
})();