// @ts-check
/**
 * migrate-formulas-to-richtext.js
 * 
 * One-time migration utility: Convert all HYPERLINK formulas to RichText
 * 
 * This script should be run ONCE before deploying the new ScheduleAdapter code.
 * It converts existing HYPERLINK formulas in the Route and Ride columns to 
 * native RichText hyperlinks, eliminating the need for formula preservation logic.
 * 
 * USAGE:
 * ======
 * 1. Deploy this script to GAS (via npm run dev:push)
 * 2. Open Script Editor in GAS
 * 3. Run `migrateHyperlinksToRichText()` function
 * 4. Verify all Route/Ride links work in spreadsheet
 * 5. Deploy new ScheduleAdapter code with RichText support
 * 
 * SAFETY:
 * =======
 * - Non-destructive: Only converts HYPERLINK formulas, leaves other data unchanged
 * - Idempotent: Can be run multiple times safely (skips non-formula cells)
 * - Logging: Detailed console output for debugging
 * - Error handling: Continues processing if individual cells fail
 * 
 * @module migrate-formulas-to-richtext
 */

/* istanbul ignore file - GAS-only migration script */

/**
 * Main migration function: Convert all HYPERLINK formulas to RichText
 * 
 * Processes the 'Consolidated Rides' sheet and converts Route and Ride columns
 * from HYPERLINK formulas to native RichText hyperlinks.
 * 
 * @global
 * @function
 * @returns {void}
 */
function migrateHyperlinksToRichText() {
    console.log('=== Starting HYPERLINK → RichText Migration ===');
    
    try {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Consolidated Rides');
        
        if (!sheet) {
            throw new Error('Sheet "Consolidated Rides" not found');
        }
        
        const lastRow = sheet.getLastRow();
        if (lastRow < 2) {
            console.log('No data rows to process (sheet is empty)');
            return;
        }
        
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        
        // Find Route and Ride columns
        const routeColIndex = headers.indexOf('Route') + 1; // 1-based
        const rideColIndex = headers.indexOf('Ride') + 1;   // 1-based
        
        if (routeColIndex === 0) {
            throw new Error('Could not find "Route" column in headers');
        }
        if (rideColIndex === 0) {
            throw new Error('Could not find "Ride" column in headers');
        }
        
        console.log(`Found Route column at index ${routeColIndex}`);
        console.log(`Found Ride column at index ${rideColIndex}`);
        console.log(`Processing ${lastRow - 1} data rows...`);
        
        // Process Route column
        console.log('\n--- Converting Route column ---');
        const routeStats = convertColumnToRichText(sheet, routeColIndex, 2, lastRow);
        
        // Process Ride column
        console.log('\n--- Converting Ride column ---');
        const rideStats = convertColumnToRichText(sheet, rideColIndex, 2, lastRow);
        
        // Summary
        console.log('\n=== Migration Complete ===');
        console.log(`Route column: ${routeStats.converted} formulas converted, ${routeStats.skipped} cells skipped, ${routeStats.errors} errors`);
        console.log(`Ride column: ${rideStats.converted} formulas converted, ${rideStats.skipped} cells skipped, ${rideStats.errors} errors`);
        console.log('\nPlease verify links work, then deploy new ScheduleAdapter code.');
        
        if (routeStats.errors > 0 || rideStats.errors > 0) {
            console.warn('\nWARNING: Some cells failed to convert. Check console log for details.');
        }
        
    } catch (error) {
        console.error('FATAL ERROR during migration:', error);
        throw error;
    }
}

/**
 * Convert a single column from HYPERLINK formulas to RichText
 * 
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The sheet to process
 * @param {number} colIndex - Column index (1-based)
 * @param {number} startRow - First row to process (1-based)
 * @param {number} endRow - Last row to process (1-based)
 * @returns {{converted: number, skipped: number, errors: number}} Statistics
 */
function convertColumnToRichText(sheet, colIndex, startRow, endRow) {
    const numRows = endRow - startRow + 1;
    
    // Get formulas and values in batch
    const formulas = sheet.getRange(startRow, colIndex, numRows, 1).getFormulas();
    const values = sheet.getRange(startRow, colIndex, numRows, 1).getValues();
    
    let converted = 0;
    let skipped = 0;
    let errors = 0;
    
    formulas.forEach((formulaRow, i) => {
        const formula = formulaRow[0];
        const value = values[i][0];
        const rowNum = startRow + i;
        
        // Skip empty cells
        if (!formula && !value) {
            skipped++;
            return;
        }
        
        // Check if it's a HYPERLINK formula
        const match = formula.match(/^=HYPERLINK\("([^"]+)",\s*"([^"]+)"\)/i);
        
        if (match) {
            try {
                const url = match[1];
                const text = match[2];
                
                // Create RichText and write to cell
                const richText = SpreadsheetApp.newRichTextValue()
                    .setText(text)
                    .setLinkUrl(url)
                    .build();
                
                sheet.getRange(rowNum, colIndex).setRichTextValue(richText);
                converted++;
                
                console.log(`  Row ${rowNum}: Converted "${text}" → ${url}`);
                
            } catch (error) {
                errors++;
                console.error(`  Row ${rowNum}: ERROR converting formula: ${error.message}`);
                console.error(`    Formula was: ${formula}`);
            }
            
        } else if (formula.toLowerCase().startsWith('=hyperlink')) {
            // Malformed HYPERLINK formula
            errors++;
            console.warn(`  Row ${rowNum}: Could not parse HYPERLINK formula: ${formula}`);
            
        } else {
            // Not a HYPERLINK formula (might be plain text or other formula)
            skipped++;
        }
    });
    
    return { converted, skipped, errors };
}

/**
 * Reverse migration: Convert RichText hyperlinks back to HYPERLINK formulas
 * 
 * This is a rollback utility in case the migration needs to be reversed.
 * Use with caution - only needed if rolling back to formula-based code.
 * 
 * @global
 * @function
 * @returns {void}
 */
function convertRichTextToFormulas() {
    console.log('=== Starting RichText → HYPERLINK Migration (ROLLBACK) ===');
    
    try {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Consolidated Rides');
        
        if (!sheet) {
            throw new Error('Sheet "Consolidated Rides" not found');
        }
        
        const lastRow = sheet.getLastRow();
        if (lastRow < 2) {
            console.log('No data rows to process (sheet is empty)');
            return;
        }
        
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        
        // Find Route and Ride columns
        const routeColIndex = headers.indexOf('Route') + 1;
        const rideColIndex = headers.indexOf('Ride') + 1;
        
        if (routeColIndex === 0 || rideColIndex === 0) {
            throw new Error('Could not find Route or Ride columns');
        }
        
        console.log(`Processing ${lastRow - 1} data rows...`);
        
        // Process Route column
        console.log('\n--- Converting Route column ---');
        const routeStats = convertRichTextColumnToFormulas(sheet, routeColIndex, 2, lastRow);
        
        // Process Ride column
        console.log('\n--- Converting Ride column ---');
        const rideStats = convertRichTextColumnToFormulas(sheet, rideColIndex, 2, lastRow);
        
        // Summary
        console.log('\n=== Rollback Complete ===');
        console.log(`Route column: ${routeStats.converted} RichText converted, ${routeStats.skipped} cells skipped`);
        console.log(`Ride column: ${rideStats.converted} RichText converted, ${rideStats.skipped} cells skipped`);
        
    } catch (error) {
        console.error('FATAL ERROR during rollback:', error);
        throw error;
    }
}

/**
 * Convert a single column from RichText to HYPERLINK formulas
 * 
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The sheet to process
 * @param {number} colIndex - Column index (1-based)
 * @param {number} startRow - First row to process (1-based)
 * @param {number} endRow - Last row to process (1-based)
 * @returns {{converted: number, skipped: number}} Statistics
 */
function convertRichTextColumnToFormulas(sheet, colIndex, startRow, endRow) {
    const numRows = endRow - startRow + 1;
    
    // Get RichText values in batch
    const richTextValues = sheet.getRange(startRow, colIndex, numRows, 1).getRichTextValues();
    
    let converted = 0;
    let skipped = 0;
    
    richTextValues.forEach((richTextRow, i) => {
        const richText = richTextRow[0];
        const rowNum = startRow + i;
        
        if (!richText || richText.getText() === '') {
            skipped++;
            return;
        }
        
        const url = richText.getLinkUrl();
        const text = richText.getText();
        
        // Only convert if there's a URL (it's a hyperlink)
        if (url) {
            const formula = `=HYPERLINK("${url}", "${text}")`;
            sheet.getRange(rowNum, colIndex).setFormula(formula);
            converted++;
            console.log(`  Row ${rowNum}: Converted "${text}" (${url}) to formula`);
        } else {
            skipped++;
        }
    });
    
    return { converted, skipped };
}
