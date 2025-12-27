/**
 * HyperlinkUtils - Utilities for parsing and creating HYPERLINK formulas
 * 
 * Type definitions for Google Sheets hyperlink formula operations.
 * Pure JavaScript functions with no GAS dependencies.
 */

/**
 * Result of parsing a hyperlink formula
 */
export interface HyperlinkParts {
    /** The URL from the formula */
    url: string;
    /** The display name/text from the formula */
    name: string;
}

/**
 * Parse a Google Sheets HYPERLINK formula
 * 
 * Extracts the URL and display name from a formula like:
 * `=HYPERLINK("https://example.com", "Example")`
 * 
 * @param formula - The HYPERLINK formula string to parse
 * @returns Object with url and name properties (empty strings if no match)
 * 
 * @example
 * ```javascript
 * const result = parseHyperlinkFormula('=HYPERLINK("https://ridewithgps.com/routes/12345", "My Route")');
 * console.log(result.url);  // "https://ridewithgps.com/routes/12345"
 * console.log(result.name); // "My Route"
 * ```
 */
declare function parseHyperlinkFormula(formula: string): HyperlinkParts;

/**
 * Create a HYPERLINK formula string
 * 
 * @param name - The display text for the hyperlink
 * @param url - The URL for the hyperlink
 * @returns HYPERLINK formula string ready for cell.setFormula()
 * 
 * @example
 * ```javascript
 * const formula = createHyperlinkFormula("My Route", "https://ridewithgps.com/routes/12345");
 * console.log(formula); // '=HYPERLINK("https://ridewithgps.com/routes/12345", "My Route")'
 * ```
 */
declare function createHyperlinkFormula(name: string, url: string): string;

/**
 * Convert Rich Text Values to HYPERLINK formulas for specified columns
 * 
 * GAS-specific function that processes columns containing rich text with URLs
 * and converts them to HYPERLINK formulas for better formula preservation.
 * 
 * @param headerNames - Array of column header names to process
 * 
 * @example
 * ```javascript
 * convertRTVsToHyperlinksByHeaders(["Ride", "Route"]);
 * ```
 */
declare function convertRTVsToHyperlinksByHeaders(headerNames: string[]): void;

/**
 * Test function for convertRTVsToHyperlinksByHeaders
 * Converts "Ride" and "Route" columns
 */
declare function testConvert(): void;

/**
 * HyperlinkUtils namespace with all utility functions
 */
interface HyperlinkUtilsNamespace {
    parseHyperlinkFormula: typeof parseHyperlinkFormula;
    createHyperlinkFormula: typeof createHyperlinkFormula;
    convertRTVsToHyperlinksByHeaders: typeof convertRTVsToHyperlinksByHeaders;
    testConvert: typeof testConvert;
}

declare const HyperlinkUtils: HyperlinkUtilsNamespace;

export default HyperlinkUtils;
export { parseHyperlinkFormula, createHyperlinkFormula, convertRTVsToHyperlinksByHeaders, testConvert };
