# Discord Bot - Game Helper

A Discord bot for game notifications and reminders with MongoDB integration.

## Features

- **Boss Notifications** - Auto-detects boss spawns and pings configured roles
- **Card Alerts** - Notifies when cards spawn with rarity detection
- **Smart Reminders** - Automatic reminders for:
  - Stamina refill (100-minute timer)
  - Expedition completion
  - Raid fatigue recovery
  - Raid spawn reminders (30-minute)
- **User Preferences** - Individual notification settings and DM options
- **Admin Controls** - Role management and server configuration

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your bot token and MongoDB URI
   ```

3. **Deploy commands:**
   ```bash
   npm run deploy
   ```

4. **Start the bot:**
   ```bash
   npm start
   ```

## Commands

### Admin Commands (Requires Manage Roles)
- `/set-boss-role [role]` - Set role for boss notifications
- `/card_role [role]` - Set role for card notifications  
- `/view-settings` - View server configuration

### User Commands
- `/notifications view` - View personal settings
- `/notifications set <type> <enabled>` - Configure notifications
- `/dm enable/disable <type>` - Configure DM preferences
- `/help` - Complete command guide

## Tech Stack

- **Node.js** - Runtime environment
- **Discord.js v14** - Discord API wrapper
- **MongoDB** - Database with Mongoose ODM
- **Express** - Web interface (optional)

## Architecture

- **Event-driven** - Processes Discord messages and interactions
- **Modular design** - Separate systems for different features
- **Database optimization** - Indexed queries and connection pooling
- **Error handling** - Comprehensive logging and error recovery

## License

MIT License - See LICENSE file for details