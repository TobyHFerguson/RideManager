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
 * HyperlinkUtils class with static utility methods
 */
declare class HyperlinkUtils {
    /**
     * Parse a Google Sheets HYPERLINK formula
     * 
     * @param formula - The HYPERLINK formula string to parse
     * @returns Object with url and name properties (empty strings if no match)
     */
    static parseHyperlinkFormula(formula: string): HyperlinkParts;

    /**
     * Create a HYPERLINK formula string
     * 
     * @param name - The display text for the hyperlink
     * @param url - The URL for the hyperlink
     * @returns HYPERLINK formula string ready for cell.setFormula()
     */
    static createHyperlinkFormula(name: string, url: string): string;

    /**
     * Convert Rich Text Values to HYPERLINK formulas for specified columns
     * 
     * @param headerNames - Array of column header names to process
     */
    static convertRTVsToHyperlinksByHeaders(headerNames: string[]): void;

    /**
     * Convert HYPERLINK formulas to Rich Text Values for specified columns
     * 
     * @param headerNames - Array of column header names to process
     */
    static convertHyperlinksToRichTextByHeaders(headerNames: string[]): void;

    /**
     * Test function for convertRTVsToHyperlinksByHeaders
     */
    static testConvert(): void;

    /**
     * Test function for convertHyperlinksToRichTextByHeaders
     */
    static testConvertToRichText(): void;
}

export default HyperlinkUtils;
