/**
 * CacheManager - Cache management utility
 * 
 * Type definitions for clearing document cache.
 */

/**
 * CacheManager namespace with static utility methods
 */
declare namespace CacheManager {
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
    function clearCache(): void;
}

export default CacheManager;
