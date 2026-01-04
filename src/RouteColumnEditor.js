// @ts-check

/**
 * RouteColumnEditor - Pure JavaScript logic for editing route column
 * 
 * Handles parsing route URLs, building hyperlink formulas, and determining
 * route names (including foreign route prefixes). All pure functions, no GAS dependencies.
 */

if (typeof require !== 'undefined') {
    var HyperlinkUtils = require('./HyperlinkUtils.js');
}

/**
 * Parse various forms of route input to extract URL
 * @param {string} input - Could be URL, hyperlink formula, or empty
 * @returns {{url: string|null, wasFormula: boolean}} Parsed URL and whether input was a formula
 */
function parseRouteInput(input) {
    if (!input) {
        return { url: null, wasFormula: false };
    }

    // Check if it's already a hyperlink formula
    if (input.toLowerCase().startsWith("=hyperlink")) {
        const { url } = HyperlinkUtils.parseHyperlinkFormula(input);
        return { url, wasFormula: true };
    }

    // Otherwise treat as plain URL
    return { url: input.trim(), wasFormula: false };
}

/**
 * Determine the display name for a route
 * @param {{user_id: number, name: string}} route - Route object from RWGPS
 * @param {number} route.user_id - User ID of route owner
 * @param {string} route.name - Route name
 * @param {number} clubUserId - Club's RWGPS user ID
 * @param {string} foreignPrefix - Prefix for foreign routes
 * @param {string} [userProvidedName] - Optional user-provided name (for foreign routes)
 * @returns {{name: string, isForeign: boolean}} Display name and foreign status
 */
function determineRouteName(route, clubUserId, foreignPrefix, userProvidedName) {
    const isForeign = route.user_id !== clubUserId;
    
    if (!isForeign) {
        return { name: route.name, isForeign: false };
    }

    // Foreign route - use provided name or generate one
    const baseName = userProvidedName || route.name;
    const name = userProvidedName || `${foreignPrefix} ${route.name}`;
    
    return { name, isForeign: true };
}

/**
 * Build a hyperlink formula string
 * @param {string} url - The URL
 * @param {string} name - The display name
 * @returns {string} HYPERLINK formula
 */
function buildHyperlinkFormula(url, name) {
    return `=hyperlink("${url}", "${name}")`;
}

/**
 * Process route column edit - pure logic
 * @param {{inputValue: string | null, route: {user_id: number, name: string}, clubUserId: number, foreignPrefix: string, userProvidedName?: string}} params
 * @param {string|null} params.inputValue - Raw input value
 * @param {{user_id: number, name: string}} params.route - Route data from RWGPS
 * @param {number} params.route.user_id - Route owner ID
 * @param {string} params.route.name - Route name
 * @param {number} params.clubUserId - Club's user ID
 * @param {string} params.foreignPrefix - Prefix for foreign routes
 * @param {string} [params.userProvidedName] - Optional user-provided name
 * @returns {{formula: string|null, isForeign: boolean}} Formula to set and foreign status
 */
function processRouteEdit(params) {
    const { inputValue, route, clubUserId, foreignPrefix, userProvidedName } = params;
    
    const { url } = parseRouteInput(inputValue);
    
    // Empty/cleared route
    if (!url) {
        return { formula: null, isForeign: false };
    }

    // Determine name
    const { name, isForeign } = determineRouteName(
        route, 
        clubUserId, 
        foreignPrefix, 
        userProvidedName
    );

    // Build formula
    const formula = buildHyperlinkFormula(url, name);
    
    return { formula, isForeign };
}

// Export for GAS (global)
var RouteColumnEditor = {
    parseRouteInput: parseRouteInput,
    determineRouteName: determineRouteName,
    buildHyperlinkFormula: buildHyperlinkFormula,
    processRouteEdit: processRouteEdit
};

// Export for testing
if (typeof module !== 'undefined') {
    module.exports = RouteColumnEditor;
}
