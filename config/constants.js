module.exports = {
  LUVI_BOT_ID: '1269481871021047891',
  BOT_OWNER_ID: process.env.BOT_OWNER_ID,
  
  STAMINA: {
    MAX: 50,
    REGEN_RATE: 2, // minutes per stamina point
    PERCENTAGES: [25, 50, 100]
  },
  
  CACHE: {
    MESSAGE_TTL: 300, // 5 minutes
    USER_TTL: 3600,   // 1 hour
    GUILD_TTL: 1800   // 30 minutes
  },
  
  SCHEDULER: {
    CHECK_INTERVAL: 10000, // 10 seconds
    BATCH_SIZE: 50
  },
  
  COLORS: {
    SUCCESS: 0x00ff00,
    ERROR: 0xff0000,
    INFO: 0x0099ff,
    WARNING: 0xffaa00
  },
  
  RARITIES: ['all', 'common', 'uncommon', 'rare', 'exotic', 'legendary'],
  TIERS: ['t1', 't2', 't3'],
  
  REMINDER_TYPES: ['expedition', 'stamina', 'raid'],
  
  PERMISSIONS: {
    ADMIN_COMMANDS: ['ManageRoles'],
    USER_COMMANDS: []
  }
};