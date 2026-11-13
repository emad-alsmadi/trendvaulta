/**
 * StoreSettings singleton access with a short in-process cache, refreshed
 * at most every 30s so checkout/quote requests don't hit the DB on every
 * call. Cleared immediately whenever the admin updates settings (see
 * invalidateStoreSettingsCache).
 */

const STORE_SETTINGS_CACHE_TTL_MS = 30_000;
let storeSettingsCache = { value: undefined, expiresAt: 0 };

function invalidateStoreSettingsCache() {
  storeSettingsCache = { value: undefined, expiresAt: 0 };
}

async function getStoreSettings() {
  const now = Date.now();
  if (storeSettingsCache.value !== undefined && storeSettingsCache.expiresAt > now) {
    return storeSettingsCache.value;
  }

  let value = null;
  try {
    // Lazy require avoids a require cycle at module load time.
    const { StoreSettings, SINGLETON_ID } = require('../models/StoreSettings');
    value = await StoreSettings.findById(SINGLETON_ID).lean();
  } catch (_err) {
    value = null;
  }

  storeSettingsCache = { value, expiresAt: now + STORE_SETTINGS_CACHE_TTL_MS };
  return value;
}

module.exports = {
  getStoreSettings,
  invalidateStoreSettingsCache,
};
