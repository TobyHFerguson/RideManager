// @ts-check
/**
 * migrate-announcement-urls.js
 * 
 * One-time migration utility: Convert plain text Announcement URLs to RichText hyperlinks
 * 
 * This script converts existing announcement URLs in the "Announcement" column
 * from plain text to RichText hyperlinks that display the document title.
 * 
 * USAGE:
 * ======
 * 1. Deploy this script to GAS (via npm run dev:push)
 * 2. Open Script Editor in GAS
 * 3. Run `migrateAnnouncementUrls()` function
 * 4. Verify all Announcement links show titles in spreadsheet
 * 5. Deploy updated RowCore/AnnouncementManager code
 * 
 * SAFETY:
 * =======
 * - Non-destructive: Only converts non-empty URLs, leaves empty cells unchanged
 * - Idempotent: Can be run multiple times safely (checks for existing RichText links)
 * - Logging: Detailed console output for debugging
 * - Error handling: Continues processing if individual cells fail
 * 
 * @module migrate-announcement-urls
 */

/* istanbul ignore file - GAS-only migration script */

/**
 * Main migration function: Convert plain text Announcement URLs to RichText hyperlinks
 * 
 * Processes the 'Consolidated Rides' sheet and converts the "Announcement" column
 * from plain text URLs to RichText hyperlinks displaying the document title.
 * 
 * @global
 * @function
 * @returns {void}
 */
function migrateAnnouncementUrls() {
    console.log('=== Starting Announcement URL → RichText Migration ===');
    
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
        
        // 3. Get all data (bulk read for performance)
        const dataRange = sheet.getRange(2, announcementColIndex, lastRow - 1, 1);
        const values = dataRange.getValues();
        const richTextValues = dataRange.getRichTextValues(); // For idempotency check
        
        let converted = 0;
        let skipped = 0;
        let errors = 0;
        
        // 4. Process each row
        for (let i = 0; i < values.length; i++) {
            const docUrl = values[i][0];
            const richText = richTextValues[i][0];
            const rowNum = i + 2; // 1-based, +1 for header
            
            try {
                // Skip empty cells
                if (!docUrl || docUrl === '') {
                    skipped++;
                    continue;
                }
                
                // Idempotent: Skip if already migrated (has RichText link)
                if (richText && richText.getLinkUrl()) {
                    console.log(`Row ${rowNum}: Already has RichText link, skipping`);
                    skipped++;
                    continue;
                }
                
                // Extract document ID from URL
                // Pattern: https://docs.google.com/document/d/{DOC_ID}/...
                const match = String(docUrl).match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
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
                
                // Create RichText hyperlink
                const richTextValue = SpreadsheetApp.newRichTextValue()
                    .setText(docTitle)
                    .setLinkUrl(String(docUrl))
                    .build();
                
                // Write to cell
                const cell = sheet.getRange(rowNum, announcementColIndex);
                cell.setRichTextValue(richTextValue);
                
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
        console.log('\nPlease verify links in spreadsheet show document titles.');
        
        if (errors > 0) {
            console.warn('\nWARNING: Some cells failed. Check console log for details.');
        }
        
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('FATAL ERROR during migration:', err.message);
        throw error;
    }
}
