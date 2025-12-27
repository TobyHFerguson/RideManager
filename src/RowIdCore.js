// @ts-check

/**
 * RowIdCore - Pure JavaScript logic for row identification and formula caching
 * 
 * Provides stable row identification across row insertions/deletions using UUIDs.
 * This module handles the business logic; ScheduleAdapter handles DeveloperMetadata I/O.
 */

var RowIdCore = (function() {
    'use strict';

    /**
     * Parse formula cache from JSON
     * @param {string|null} json - JSON string of formula cache
     * @returns {Object<string, string>} Map of UUID to formula
     */
    function parseFormulaCache(json) {
        if (!json) return {};
        try {
            return JSON.parse(json);
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            console.warn(`RowIdCore: Failed to parse formula cache: ${err.message}`);
            return {};
        }
    }

    /**
     * Serialize formula cache to JSON
     * @param {Object<string, string>} cache - Map of UUID to formula
     * @returns {string} JSON string
     */
    function serializeFormulaCache(cache) {
        return JSON.stringify(cache);
    }

    /**
     * Get formula from cache by UUID
     * @param {Object<string, string>} cache - Formula cache
     * @param {string} uuid - Row UUID
     * @returns {string|null} Formula string or null if not found
     */
    function getFormula(cache, uuid) {
        return cache[uuid] || null;
    }

    /**
     * Set formula in cache
     * @param {Object<string, string>} cache - Formula cache (mutated)
     * @param {string} uuid - Row UUID
     * @param {string} formula - Formula string
     */
    function setFormula(cache, uuid, formula) {
        cache[uuid] = formula;
    }

    /**
     * Remove formula from cache
     * @param {Object<string, string>} cache - Formula cache (mutated)
     * @param {string} uuid - Row UUID
     */
    function removeFormula(cache, uuid) {
        delete cache[uuid];
    }

    /**
     * Build formula cache from row data
     * @param {Array<{uuid: string, formula: string}>} rows - Array of {uuid, formula} objects
     * @returns {Object<string, string>} Formula cache
     */
    function buildCache(rows) {
        /** @type {Object<string, string>} */
        const cache = {};
        rows.forEach(row => {
            if (row.uuid && row.formula) {
                cache[row.uuid] = row.formula;
            }
        });
        return cache;
    }

    return {
        parseFormulaCache,
        serializeFormulaCache,
        getFormula,
        setFormula,
        removeFormula,
        buildCache
    };
})();

if (typeof module !== 'undefined') {
    module.exports = RowIdCore;
}
