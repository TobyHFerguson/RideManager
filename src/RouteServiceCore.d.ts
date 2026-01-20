/**
 * RouteServiceCore - Pure JavaScript logic for route data operations
 * 
 * Contains testable business logic for:
 * - URL validation and parsing
 * - Cache key generation  
 * - Route data trimming (remove large arrays for caching)
 * - Error message generation
 * 
 * @see RouteService for the GAS adapter that uses this core module
 */

/**
 * Trimmed route data safe for caching
 */
export interface TrimmedRoute {
    /** Route ID */
    id: number;
    /** Route name */
    name: string;
    /** Route URL */
    url?: string;
    /** First waypoint latitude */
    first_lat: number;
    /** First waypoint longitude */
    first_lng: number;
    /** User ID of route owner */
    user_id: number;
    /** Flag indicating course points were removed */
    has_course_points: boolean;
    /** Any other route properties */
    [key: string]: any;
}

declare namespace RouteServiceCore {
    /**
     * Valid RWGPS route URL pattern
     */
    const ROUTE_URL_PATTERN: RegExp;

    /**
     * Cache duration in seconds (6 hours)
     */
    const CACHE_DURATION_SECONDS: number;

    /**
     * Validate if URL matches RWGPS route pattern
     * 
     * @param url - URL to validate
     * @returns True if URL is valid RWGPS route URL
     */
    function isValidRouteUrl(url: string): boolean;

    /**
     * Generate cache key for a route URL
     * 
     * @param url - Route URL
     * @returns Cache key string
     */
    function getCacheKey(url: string): string;

    /**
     * Trim route data for caching (remove large arrays)
     * 
     * Removes: course_points, points_of_interest, track_points
     * Sets: has_course_points = false
     * 
     * @param route - Full route object from API
     * @returns Trimmed route object safe for caching
     */
    function trimRouteForCache(route: any): TrimmedRoute;

    /**
     * Generate error message for invalid URL
     * 
     * @param url - Invalid URL
     * @returns Error message
     */
    function getInvalidUrlError(url: string): string;

    /**
     * Generate error message for HTTP status code
     * 
     * @param statusCode - HTTP status code
     * @returns Error message
     */
    function getHttpStatusError(statusCode: number): string;
}

export default RouteServiceCore;
