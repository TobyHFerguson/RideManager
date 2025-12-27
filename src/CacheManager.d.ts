/**
 * CacheManager - Cache management utility
 * 
 * Type definitions for clearing document cache.
 */

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
declare namespace CacheManager {
    function clearCache(): void;
}
