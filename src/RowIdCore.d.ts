/**
 * RowIdCore - Pure JavaScript logic for row identification and formula caching
 * 
 * Provides stable row identification across row insertions/deletions using UUIDs.
 */

/**
 * Formula cache type: map of UUID to formula string
 */
export type FormulaCache = Record<string, string>;

/**
 * Row data with UUID and formula
 */
export interface RowFormula {
    uuid: string;
    formula: string;
}

declare namespace RowIdCore {
    /**
     * Parse formula cache from JSON
     * @param json - JSON string of formula cache
     * @returns Map of UUID to formula
     */
    function parseFormulaCache(json: string | null): FormulaCache;

    /**
     * Serialize formula cache to JSON
     * @param cache - Map of UUID to formula
     * @returns JSON string
     */
    function serializeFormulaCache(cache: FormulaCache): string;

    /**
     * Get formula from cache by UUID
     * @param cache - Formula cache
     * @param uuid - Row UUID
     * @returns Formula string or null if not found
     */
    function getFormula(cache: FormulaCache, uuid: string): string | null;

    /**
     * Set formula in cache
     * @param cache - Formula cache (mutated)
     * @param uuid - Row UUID
     * @param formula - Formula string
     */
    function setFormula(cache: FormulaCache, uuid: string, formula: string): void;

    /**
     * Remove formula from cache
     * @param cache - Formula cache (mutated)
     * @param uuid - Row UUID
     */
    function removeFormula(cache: FormulaCache, uuid: string): void;

    /**
     * Build formula cache from row data
     * @param rows - Array of {uuid, formula} objects
     * @returns Formula cache
     */
    function buildCache(rows: RowFormula[]): FormulaCache;
}

export default RowIdCore;
