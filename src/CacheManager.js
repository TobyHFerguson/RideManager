// @ts-check

var CacheManager = (function() {

class CacheManager {
    static clearCache() {
        const cache = CacheService.getDocumentCache();
        // CRITICAL: Cache keys must match exactly what's used in Globals.js and Groups.js
        // - 'Globals' (capital G) - used by Globals.js
        // - 'groups' (lowercase g) - used by Groups.js
        // - 'PersonalTemplates' (capital P) - used by Globals.js
        cache.removeAll(['Globals', 'groups', 'PersonalTemplates']);
        Logger.log('Caches cleared');
    }
}

return CacheManager;
})();