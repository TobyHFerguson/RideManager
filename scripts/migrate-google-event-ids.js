// @ts-check
/**
 * migrate-google-event-ids.js
 * 
 * One-time migration utility: Convert plain text Google Event IDs to RichText hyperlinks
 * 
 * This script converts existing Google Calendar Event IDs in the "Google Event ID" column
 * from plain text to RichText hyperlinks that link to the respective calendar in agenda view.
 * 
 * USAGE:
 * ======
 * 1. Deploy this script to GAS (via npm run dev:push)
 * 2. Open Script Editor in GAS
 * 3. Run `migrateGoogleEventIds()` function
 * 4. Verify all Google Event ID links work in spreadsheet
 * 5. Deploy updated ScheduleAdapter/RowCore code
 * 
 * SAFETY:
 * =======
 * - Non-destructive: Only converts non-empty Event IDs, leaves empty cells unchanged
 * - Idempotent: Can be run multiple times safely (checks for existing RichText links)
 * - Logging: Detailed console output for debugging
 * - Error handling: Continues processing if individual cells fail
 * 
 * @module migrate-google-event-ids
 */

/* istanbul ignore file - GAS-only migration script */

/**
 * Main migration function: Convert plain text Google Event IDs to RichText hyperlinks
 * 
 * Processes the 'Consolidated Rides' sheet and converts the "Google Event ID" column
 * from plain text to RichText hyperlinks linking to the calendar in agenda view.
 * 
 * @global
 * @function
 * @returns {void}
 */
function migrateGoogleEventIds() {
    console.log('=== Starting Google Event ID → RichText Migration ===');
    
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
        
        // Find required columns
        const eventIdColIndex = headers.indexOf('GoogleEventId') + 1; // 1-based
        const groupColIndex = headers.indexOf('Group') + 1;
        const dateColIndex = headers.indexOf('Date Time') + 1;
        
        if (eventIdColIndex === 0) {
            throw new Error('Could not find "GoogleEventId" column in headers');
        }
        if (groupColIndex === 0) {
            throw new Error('Could not find "Group" column in headers');
        }
        if (dateColIndex === 0) {
            throw new Error('Could not find "Date Time" column in headers');
        }
        
        console.log(`Found GoogleEventId column at index ${eventIdColIndex}`);
        console.log(`Found Group column at index ${groupColIndex}`);
        console.log(`Found Date Time column at index ${dateColIndex}`);
        console.log(`Processing ${lastRow - 1} data rows...`);
        
        // Get all data needed for conversion
        const eventIdRange = sheet.getRange(2, eventIdColIndex, lastRow - 1, 1);
        const groupRange = sheet.getRange(2, groupColIndex, lastRow - 1, 1);
        const dateRange = sheet.getRange(2, dateColIndex, lastRow - 1, 1);
        
        const eventIds = eventIdRange.getValues();
        const richTextValues = eventIdRange.getRichTextValues();
        const groups = groupRange.getValues();
        const dates = dateRange.getValues();
        
        // Get group specs to map groups to calendar IDs
        const groupSpecs = getGroupSpecs();
        
        let converted = 0;
        let skipped = 0;
        let errors = 0;
        
        // Process each row
        for (let i = 0; i < eventIds.length; i++) {
            const eventId = eventIds[i][0];
            const group = groups[i][0];
            const date = dates[i][0];
            const richText = richTextValues[i][0];
            const rowNum = i + 2; // 1-based, +1 for header
            
            try {
                // Skip empty cells
                if (!eventId || eventId === '') {
                    skipped++;
                    continue;
                }
                
                // Skip if already has a hyperlink
                if (richText && richText.getLinkUrl()) {
                    console.log(`Row ${rowNum}: Already has RichText link, skipping`);
                    skipped++;
                    continue;
                }
                
                // Skip if missing group or date
                if (!group || group === '') {
                    console.warn(`Row ${rowNum}: Missing group, skipping`);
                    skipped++;
                    continue;
                }
                if (!date || !(date instanceof Date)) {
                    console.warn(`Row ${rowNum}: Invalid date, skipping`);
                    skipped++;
                    continue;
                }
                
                // Get calendar ID from group spec
                const calendarId = groupSpecs[group.toUpperCase()]?.GoogleCalendarId;
                if (!calendarId) {
                    console.warn(`Row ${rowNum}: No calendar ID found for group "${group}", skipping`);
                    skipped++;
                    continue;
                }
                
                // Build calendar URL using GoogleEventCore logic
                const calendarUrl = buildCalendarUrl(calendarId, date);
                
                // Create RichText hyperlink
                const richTextValue = SpreadsheetApp.newRichTextValue()
                    .setText(String(eventId))
                    .setLinkUrl(calendarUrl)
                    .build();
                
                // Write to cell
                const cell = sheet.getRange(rowNum, eventIdColIndex);
                cell.setRichTextValue(richTextValue);
                
                converted++;
                if (converted % 10 === 0) {
                    console.log(`  Converted ${converted} rows...`);
                }
                
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                console.error(`Row ${rowNum}: Error converting event ID "${eventId}": ${err.message}`);
                errors++;
            }
        }
        
        // Summary
        console.log('\n=== Migration Complete ===');
        console.log(`Converted: ${converted} event IDs`);
        console.log(`Skipped: ${skipped} cells (empty or already linked)`);
        console.log(`Errors: ${errors} cells`);
        console.log('\nPlease verify links work by clicking a few Google Event IDs in the spreadsheet.');
        
        if (errors > 0) {
            console.warn('\nWARNING: Some cells failed to convert. Check console log for details.');
        }
        
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('FATAL ERROR during migration:', err.message);
        throw error;
    }
}

/**
 * Build a Google Calendar embed URL for a specific date
 * (Inline copy of GoogleEventCore.buildCalendarUrl for GAS environment)
 * 
 * @param {string} calendarId - The calendar ID
 * @param {Date} rideDate - The date of the ride
 * @returns {string} Google Calendar embed URL in agenda mode
 */
function buildCalendarUrl(calendarId, rideDate) {
    // Format date as YYYYMMDD
    const year = rideDate.getFullYear();
    const month = String(rideDate.getMonth() + 1).padStart(2, '0');
    const day = String(rideDate.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    // Build URL with query parameters (manual encoding for GAS compatibility)
    // URLSearchParams not available in Google Apps Script
    const params = [
        `src=${encodeURIComponent(calendarId)}`,
        'mode=AGENDA',
        `ctz=${encodeURIComponent('America/Los_Angeles')}`,
        `dates=${dateStr}%2F${dateStr}` // Manual encoding of / as %2F for consistency
    ];
    
    return `https://calendar.google.com/calendar/embed?${params.join('&')}`;
}
