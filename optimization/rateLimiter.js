const rateLimit = new Map();
const { sendWarn } = require('../utils/logger');

class RateLimiter {
  static isRateLimited(key, maxRequests = 5, windowMs = 60000) {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!rateLimit.has(key)) {
      rateLimit.set(key, []);
    }
    
    const requests = rateLimit.get(key);
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => time > windowStart);
    
    if (validRequests.length >= maxRequests) {
      // Log rate limit hit
      sendWarn(`[RATE LIMIT] User ${key} hit rate limit (${validRequests.length}/${maxRequests} requests)`, {
        userId: key,
        requestCount: validRequests.length,
        maxRequests,
        windowMs
      });
      return true;
    }
    
    validRequests.push(now);
    rateLimit.set(key, validRequests);
    
    // Cleanup old entries periodically
    if (Math.random() < 0.01) { // 1% chance
      this.cleanup();
    }
    
    return false;
  }
  
  static cleanup() {
    const now = Date.now();
    const cutoff = now - 300000; // 5 minutes
    
    for (const [key, requests] of rateLimit.entries()) {
      const validRequests = requests.filter(time => time > cutoff);
      if (validRequests.length === 0) {
        rateLimit.delete(key);
      } else {
        rateLimit.set(key, validRequests);
      }
    }
  }
}

module.exports = RateLimiter;