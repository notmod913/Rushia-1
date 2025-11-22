const mongoose = require('mongoose');

class DatabaseManager {
  static async connect() {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false
      });
      console.log('Connected to MongoDB with optimized settings');
    } catch (error) {
      console.error('MongoDB connection failed:', error);
      throw error;
    }
  }

  static async createIndexes() {
    const Reminder = require('./Reminder');
    const BotSettings = require('./BotSettings');
    const UserNotificationSettings = require('./UserNotificationSettings');

    try {
      // Compound indexes for better query performance
      await Reminder.collection.createIndex({ remindAt: 1, type: 1 });
      await Reminder.collection.createIndex({ userId: 1, type: 1, remindAt: 1 });
      
      console.log('Database indexes created successfully');
    } catch (error) {
      console.error('Failed to create indexes:', error);
    }
  }

  static async cleanup() {
    const Reminder = require('./Reminder');
    
    // Clean up old reminders (older than 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await Reminder.deleteMany({ remindAt: { $lt: sevenDaysAgo } });
  }
}

module.exports = DatabaseManager;