// @ts-check
/// <reference path="./gas-globals.d.ts" />

// @ts-ignore - Intentional redeclaration: .d.ts provides types, .js provides implementation for GAS
var CacheManager = (function() {

class CacheManager {
    static clearCache() {
        const cache = CacheService.getDocumentCache();
        if (!cache) {
            Logger.log('Document cache not available');
            return;
        }
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