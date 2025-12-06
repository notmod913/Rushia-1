const NodeCache = require('node-cache');

// Create cache instances with TTL
const messageCache = new NodeCache({ stdTTL: 300 }); // 5 minutes
const userCache = new NodeCache({ stdTTL: 3600 }); // 1 hour
const guildCache = new NodeCache({ stdTTL: 1800 }); // 30 minutes

class CacheManager {
  static setMessage(key, value) {
    messageCache.set(key, value);
  }

  static getMessage(key) {
    return messageCache.get(key);
  }

  static setUser(userId, data) {
    userCache.set(userId, data);
  }

  static getUser(userId) {
    return userCache.get(userId);
  }

  static setGuild(guildId, data) {
    guildCache.set(guildId, data);
  }

  static getGuild(guildId) {
    return guildCache.get(guildId);
  }

  static clearAll() {
    messageCache.flushAll();
    userCache.flushAll();
    guildCache.flushAll();
  }
}

module.exports = CacheManager;