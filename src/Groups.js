// @ts-check

var Groups = (function() {

/**
 * @param {Array<{Group: string, [key: string]: any}>} groups
 * @returns {Object<string, any>}
 */
function flatten_(groups) {
    // groups = [ {"Group": "A", "Template": ..., "MIN_LENGTH": ...}]
    // result = { "A": { "Template": ...}, "B": { "Template": ...}}
    groups = groups.reduce((acc, { Group, ...rest }) => {
        acc[Group] = rest;
        return acc;
    }, /** @type {Object<string, any>} */ ({}));
    return groups;
}

/**
 * @returns {Object<string, any>}
 */
function getGroupsFromSheet_() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Groups');
    if (!sheet) {
        throw new Error('Groups sheet not found');
    }
  
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
        return {}; // No data rows, return empty object
    }
  
    const lastCol = sheet.getLastColumn();
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  
    // Convert to array of objects with column names as keys
    const groups = data.map((row, rowIndex) => {
        /** @type {Record<string, any>} */
        const obj = {};
        headers.forEach((header, i) => {
            obj[header] = row[i];
        });
        return obj;
    });
  
    return flatten_(/** @type {Array<{Group: string, [key: string]: any}>} */ (groups));
}

class Groups {
    static getGroupNames() {
        return Object.keys(Groups.getGroupSpecs());  // ["A", "B", "C", ...]
    }

    static getGroupSpecs() {
        const cache = CacheService.getDocumentCache();
        let cachedGroups = cache.get('groups');
        if (cachedGroups) {
            return JSON.parse(cachedGroups);
        } else {
            return Groups.initializeGroupCache();
        }
    }

    static initializeGroupCache() {
        const cache = CacheService.getDocumentCache();
        let groups = getGroupsFromSheet_();
        cache.put('groups', JSON.stringify(groups), 21600); // Cache for 6 hours
        return groups;
    }
}

return Groups;
})();

// Global function aliases for backward compatibility
// These are called as global functions in GAS runtime
function getGroupNames() {
    return Groups.getGroupNames();
}

function getGroupSpecs() {
    return Groups.getGroupSpecs();
}

if(typeof module !== 'undefined') {
    module.exports = Groups;
}
