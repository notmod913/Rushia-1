const { WebhookClient } = require('discord.js');
const mongoose = require('mongoose');

const logWebhook = process.env.LOG_WEBHOOK_URL ? new WebhookClient({ url: process.env.LOG_WEBHOOK_URL }) : null;
const errorWebhook = process.env.ERROR_WEBHOOK_URL ? new WebhookClient({ url: process.env.ERROR_WEBHOOK_URL }) : null;

let Log = null;
let logsConnection = null;

// Initialize logs database connection
async function initializeLogsDB() {
  if (!process.env.LOGS_URI) return;
  
  try {
    logsConnection = mongoose.createConnection(process.env.LOGS_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false
    });
    const logSchema = new mongoose.Schema({
      level: { type: String, required: true, enum: ['INFO', 'ERROR', 'WARN', 'DEBUG'] },
      message: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
      guildId: { type: String },
      userId: { type: String },
      channelId: { type: String },
      metadata: { type: Object }
    });
    logSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });
    Log = logsConnection.model('Log', logSchema);
  } catch (error) {
    console.error('Failed to initialize logs database:', error);
  }
}

async function saveLogToDB(level, message, metadata = {}) {
  if (!Log) return;
  
  try {
    await Log.create({
      level,
      message,
      ...metadata
    });
  } catch (error) {
    console.error('Failed to save log to database:', error);
  }
}

async function sendLog(message, metadata = {}) {
  await saveLogToDB('INFO', message, metadata);
  
  if (logWebhook) {
    try {
      await logWebhook.send(message);
    } catch (error) {
      // Silent fail for webhook errors
    }
  }
}

async function sendError(message, metadata = {}) {
  await saveLogToDB('ERROR', message, metadata);
  
  if (errorWebhook) {
    try {
      await errorWebhook.send(message);
    } catch (error) {
      // Silent fail for webhook errors
    }
  }
}

async function sendWarn(message, metadata = {}) {
  await saveLogToDB('WARN', message, metadata);
}

async function sendDebug(message, metadata = {}) {
  await saveLogToDB('DEBUG', message, metadata);
}

module.exports = { sendLog, sendError, sendWarn, sendDebug, initializeLogsDB };