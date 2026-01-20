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

declare namespace RouteService {
    /**
     * Get route data from RWGPS using v1 API
     * 
     * Fetches route from cache or RWGPS v1 API.
     * Throws on error (same behavior as legacy utils.js getRoute).
     * 
     * @param url - Route URL (must match https://ridewithgps.com/routes/DIGITS pattern)
     * @param readThrough - If true, bypass cache and fetch fresh data (default: false)
     * @returns Route object from RWGPS API
     * @throws Error if URL is invalid or route cannot be accessed
     * 
     * @example
     * ```javascript
     * // Fetch with cache (default)
     * const route = RouteService.getRoute('https://ridewithgps.com/routes/12345');
     * 
     * // Force fresh fetch (bypass cache)
     * const freshRoute = RouteService.getRoute('https://ridewithgps.com/routes/12345', true);
     * ```
     */
    function getRoute(url: string, readThrough?: boolean): any;
}

export default RouteService;
