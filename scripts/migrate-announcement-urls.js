// @ts-check
/**
 * migrate-announcement-urls.js
 * 
 * One-time migration utility: Update Announcement RichText hyperlinks to show document titles
 * 
 * This script updates existing announcement RichText hyperlinks in the "Announcement" column
 * to display the document title instead of the document URL. The announcement column already
 * contains RichText hyperlinks, but they show the URL as both the display text and the link.
 * This migration updates them to show the document title as the display text.
 * 
 * USAGE:
 * ======
 * 1. Deploy this script to GAS (via npm run dev:push)
 * 2. Open Script Editor in GAS
 * 3. Run `migrateAnnouncementUrls()` function
 * 4. Verify all Announcement links show document titles (not URLs) in spreadsheet
 * 5. Deploy updated RowCore/AnnouncementManager code
 * 
 * SAFETY:
 * =======
 * - Non-destructive: Only updates display text, preserves URL links
 * - Updates ALL announcement links to show document titles
 * - Logging: Detailed console output for debugging
 * - Error handling: Continues processing if individual cells fail
 * 
 * @module migrate-announcement-urls
 */

/* istanbul ignore file - GAS-only migration script */

/**
 * Main migration function: Update Announcement RichText hyperlinks to show document titles
 * 
 * Processes the 'Consolidated Rides' sheet and updates the "Announcement" column
 * RichText hyperlinks to display document titles instead of URLs.
 * 
 * @global
 * @function
 * @returns {void}
 */
function migrateAnnouncementUrls() {
    console.log('=== Starting Announcement RichText Migration (URL → Title) ===');
    
    try {
        // 1. Get sheet and validate
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Consolidated Rides');
        if (!sheet) {
            throw new Error('Sheet "Consolidated Rides" not found');
        }
        
        const lastRow = sheet.getLastRow();
        if (lastRow < 2) {
            console.log('No data rows to process (sheet is empty)');
            return;
        }
        
        // 2. Find Announcement column by header name
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        const announcementColIndex = headers.indexOf('Announcement') + 1; // 1-based
        
        if (announcementColIndex === 0) {
            throw new Error('Could not find "Announcement" column in headers');
        }
        
        console.log(`Found Announcement column at index ${announcementColIndex}`);
        console.log(`Processing ${lastRow - 1} data rows...`);
        
        // 3. Get RichText values (announcements are already RichText hyperlinks)
        const dataRange = sheet.getRange(2, announcementColIndex, lastRow - 1, 1);
        const richTextValues = dataRange.getRichTextValues();
        
        let converted = 0;
        let skipped = 0;
        let errors = 0;
        
        // 4. Process each row
        for (let i = 0; i < richTextValues.length; i++) {
            const richText = richTextValues[i][0];
            const rowNum = i + 2; // 1-based, +1 for header
            
            try {
                // Skip empty cells (no RichText or no link)
                if (!richText || !richText.getLinkUrl()) {
                    skipped++;
                    continue;
                }
                
                const currentText = richText.getText();
                const docUrl = richText.getLinkUrl();
                
                // Extract document ID from URL
                // Pattern: https://docs.google.com/document/d/{DOC_ID}/...
                const match = docUrl.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
                if (!match) {
                    console.warn(`Row ${rowNum}: Invalid document URL format: ${docUrl}`);
                    errors++;
                    continue;
                }
                
                const docId = match[1];
                
                // Get document title
                let docTitle;
                try {
                    const doc = DocumentApp.openById(docId);
                    docTitle = doc.getName();
                } catch (docError) {
                    const err = docError instanceof Error ? docError : new Error(String(docError));
                    console.warn(`Row ${rowNum}: Could not access document ${docId}: ${err.message}`);
                    errors++;
                    continue;
                }
                
                // Create updated RichText hyperlink with title as display text
                const richTextValue = SpreadsheetApp.newRichTextValue()
                    .setText(docTitle)
                    .setLinkUrl(docUrl)
                    .build();
                
                // Write to cell
                const cell = sheet.getRange(rowNum, announcementColIndex);
                cell.setRichTextValue(richTextValue);
                
                console.log(`Row ${rowNum}: Updated "${currentText}" → "${docTitle}"`);
                converted++;
                if (converted % 10 === 0) {
                    console.log(`  Converted ${converted} rows...`);
                }
                
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                console.error(`Row ${rowNum}: ${err.message}`);
                errors++;
            }
        }
        
        // 5. Summary report
        console.log('\n=== Migration Complete ===');
        console.log(`Converted: ${converted}`);
        console.log(`Skipped: ${skipped}`);
        console.log(`Errors: ${errors}`);
        console.log('\nPlease verify links in spreadsheet show document titles (not URLs).');
        
        if (errors > 0) {
            console.warn('\nWARNING: Some cells failed. Check console log for details.');
        }
        
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('FATAL ERROR during migration:', err.message);
        throw error;
    }
}
