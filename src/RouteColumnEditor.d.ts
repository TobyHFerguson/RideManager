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
 * Result of processing a route edit
 */
export interface ProcessRouteEditResult {
    /** HYPERLINK formula to set (null if cleared) */
    formula: string | null;
    /** Whether this is a foreign route */
    isForeign: boolean;
}

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
 * 
 * @example
 * ```javascript
 * const result1 = parseRouteInput('=HYPERLINK("https://ridewithgps.com/routes/12345", "My Route")');
 * console.log(result1.url); // "https://ridewithgps.com/routes/12345"
 * console.log(result1.wasFormula); // true
 * 
 * const result2 = parseRouteInput('https://ridewithgps.com/routes/12345');
 * console.log(result2.url); // "https://ridewithgps.com/routes/12345"
 * console.log(result2.wasFormula); // false
 * ```
 */
declare function parseRouteInput(input: string): ParsedRouteInput;

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
 * 
 * @example
 * ```javascript
 * const result = determineRouteName(
 *   { user_id: 999, name: "Cool Route" },
 *   12345,  // club user ID
 *   "EXTERNAL:",
 *   undefined
 * );
 * console.log(result.name); // "EXTERNAL: Cool Route"
 * console.log(result.isForeign); // true
 * ```
 */
declare function determineRouteName(
    route: RouteData,
    clubUserId: number,
    foreignPrefix: string,
    userProvidedName?: string
): RouteNameResult;

/**
 * Build a hyperlink formula string
 * 
 * @param url - The URL
 * @param name - The display name
 * @returns HYPERLINK formula (lowercase "hyperlink")
 * 
 * @example
 * ```javascript
 * const formula = buildHyperlinkFormula("https://ridewithgps.com/routes/12345", "My Route");
 * console.log(formula); // '=hyperlink("https://ridewithgps.com/routes/12345", "My Route")'
 * ```
 */
declare function buildHyperlinkFormula(url: string, name: string): string;

/**
 * Process route column edit - pure logic
 * 
 * Orchestrates the full route edit workflow:
 * 1. Parse input to extract URL
 * 2. Determine route name (with foreign prefix if needed)
 * 3. Build HYPERLINK formula
 * 
 * @param params - Processing parameters
 * @returns Formula to set and foreign status
 * 
 * @example
 * ```javascript
 * const result = processRouteEdit({
 *   inputValue: 'https://ridewithgps.com/routes/12345',
 *   route: { user_id: 999, name: "Cool Route" },
 *   clubUserId: 12345,
 *   foreignPrefix: "EXTERNAL:",
 *   userProvidedName: undefined
 * });
 * console.log(result.formula); // '=hyperlink("https://ridewithgps.com/routes/12345", "EXTERNAL: Cool Route")'
 * console.log(result.isForeign); // true
 * ```
 */
declare function processRouteEdit(params: ProcessRouteEditParams): ProcessRouteEditResult;

/**
 * RouteColumnEditor namespace
 */
interface RouteColumnEditorNamespace {
    parseRouteInput: typeof parseRouteInput;
    determineRouteName: typeof determineRouteName;
    buildHyperlinkFormula: typeof buildHyperlinkFormula;
    processRouteEdit: typeof processRouteEdit;
}

declare const RouteColumnEditor: RouteColumnEditorNamespace;

export default RouteColumnEditor;
export { parseRouteInput, determineRouteName, buildHyperlinkFormula, processRouteEdit };
