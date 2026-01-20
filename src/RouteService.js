// @ts-check
/// <reference path="./RouteService.d.ts" />
/// <reference path="./RouteServiceCore.d.ts" />
/// <reference path="./gas-globals.d.ts" />

/**
 * RouteService - GAS adapter for route data operations
 * 
 * Uses RWGPSClientFactory to access v1 API for route data.
 * Maintains caching via CacheService for performance.
 * 
 * This adapter wraps RWGPSClient.getRoute() to provide:
 * - Same interface as legacy utils.js getRoute()
 * - Caching via GAS CacheService
 * - Error handling (throws on failure like legacy)
 * 
 * @see RouteServiceCore for pure JavaScript business logic
 * @see RWGPSClient.getRoute() for v1 API implementation
 */

/* istanbul ignore file - GAS-specific adapter, no Jest tests */

var RouteService = (function() {

class RouteService {
    /**
     * Get route data from RWGPS using v1 API
     * 
     * Fetches route from cache or RWGPS v1 API.
     * Throws on error (same behavior as legacy utils.js getRoute).
     * 
     * @param {string} url - Route URL (must match https://ridewithgps.com/routes/DIGITS pattern)
     * @param {boolean} [readThrough=false] - If true, bypass cache and fetch fresh data
     * @returns {any} Route object from RWGPS API
     * @throws {Error} If URL is invalid or route cannot be accessed
     */
    static getRoute(url, readThrough = false) {
        // Validate URL
        if (!RouteServiceCore.isValidRouteUrl(url)) {
            throw new Error(RouteServiceCore.getInvalidUrlError(url));
        }

        const cache = CacheService.getDocumentCache();
        const cacheKey = RouteServiceCore.getCacheKey(url);

        // Check cache first (unless readThrough requested)
        if (!readThrough && cache) {
            const cachedRoute = cache.get(cacheKey);
            if (cachedRoute) {
                return JSON.parse(cachedRoute);
            }
        }

        // Fetch from RWGPS v1 API
        const client = RWGPSClientFactory.create();
        const result = client.getRoute(url);

        // Handle API errors (throw like legacy getRoute)
        if (!result.success) {
            throw new Error(result.error || 'Unknown error fetching route');
        }

        const route = result.route;

        // Trim route for caching (remove large arrays)
        const trimmedRoute = RouteServiceCore.trimRouteForCache(route);

        // Cache the trimmed route
        if (cache) {
            cache.put(cacheKey, JSON.stringify(trimmedRoute), RouteServiceCore.CACHE_DURATION_SECONDS);
        }

        return trimmedRoute;
    }
}

return RouteService;
})();

// Node.js compatibility for Jest testing (module won't work without GAS globals)
if (typeof module !== 'undefined') {
    module.exports = RouteService;
}
