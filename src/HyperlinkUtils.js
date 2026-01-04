// @ts-check
// HyperlinkUtils.js

/**
 * Parses a Google Sheets HYPERLINK formula and extracts the URL and display name.
 *
 * @param {string} formula - The HYPERLINK formula string to parse, e.g. '=HYPERLINK("https://example.com", "Example")'.
 * @returns {{url: string, name: string}} An object containing the extracted URL and display name.
 *          If the formula does not match, both properties will be empty strings.
 */
function parseHyperlinkFormula(formula) {
    const regex = /=HYPERLINK\("([^"]+)",\s*"([^"]+)"\)/i;
    const match = formula.match(regex);
    return match ? { url: match[1], name: match[2] } : { url: '', name: '' };
}
  
  /**
  * Create a HYPERLINK formula string.
  * @param {string} name - The display text for the hyperlink.
  * @param {string} url - The URL for the hyperlink.
  * @returns {string} The HYPERLINK formula string.
  */
  function createHyperlinkFormula(name, url) {
    return `=HYPERLINK("${url}", "${name}")`;
  }
  
  /* istanbul ignore next - GAS-only function, cannot be tested in Jest */
  function convertRTVsToHyperlinksByHeaders(headerNames) {
    // Get the active sheet
    var sheet = SpreadsheetApp.getActiveSheet();
    var headerRow = 1; // Assuming headers are in the first row
  
    // Get the last column with data
    var lastColumn = sheet.getLastColumn();
  
    // Get the header values
    var headerValues = sheet.getRange(headerRow, 1, 1, lastColumn).getValues()[0];
  
    // Iterate through provided header names
    for (var i = 0; i < headerNames.length; i++) {
      var headerName = headerNames[i];
      var columnIndex = headerValues.indexOf(headerName) + 1; // +1 for 1-based indexing
  
      // Check if header is found
      if (columnIndex > 0) {
        // Get the last row with data in the current column
        var lastRow = sheet.getLastRow();
        
        // Get the range for the current column (excluding the header row)
        var range = sheet.getRange(headerRow + 1, columnIndex, lastRow - headerRow);
        var richTextValues = range.getRichTextValues();
  
        // Iterate through each cell in the column
        for (var j = 0; j < richTextValues.length; j++) {
          var cellValue = richTextValues[j][0];
  
          // Check if the cell is not empty
          if (cellValue) {
            var url = cellValue.getLinkUrl();
            var text = cellValue.getText();
  
            //Only create a hyperlink if a URL exists
            if (url) {
              var newCell = sheet.getRange(j + headerRow + 1, columnIndex);
              newCell.setFormula(`=HYPERLINK("${url}", "${text}")`);
            }
          }
        }
      } else {
        Logger.log(`Header "${headerName}" not found.`);
      }
    }
  }
  
  /**
   * Convert HYPERLINK formulas to RichText by header names
   * This is the reverse of convertRTVsToHyperlinksByHeaders
   * Used for migration from formula-based to RichText-based hyperlinks
   * @param {string[]} headerNames - Array of column header names to convert
   */
  /* istanbul ignore next - GAS-only function, cannot be tested in Jest */
  function convertHyperlinksToRichTextByHeaders(headerNames) {
    // Get the active sheet
    var sheet = SpreadsheetApp.getActiveSheet();
    var headerRow = 1; // Assuming headers are in the first row
  
    // Get the last column with data
    var lastColumn = sheet.getLastColumn();
  
    // Get the header values
    var headerValues = sheet.getRange(headerRow, 1, 1, lastColumn).getValues()[0];
  
    // Iterate through provided header names
    for (var i = 0; i < headerNames.length; i++) {
      var headerName = headerNames[i];
      var columnIndex = headerValues.indexOf(headerName) + 1; // +1 for 1-based indexing
  
      // Check if header is found
      if (columnIndex > 0) {
        // Get the last row with data in the current column
        var lastRow = sheet.getLastRow();
        
        // Get the range for the current column (excluding the header row)
        var range = sheet.getRange(headerRow + 1, columnIndex, lastRow - headerRow);
        var formulas = range.getFormulas();
  
        // Iterate through each cell in the column
        for (var j = 0; j < formulas.length; j++) {
          var formula = formulas[j][0];
  
          // Check if it's a HYPERLINK formula
          if (formula && formula.toLowerCase().startsWith('=hyperlink')) {
            var parsed = parseHyperlinkFormula(formula);
            
            // Only create RichText if we successfully parsed URL and name
            if (parsed.url && parsed.name) {
              var richText = SpreadsheetApp.newRichTextValue()
                .setText(parsed.name)
                .setLinkUrl(parsed.url)
                .build();
              
              var newCell = sheet.getRange(j + headerRow + 1, columnIndex);
              newCell.setRichTextValue(richText);
            }
          }
        }
      } else {
        Logger.log(`Header "${headerName}" not found.`);
      }
    }
  }

  // Example usage:
  /* istanbul ignore next - GAS-only test function */
  function testConvert() {
    // Call the function with an array of header names
    convertRTVsToHyperlinksByHeaders(["Ride", "Route"]); // Replace with your actual header names
  }

  // Example usage for migration:
  /* istanbul ignore next - GAS-only test function */
  function testConvertToRichText() {
    // Convert formulas to RichText - used during migration
    convertHyperlinksToRichTextByHeaders(["Ride", "Route"]);
  }

// Export for GAS (global)
var HyperlinkUtils = {
    parseHyperlinkFormula: parseHyperlinkFormula,
    createHyperlinkFormula: createHyperlinkFormula,
    convertRTVsToHyperlinksByHeaders: convertRTVsToHyperlinksByHeaders,
    convertHyperlinksToRichTextByHeaders: convertHyperlinksToRichTextByHeaders,
    testConvert: testConvert,
    testConvertToRichText: testConvertToRichText
};

// Export for testing
if (typeof module !== 'undefined') {
    module.exports = HyperlinkUtils;
}