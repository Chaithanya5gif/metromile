/**
 * Offline Storage Utility
 * =======================
 * Provides caching functionality for offline-first architecture.
 * 
 * Features:
 * - Cache static data (metro stations, user profile)
 * - Fallback to cached data when API unavailable
 * - Automatic cache invalidation
 * 
 * Usage:
 * ```typescript
 * // Cache data
 * await cacheData(CACHE_KEYS.STATIONS, stationsData);
 * 
 * // Retrieve cached data
 * const cached = await getCachedData(CACHE_KEYS.STATIONS);
 * ```
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Cache key constants
 * Use these keys to ensure consistency across the app
 */
export const CACHE_KEYS = {
  STATIONS: 'cached_stations',
  RECENT_RIDES: 'cached_recent_rides',
  USER_PROFILE: 'cached_user_profile',
  DESTINATION_AREAS: 'cached_destination_areas',
} as const;

/**
 * Cache data to AsyncStorage
 * 
 * @param key - Cache key from CACHE_KEYS
 * @param data - Data to cache (will be JSON stringified)
 * @returns Promise<void>
 */
export const cacheData = async (key: string, data: any): Promise<void> => {
  try {
    const jsonData = JSON.stringify(data);
    await AsyncStorage.setItem(key, jsonData);
    console.log(`[Cache] Saved: ${key}`);
  } catch (error) {
    console.error(`[Cache] Error saving ${key}:`, error);
  }
};

/**
 * Retrieve cached data from AsyncStorage
 * 
 * @param key - Cache key from CACHE_KEYS
 * @returns Promise<any | null> - Parsed data or null if not found
 */
export const getCachedData = async (key: string): Promise<any | null> => {
  try {
    const jsonData = await AsyncStorage.getItem(key);
    if (jsonData) {
      console.log(`[Cache] Retrieved: ${key}`);
      return JSON.parse(jsonData);
    }
    return null;
  } catch (error) {
    console.error(`[Cache] Error retrieving ${key}:`, error);
    return null;
  }
};

/**
 * Check if cached data exists
 * 
 * @param key - Cache key from CACHE_KEYS
 * @returns Promise<boolean>
 */
export const hasCachedData = async (key: string): Promise<boolean> => {
  try {
    const data = await AsyncStorage.getItem(key);
    return data !== null;
  } catch (error) {
    return false;
  }
};

/**
 * Clear specific cached data
 * 
 * @param key - Cache key from CACHE_KEYS
 * @returns Promise<void>
 */
export const clearCachedData = async (key: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(key);
    console.log(`[Cache] Cleared: ${key}`);
  } catch (error) {
    console.error(`[Cache] Error clearing ${key}:`, error);
  }
};

/**
 * Clear all cached data
 * Useful for logout or cache reset
 * 
 * @returns Promise<void>
 */
export const clearAllCache = async (): Promise<void> => {
  try {
    const keys = Object.values(CACHE_KEYS);
    await AsyncStorage.multiRemove(keys);
    console.log('[Cache] Cleared all cache');
  } catch (error) {
    console.error('[Cache] Error clearing all cache:', error);
  }
};

/**
 * Cache data with expiration timestamp
 * 
 * @param key - Cache key
 * @param data - Data to cache
 * @param expirationMinutes - Minutes until cache expires (default: 60)
 * @returns Promise<void>
 */
export const cacheDataWithExpiry = async (
  key: string,
  data: any,
  expirationMinutes: number = 60
): Promise<void> => {
  try {
    const expiryTime = Date.now() + expirationMinutes * 60 * 1000;
    const cacheObject = {
      data,
      expiry: expiryTime,
    };
    await AsyncStorage.setItem(key, JSON.stringify(cacheObject));
    console.log(`[Cache] Saved with expiry: ${key} (${expirationMinutes}min)`);
  } catch (error) {
    console.error(`[Cache] Error saving with expiry ${key}:`, error);
  }
};

/**
 * Get cached data if not expired
 * 
 * @param key - Cache key
 * @returns Promise<any | null> - Data if valid, null if expired or not found
 */
export const getCachedDataWithExpiry = async (key: string): Promise<any | null> => {
  try {
    const jsonData = await AsyncStorage.getItem(key);
    if (!jsonData) return null;

    const cacheObject = JSON.parse(jsonData);
    
    // Check if expired
    if (Date.now() > cacheObject.expiry) {
      console.log(`[Cache] Expired: ${key}`);
      await AsyncStorage.removeItem(key);
      return null;
    }

    console.log(`[Cache] Retrieved (valid): ${key}`);
    return cacheObject.data;
  } catch (error) {
    console.error(`[Cache] Error retrieving with expiry ${key}:`, error);
    return null;
  }
};

/**
 * Get cache statistics
 * Useful for debugging and monitoring
 * 
 * @returns Promise<object> - Cache statistics
 */
export const getCacheStats = async (): Promise<{
  totalKeys: number;
  keys: string[];
  estimatedSize: number;
}> => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter(key => 
      Object.values(CACHE_KEYS).includes(key as any)
    );
    
    let estimatedSize = 0;
    for (const key of cacheKeys) {
      const data = await AsyncStorage.getItem(key);
      if (data) {
        estimatedSize += data.length;
      }
    }

    return {
      totalKeys: cacheKeys.length,
      keys: cacheKeys,
      estimatedSize, // in bytes
    };
  } catch (error) {
    console.error('[Cache] Error getting stats:', error);
    return {
      totalKeys: 0,
      keys: [],
      estimatedSize: 0,
    };
  }
};

export default {
  cacheData,
  getCachedData,
  hasCachedData,
  clearCachedData,
  clearAllCache,
  cacheDataWithExpiry,
  getCachedDataWithExpiry,
  getCacheStats,
  CACHE_KEYS,
};
