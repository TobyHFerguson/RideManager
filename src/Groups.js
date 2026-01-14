// @ts-check
function getGroupNames() {
  return Object.keys(getGroupSpecs());  // ["A", "B", "C", ...]
}

function getGroupSpecs() {
  const cache = CacheService.getDocumentCache();
  let cachedGroups = cache.get('groups');
  if (cachedGroups) {
    return JSON.parse(cachedGroups);
  } else {
    return initializeGroupCache();
  }
}

function initializeGroupCache() {
  const cache = CacheService.getDocumentCache();
  let groups = getGroupsFromSheet_();
  cache.put('groups', JSON.stringify(groups), 21600); // Cache for 6 hours
  return groups;
}

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
  
  // Find Logo column index
  const logoColIndex = headers.indexOf('Logo');
  
  // Convert to array of objects with column names as keys
  const groups = data.map((row, rowIndex) => {
    /** @type {Record<string, any>} */
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    
    // Extract logo URL from CellImage if Logo column exists
    if (logoColIndex !== -1) {
      const logoCell = sheet.getRange(rowIndex + 2, logoColIndex + 1); // +2 for header and 0-based
      const images = logoCell.getImages();
      if (images && images.length > 0) {
        obj.Logo = images[0].getUrl(); // Extract URL from CellImage
      } else {
        obj.Logo = null; // No logo found
      }
    }
    
    return obj;
  });
  
  return flatten_(groups);
}

function flatten_(groups) {
  // groups = [ {"Group": "A", "Template": ..., "MIN_LENGTH": ...}]
  // result = { "A": { "Template": ...}, "B": { "Template": ...}}
  groups = groups.reduce((acc, { Group, ...rest }) => {
    acc[Group] = rest;
    return acc;
  }, {});
  return groups;
}

// Export for GAS (global)
var Groups = {
  getGroupNames: getGroupNames,
  getGroupSpecs: getGroupSpecs
};

if(typeof module !== 'undefined') {
  module.exports = Groups;
}
