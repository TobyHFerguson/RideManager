// @ts-check
/// <reference path="./gas-globals.d.ts" />

/**
 * GroupLogoManager - Manages logo storage in Groups tab
 * 
 * Architecture:
 * - Logos stored as image blobs in "Logo" column of Groups spreadsheet
 * - One-time population from template events
 * - Self-healing: Automatically populates missing logos
 */

/**
 * Populate logos in Groups tab from template events
 * 
 * This is a one-time setup operation that:
 * 1. Reads Groups tab to get template URLs
 * 2. Fetches each template event to get logo_url
 * 3. Downloads logo as blob
 * 4. Inserts blob into Logo column
 * 
 * Can be run multiple times safely (only updates missing logos)
 * 
 * @returns {{success: boolean, populated: number, skipped: number, errors: string[]}}
 */
function populateGroupLogos() {
    console.log('=== Populating Group Logos ===');
    
    /** @type {{success: boolean, populated: number, skipped: number, errors: string[]}} */
    const results = {
        success: true,
        populated: 0,
        skipped: 0,
        errors: []
    };
    
    try {
        // Get Groups sheet directly
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Groups');
        if (!sheet) {
            const error = 'Groups sheet not found';
            console.error(error);
            results.success = false;
            results.errors.push(error);
            return results;
        }
        
        // Get all data
        const lastRow = sheet.getLastRow();
        if (lastRow < 2) {
            console.log('No data rows in Groups sheet');
            return results;
        }
        
        const lastCol = sheet.getLastColumn();
        const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
        const data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
        
        console.log(`Found ${data.length} groups`);
        
        // Find column indices
        const groupColIndex = headers.indexOf('Group');
        const templateColIndex = headers.indexOf('TEMPLATE');
        const logoColIndex = headers.indexOf('Logo');
        
        if (logoColIndex === -1) {
            const error = 'Logo column not found in Groups tab. Please add it manually.';
            console.error(error);
            results.success = false;
            results.errors.push(error);
            return results;
        }
        
        if (groupColIndex === -1 || templateColIndex === -1) {
            const error = 'Required columns (Group, TEMPLATE) not found in Groups tab';
            console.error(error);
            results.success = false;
            results.errors.push(error);
            return results;
        }
        
        console.log(`Logo column found at column ${logoColIndex + 1}`);
        
        // Get RWGPSClient
        const scriptProps = PropertiesService.getScriptProperties();
        const credentialManager = new CredentialManager(scriptProps);
        const client = new RWGPSClient({
            apiKey: credentialManager.getApiKey(),
            authToken: credentialManager.getAuthToken(),
            username: credentialManager.getUsername(),
            password: credentialManager.getPassword()
        });
        
        // Process each group
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const groupName = row[groupColIndex] || '';
            const templateUrl = row[templateColIndex] || '';
            
            console.log(`\nProcessing group ${groupName}...`);
            
            // Skip if no template URL
            if (!templateUrl) {
                console.log(`  ⚠ No template URL, skipping`);
                results.skipped++;
                continue;
            }
            
            // Check if logo already exists (check for image in cell)
            const sheetRow = i + 2; // +1 for 0-based array, +1 for header row
            const logoCell = sheet.getRange(sheetRow, logoColIndex + 1); // +1 for 1-based columns
            
            // Check if cell already has an image
            try {
                const images = logoCell.getImages();
                if (images && images.length > 0) {
                    console.log(`  ✓ Logo already exists, skipping`);
                    results.skipped++;
                    continue;
                }
            } catch (e) {
                // getImages() might fail if no images - that's fine, continue
            }
            
            try {
                // Fetch template event
                console.log(`  Fetching template: ${templateUrl}`);
                const eventResult = client.getEvent(templateUrl);
                
                if (!eventResult.success) {
                    const errorMsg = `Failed to fetch template: ${eventResult.error}`;
                    console.error(`  ✗ ${errorMsg}`);
                    results.errors.push(`${groupName}: ${errorMsg}`);
                    continue;
                }
                
                const event = eventResult.event;
                const logoUrl = event.logo_url;
                
                if (!logoUrl) {
                    console.log(`  ⚠ Template has no logo_url, skipping`);
                    results.skipped++;
                    continue;
                }
                
                console.log(`  Found logo: ${logoUrl}`);
                
                // Insert image directly into cell using URL
                console.log(`  Inserting image into cell...`);
                
                const cellImage = SpreadsheetApp.newCellImage()
                    .setSourceUrl(logoUrl)
                    .build();
                
                logoCell.setValue(cellImage);
                
                console.log(`  ✓ Logo inserted for ${groupName}`);
                results.populated++;
                
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                const errorMsg = `Failed to populate logo: ${err.message}`;
                console.error(`  ✗ ${errorMsg}`);
                results.errors.push(`${groupName}: ${errorMsg}`);
            }
        }
        
        // Flush to ensure all writes are committed
        if (results.populated > 0) {
            console.log(`\nFlushing ${results.populated} image insertions...`);
            SpreadsheetApp.flush();
            console.log('✓ Logos saved to Groups tab');
        }
        
        // Log summary
        console.log('\n=== Summary ===');
        console.log(`Populated: ${results.populated}`);
        console.log(`Skipped: ${results.skipped}`);
        console.log(`Errors: ${results.errors.length}`);
        
        if (results.errors.length > 0) {
            console.log('\nErrors:');
            results.errors.forEach((err, i) => {
                console.log(`  ${i + 1}. ${err}`);
            });
        }
        
        return results;
        
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('FATAL ERROR:', err.message);
        results.success = false;
        results.errors.push(err.message);
        return results;
    }
}

/**
 * Check if group logos need population (self-healing)
 * 
 * Returns true if any group is missing a logo
 * 
 * @returns {boolean} True if logos need population
 */
function groupLogosNeedPopulation() {
    try {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Groups');
        if (!sheet) {
            return false;
        }
        
        const lastRow = sheet.getLastRow();
        if (lastRow < 2) {
            return false;
        }
        
        const lastCol = sheet.getLastColumn();
        const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
        const data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
        
        const templateColIndex = headers.indexOf('TEMPLATE');
        const logoColIndex = headers.indexOf('Logo');
        
        if (templateColIndex === -1 || logoColIndex === -1) {
            return false;
        }
        
        // Check if any group has a template but no logo image
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const templateUrl = row[templateColIndex] || '';
            
            if (!templateUrl) {
                continue;
            }
            
            // Check if logo cell has an image
            const sheetRow = i + 2; // +1 for 0-based, +1 for header
            const logoCell = sheet.getRange(sheetRow, logoColIndex + 1);
            
            try {
                const images = logoCell.getImages();
                if (!images || images.length === 0) {
                    return true; // Found a group with template but no logo
                }
            } catch (e) {
                // If getImages() fails, assume no image exists
                return true;
            }
        }
        
        return false;
        
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('Error checking if logos need population:', err.message);
        return false;
    }
}

/**
 * Auto-populate group logos if missing (self-healing)
 * 
 * Called automatically by triggers to ensure logos are always populated
 * Safe to call multiple times - only populates missing logos
 */
function autoPopulateGroupLogos() {
    if (groupLogosNeedPopulation()) {
        console.log('Group logos missing - auto-populating...');
        const result = populateGroupLogos();
        
        if (result.populated > 0) {
            UserLogger.log('INFO', `Auto-populated ${result.populated} group logos`, {
                populated: result.populated,
                skipped: result.skipped,
                errors: result.errors.length
            });
        }
        
        return result;
    } else {
        console.log('All group logos present - no action needed');
        return { success: true, populated: 0, skipped: 0, errors: [] };
    }
}

// Export module for GAS global scope
var GroupLogoManager = {
    populateGroupLogos: populateGroupLogos,
    groupLogosNeedPopulation: groupLogosNeedPopulation,
    autoPopulateGroupLogos: autoPopulateGroupLogos
};

// Export for Node.js/testing
if (typeof module !== 'undefined') {
    module.exports = GroupLogoManager;
}
