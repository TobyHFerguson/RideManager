/**
 * CacheManager - Cache management utility
 * 
 * Type definitions for clearing document cache.
 */

/**
 * CacheManager class with static utility methods
 */
declare class CacheManager {
    /**
     * Clear cached Globals and Groups data
     * Uses CacheService.getDocumentCache() to remove cached values
     * 
     * Called when configuration changes require cache refresh
     * 
     * @example
     * ```javascript
     * CacheManager.clearCache(); // Clears 'Globals' and 'Groups' from document cache
     * ```
     */
    static clearCache(): void;
}

export default CacheManager;
