/**
 * Cache Manager - Intelligent video segment caching system
 * Auto-manages video segment caching with TTL and size limits
 */

const CACHE_NAME = 'video-cache-v1';
const METADATA_STORE = 'cache-metadata';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const MAX_CACHE_SIZE_MB = 1000; // 1GB limit

interface CacheMetadata {
  url: string;
  videoUrl: string;
  cachedAt: number;
  size: number;
  lastAccessed: number;
}

interface CacheStats {
  totalEntries: number;
  totalSizeMB: number;
  oldestEntry: number;
  newestEntry: number;
}

class CacheManager {
  private metadata = new Map<string, CacheMetadata>();
  private initialized = false;
  private cleanupInterval?: ReturnType<typeof setInterval>;

  /**
   * Initialize cache manager by loading metadata from localStorage
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      const stored = localStorage.getItem(METADATA_STORE);
      if (stored) {
        this.metadata = new Map(Object.entries(JSON.parse(stored)));
      }
    } catch (error) {
      console.error('[CacheManager] Initialization failed:', error);
    }
    
    this.initialized = true;
  }

  /**
   * Save metadata to localStorage
   */
  private save(): void {
    try {
      localStorage.setItem(METADATA_STORE, JSON.stringify(Object.fromEntries(this.metadata)));
    } catch (error) {
      console.error('[CacheManager] Save failed:', error);
    }
  }

  /**
   * Add a new cache entry
   */
  async addCacheEntry(url: string, videoUrl: string, size: number): Promise<void> {
    await this.initialize();
    this.metadata.set(url, { 
      url, 
      videoUrl, 
      cachedAt: Date.now(), 
      size, 
      lastAccessed: Date.now() 
    });
    this.save();
  }

  /**
   * Check if a cached URL is still valid (not expired)
   */
  async isCacheValid(url: string): Promise<boolean> {
    await this.initialize();
    const meta = this.metadata.get(url);
    
    if (!meta) return false;
    
    // Check if expired
    if (Date.now() - meta.cachedAt > CACHE_TTL) {
      return false;
    }
    
    // Update last accessed time
    meta.lastAccessed = Date.now();
    this.save();
    
    return true;
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<CacheStats> {
    await this.initialize();
    const entries = Array.from(this.metadata.values());
    const totalSize = entries.reduce((sum, e) => sum + e.size, 0);
    const times = entries.map(e => e.cachedAt);
    
    return {
      totalEntries: entries.length,
      totalSizeMB: totalSize / (1024 * 1024),
      oldestEntry: times.length ? Math.min(...times) : 0,
      newestEntry: times.length ? Math.max(...times) : 0,
    };
  }

  /**
   * Check cache status and cleanup if needed
   */
  async checkAndCleanup(): Promise<void> {
    await this.initialize();
    const stats = await this.getCacheStats();
    
    // Cleanup if over size limit
    if (stats.totalSizeMB > MAX_CACHE_SIZE_MB) {
      await this.cleanupOldEntries();
    }
    
    // Always cleanup expired entries
    await this.cleanupExpiredEntries();
  }

  /**
   * Remove expired cache entries
   */
  async cleanupExpiredEntries(): Promise<number> {
    await this.initialize();
    
    if (!('caches' in window)) return 0;
    
    const cache = await caches.open(CACHE_NAME);
    const now = Date.now();
    let cleaned = 0;
    
    for (const [url, meta] of this.metadata.entries()) {
      if (now - meta.cachedAt > CACHE_TTL) {
        await cache.delete(url);
        this.metadata.delete(url);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.save();
    }
    
    return cleaned;
  }

  /**
   * Remove least recently used entries when cache is too large
   */
  async cleanupOldEntries(): Promise<number> {
    await this.initialize();
    
    if (!('caches' in window)) return 0;
    
    const cache = await caches.open(CACHE_NAME);
    const sorted = Array.from(this.metadata.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
    
    // Remove 30% of oldest entries
    const toRemove = Math.ceil(sorted.length * 0.3);
    let removed = 0;
    
    for (let i = 0; i < toRemove && i < sorted.length; i++) {
      await cache.delete(sorted[i][0]);
      this.metadata.delete(sorted[i][0]);
      removed++;
    }
    
    if (removed > 0) {
      this.save();
    }
    
    return removed;
  }

  /**
   * Clear all cache entries for a specific video
   */
  async clearVideoCache(videoUrl: string): Promise<number> {
    await this.initialize();
    
    if (!('caches' in window)) return 0;
    
    const cache = await caches.open(CACHE_NAME);
    let cleared = 0;
    
    for (const [url, meta] of this.metadata.entries()) {
      if (meta.videoUrl === videoUrl) {
        await cache.delete(url);
        this.metadata.delete(url);
        cleared++;
      }
    }
    
    if (cleared > 0) {
      this.save();
    }
    
    return cleared;
  }

  /**
   * Clear all cached data
   */
  async clearAllCache(): Promise<number> {
    await this.initialize();
    
    if (!('caches' in window)) return 0;
    
    const cache = await caches.open(CACHE_NAME);
    await Promise.all((await cache.keys()).map(key => cache.delete(key)));
    
    const count = this.metadata.size;
    this.metadata.clear();
    this.save();
    
    return count;
  }

  /**
   * Start automatic cleanup interval
   */
  startAutoCleanup(intervalMs: number = 5 * 60 * 1000): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cleanupInterval = setInterval(() => {
      this.checkAndCleanup();
    }, intervalMs);
    
    // Initial cleanup after 10 seconds
    setTimeout(() => this.checkAndCleanup(), 10000);
  }

  /**
   * Stop automatic cleanup
   */
  stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();

// Export convenience functions
export const clearSegmentsForUrl = (url: string) => cacheManager.clearVideoCache(url);
export const clearAllCache = () => cacheManager.clearAllCache();

// Auto-initialize and start cleanup in browser environment
if (typeof window !== 'undefined') {
  cacheManager.initialize().then(() => {
    cacheManager.startAutoCleanup();
  });
}