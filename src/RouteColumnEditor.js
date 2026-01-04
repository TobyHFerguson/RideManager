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
 * Build a hyperlink formula string (legacy support for migration)
 * @deprecated Use buildRichTextLink instead for new code
 * @param {string} url - The URL
 * @param {string} name - The display name
 * @returns {string} HYPERLINK formula
 */
function buildHyperlinkFormula(url, name) {
    return `=hyperlink("${url}", "${name}")`;
}

/**
 * Build a RichText link object
 * @param {string} url - The URL
 * @param {string} name - The display name
 * @returns {{text: string, url: string}} RichText link object
 */
function buildRichTextLink(url, name) {
    return { text: name, url: url };
}

/**
 * Process route column edit - pure logic
 * @param {{inputValue: string | null, route: {user_id: number, name: string}, clubUserId: number, foreignPrefix: string, userProvidedName?: string}} params

 * @returns {{link: {text: string, url: string}|null, isForeign: boolean}} RichText link object and foreign status
 */
function processRouteEdit(params) {
    const { inputValue, route, clubUserId, foreignPrefix, userProvidedName } = params;
    if (inputValue === null) {
        return { link: null, isForeign: false };
    }
    const { url } = parseRouteInput(inputValue);
    
    // Empty/cleared route
    if (!url) {
        return { link: null, isForeign: false };
    }

    // Determine name
    const { name, isForeign } = determineRouteName(
        route, 
        clubUserId, 
        foreignPrefix, 
        userProvidedName
    );

    // Build RichText link
    const link = buildRichTextLink(url, name);
    
    return { link, isForeign };
}

// Export for GAS (global)
var RouteColumnEditor = {
    parseRouteInput: parseRouteInput,
    determineRouteName: determineRouteName,
    buildHyperlinkFormula: buildHyperlinkFormula, // Legacy for migration
    buildRichTextLink: buildRichTextLink,
    processRouteEdit: processRouteEdit
};

// Export for testing
if (typeof module !== 'undefined') {
    module.exports = RouteColumnEditor;
}
