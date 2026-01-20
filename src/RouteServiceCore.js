// @ts-check
/// <reference path="./RouteServiceCore.d.ts" />

/**
 * RouteServiceCore - Pure JavaScript logic for route data operations
 * 
 * Contains testable business logic for:
 * - URL validation and parsing
 * - Cache key generation  
 * - Route data trimming (remove large arrays for caching)
 * - Error message generation
 * 
 * This is a Core module with 100% test coverage.
 * GAS-specific operations are in RouteService.js
 * 
 * @see RouteService for the GAS adapter that uses this core module
 */
var RouteServiceCore = (function() {

class RouteServiceCore {
    /**
     * Valid RWGPS route URL pattern
     * Matches: https://ridewithgps.com/routes/DIGITS (optionally followed by -slug)
     * @returns {RegExp}
     */
    static get ROUTE_URL_PATTERN() {
        return /(https:\/\/ridewithgps\.com\/routes\/\d+)/;
    }

    /**
     * Cache duration in seconds (6 hours)
     * @returns {number}
     */
    static get CACHE_DURATION_SECONDS() {
        return 21600; // 6 hours
    }

    /**
     * Validate if URL matches RWGPS route pattern
     * 
     * @param {string | null | undefined} url - URL to validate
     * @returns {boolean} True if URL is valid RWGPS route URL
     */
    static isValidRouteUrl(url) {
        if (!url || typeof url !== 'string') {
            return false;
        }
        return RouteServiceCore.ROUTE_URL_PATTERN.test(url);
    }

    /**
     * Generate cache key for a route URL
     * 
     * @param {string} url - Route URL
     * @returns {string} Cache key string
     */
    static getCacheKey(url) {
        // Use the URL directly as the cache key
        return url;
    }

    /**
     * Trim route data for caching (remove large arrays)
     * 
     * Removes: course_points, points_of_interest, track_points
     * Sets: has_course_points = false
     * 
     * @param {any} route - Full route object from API
     * @returns {any} Trimmed route object safe for caching
     */
    static trimRouteForCache(route) {
        // Create a shallow copy to avoid modifying original
        const trimmed = { ...route };
        
        // Remove large arrays that aren't needed for display/validation
        delete trimmed.course_points;
        delete trimmed.points_of_interest;
        delete trimmed.track_points;
        
        // Mark that course points were removed
        trimmed.has_course_points = false;
        
        return trimmed;
    }

    /**
     * Generate error message for invalid URL
     * 
     * @param {string} url - Invalid URL
     * @returns {string} Error message
     */
    static getInvalidUrlError(url) {
        return `Invalid URL: '${url}'. It doesn't match the pattern 'https://ridewithgps.com/routes/DIGITS'`;
    }

    /**
     * Generate error message for HTTP status code
     * 
     * @param {number} statusCode - HTTP status code
     * @returns {string} Error message
     */
    static getHttpStatusError(statusCode) {
        switch (statusCode) {
            case 403:
                return 'Route URL does not have public access';
            case 404:
                return 'This route cannot be found on the server';
            default:
                return `Unknown issue with Route URL (HTTP ${statusCode})`;
        }
    }
}

return RouteServiceCore;
})();

// Node.js compatibility for Jest testing
if (typeof module !== 'undefined') {
    module.exports = RouteServiceCore;
}
