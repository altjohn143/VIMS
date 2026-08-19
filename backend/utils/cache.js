/**
 * Simple in-memory TTL cache for expensive computations
 * Zero dependencies, safe for single-instance Render deployment
 */

const caches = new Map();

/**
 * Get cached value or compute and cache it
 * @param {string} key - Cache key
 * @param {number} ttlMs - Time to live in milliseconds
 * @param {Function} factory - Async function to compute value
 * @returns {Promise<any>} Cached or computed value
 */
async function getCached(key, ttlMs, factory) {
  const entry = caches.get(key);
  const now = Date.now();
  
  if (entry && now < entry.expiry) {
    return entry.data;
  }
  
  // Compute fresh value
  const data = await factory();
  
  // Store with expiry
  caches.set(key, {
    data,
    expiry: now + ttlMs
  });
  
  return data;
}

/**
 * Invalidate a specific cache key
 * @param {string} key - Cache key to invalidate
 */
function invalidateCache(key) {
  caches.delete(key);
}

/**
 * Invalidate all caches matching a prefix
 * @param {string} prefix - Key prefix to match
 */
function invalidateCachePrefix(prefix) {
  for (const key of caches.keys()) {
    if (key.startsWith(prefix)) {
      caches.delete(key);
    }
  }
}

/**
 * Clear all caches
 */
function clearAllCaches() {
  caches.clear();
}

/**
 * Get cache stats for monitoring
 * @returns {Object} Cache statistics
 */
function getCacheStats() {
  const now = Date.now();
  let valid = 0, expired = 0;
  
  for (const [, entry] of caches.entries()) {
    if (now < entry.expiry) valid++;
    else expired++;
  }
  
  return {
    totalEntries: caches.size,
    valid,
    expired,
    keys: Array.from(caches.keys())
  };
}

// Auto-cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of caches.entries()) {
    if (now >= entry.expiry) {
      caches.delete(key);
    }
  }
}, 5 * 60 * 1000);

module.exports = {
  getCached,
  invalidateCache,
  invalidateCachePrefix,
  clearAllCaches,
  getCacheStats
};