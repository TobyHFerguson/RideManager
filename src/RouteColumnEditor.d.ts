/**
 * RouteColumnEditor - Pure JavaScript logic for editing route column
 * 
 * Type definitions for route URL parsing and hyperlink formula building.
 * Handles foreign route detection and naming.
 */

/**
 * Result of parsing route input
 */
export interface ParsedRouteInput {
    /** Extracted URL (null if empty/invalid) */
    url: string | null;
    /** Whether the input was already a hyperlink formula */
    wasFormula: boolean;
}

/**
 * Route data from RWGPS
 */
export interface RouteData {
    /** RWGPS user ID of route owner */
    user_id: number;
    /** Route name */
    name: string;
}

/**
 * Route name determination result
 */
export interface RouteNameResult {
    /** Display name for the route */
    name: string;
    /** Whether this is a foreign (non-club) route */
    isForeign: boolean;
}

/**
 * Parameters for processing a route edit
 */
export interface ProcessRouteEditParams {
    /** Raw input value from user */
    inputValue: string | null;
    /** Route data from RWGPS API */
    route: RouteData;
    /** Club's RWGPS user ID */
    clubUserId: number;
    /** Prefix to add for foreign routes (e.g., "EXTERNAL:") */
    foreignPrefix: string;
    /** Optional user-provided name (for foreign routes) */
    userProvidedName?: string;
}

/**
 * RichText link object
 */
export interface RichTextLink {
    /** Display text */
    text: string;
    /** Hyperlink URL */
    url: string;
}

/**
 * Result of processing a route edit
 */
export interface ProcessRouteEditResult {
    /** RichText link object to set (null if cleared) */
    link: RichTextLink | null;
    /** Whether this is a foreign route */
    isForeign: boolean;
}

/**
 * RouteColumnEditor class with static methods for route column editing
 */
declare class RouteColumnEditor {
    /**
     * Parse various forms of route input to extract URL
     * 
     * Handles:
     * - Plain URLs: "https://ridewithgps.com/routes/12345"
     * - HYPERLINK formulas: '=HYPERLINK("url", "name")'
     * - Empty/null input
     * 
     * @param input - Could be URL, hyperlink formula, or empty
     * @returns Parsed URL and whether input was a formula
     */
    static parseRouteInput(input: string): ParsedRouteInput;

    /**
     * Determine the display name for a route
     * 
     * Logic:
     * - If club route: use route.name
     * - If foreign route: use userProvidedName or prefix route.name
     * 
     * @param route - Route object from RWGPS
     * @param clubUserId - Club's RWGPS user ID
     * @param foreignPrefix - Prefix for foreign routes (e.g., "EXTERNAL:")
     * @param userProvidedName - Optional user-provided name (for foreign routes)
     * @returns Display name and foreign status
     */
    static determineRouteName(
        route: RouteData,
        clubUserId: number,
        foreignPrefix: string,
        userProvidedName?: string
    ): RouteNameResult;

    /**
     * Build a hyperlink formula string (legacy support for migration)
     * 
     * @deprecated Use buildRichTextLink instead for new code
     * @param url - The URL
     * @param name - The display name
     * @returns HYPERLINK formula (lowercase "hyperlink")
     */
    static buildHyperlinkFormula(url: string, name: string): string;

    /**
     * Build a RichText link object
     * 
     * @param url - The URL
     * @param name - The display name
     * @returns RichText link object with text and url properties
     */
    static buildRichTextLink(url: string, name: string): RichTextLink;

    /**
     * Process route column edit - pure logic
     * 
     * Orchestrates the full route edit workflow:
     * 1. Parse input to extract URL
     * 2. Determine route name (with foreign prefix if needed)
     * 3. Build RichText link object
     * 
     * @param params - Processing parameters
     * @returns RichText link object and foreign status
     */
    static processRouteEdit(params: ProcessRouteEditParams): ProcessRouteEditResult;
}

export default RouteColumnEditor;
