// @ts-check
/// <reference path="./gas-globals.d.ts" />

/**
 * GroupLogoManager - Manages logo storage in Groups tab
 * 
 * Architecture:
 * - Logo image files stored in Google Drive folder "SCCCC Group Logos"
 * - LogoURL column contains Drive file URLs (persistent, user-manageable)
 * - LogoURL hover preview shows logo image (no separate Logo column needed)
 * - One-time population from template events
 * - Self-healing: Automatically populates missing logos
 * - Users can update logos by replacing files in Drive folder
 */

/**
 * Test Drive access and trigger authorization dialog if needed
 * 
 * Run this function first if you get "Access denied: DriveApp" errors.
 * It will prompt you to authorize Drive permissions.
 * 
 * @returns {{success: boolean, message: string}}
 */
function testDriveAccess() {
    try {
        // Try to access Drive
        const folders = DriveApp.getFoldersByName('SCCCC Group Logos');
        const folderCount = folders.hasNext() ? 1 : 0;
        
        return {
            success: true,
            message: `✅ Drive access granted. Found ${folderCount} matching folder(s).`
        };
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        return {
            success: false,
            message: `❌ Drive access failed: ${err.message}. Please authorize Drive permissions.`
        };
    }
}

/**
 * Get or create the Drive folder for group logos
 * 
 * @returns {GoogleAppsScript.Drive.Folder} Drive folder for logos
 */
function getOrCreateLogoFolder() {
    const folderName = 'SCCCC Group Logos';
    
    // Search for existing folder
    const folders = DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) {
        const folder = folders.next();
        console.log(`Using existing folder: ${folder.getId()}`);
        return folder;
    }
    
    // Create new folder
    const folder = DriveApp.createFolder(folderName);
    console.log(`Created new folder: ${folder.getId()}`);
    return folder;
}

/**
 * Upload logo blob to Drive and return shareable URL
 * 
 * @param {GoogleAppsScript.Base.Blob} blob - Image blob to upload
 * @param {string} fileName - Name for the file (e.g., "Thursday.png")
 * @param {GoogleAppsScript.Drive.Folder} folder - Drive folder to store file
 * @returns {string} Shareable Drive URL
 */
function uploadLogoToDrive(blob, fileName, folder) {
    // Check if file already exists
    const existingFiles = folder.getFilesByName(fileName);
    if (existingFiles.hasNext()) {
        const file = existingFiles.next();
        console.log(`  Replacing existing file: ${file.getId()}`);
        // Delete old file and create new one (setContent doesn't work with blobs)
        file.setTrashed(true);
    }
    
    // Create new file
    const file = folder.createFile(blob);
    file.setName(fileName);
    // Note: File inherits folder's sharing permissions - no need to set explicitly
    console.log(`  Created Drive file: ${file.getId()}`);
    return file.getUrl();
}

/**
 * Populate logos in Groups tab from template events
 * 
 * This is a one-time setup operation that:
 * 1. Reads Groups tab to get template URLs
 * 2. Fetches each template event to get logo_url
 * 3. Downloads logo as blob
 * 4. Uploads blob to Drive folder
 * 5. Stores Drive URL in LogoURL column
 * 
 * Can be run multiple times safely (only updates missing logos)
 * Note: LogoURL column provides hover preview - no separate Logo column needed
 * 
 * @param {boolean} [force=false] - If true, repopulate all logos even if LogoURL already exists
 * @returns {{success: boolean, populated: number, skipped: number, errors: string[]}}
 */
function populateGroupLogos(force) {
    console.log('=== Populating Group Logos ===');
    if (force) {
        console.log('⚠️  FORCE MODE: Repopulating all logos');
    }
    
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
        
        // Get or create Drive folder for logos
        const logoFolder = getOrCreateLogoFolder();
        
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
        const logoUrlColIndex = headers.indexOf('LogoURL');
        
        if (logoUrlColIndex === -1) {
            const error = 'LogoURL column not found in Groups tab (required for Drive URLs). Please add it manually.';
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
        
        console.log(`LogoURL column found at column ${logoUrlColIndex + 1}`);
        
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
            const existingLogoUrl = row[logoUrlColIndex] || '';
            const rowNum = i + 2; // 1-based, +1 for header
            
            console.log(`\nProcessing group ${groupName}...`);
            
            // Skip if already has logo URL (unless force mode)
            if (!force && existingLogoUrl && existingLogoUrl !== '') {
                console.log(`  ⏭ Group "${groupName}" already has logo URL, skipping`);
                results.skipped++;
                continue;
            }
            
            if (force && existingLogoUrl) {
                console.log(`  🔄 Force mode: Replacing existing logo URL`);
            }
            
            // Skip if no template URL
            if (!templateUrl) {
                console.log(`  ⚠ No template URL, skipping`);
                results.skipped++;
                continue;
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
                
                // Download logo blob from template URL
                console.log(`  Downloading logo blob...`);
                const response = UrlFetchApp.fetch(logoUrl);
                const logoBlob = response.getBlob();
                
                // Determine file extension from blob or URL
                const mimeType = logoBlob.getContentType();
                const ext = mimeType && mimeType.includes('png') ? 'png' : 'jpg';
                const fileName = `${groupName}.${ext}`;
                
                // Upload to Drive
                console.log(`  Uploading to Drive as ${fileName}...`);
                const driveUrl = uploadLogoToDrive(logoBlob, fileName, logoFolder);
                
                // Store Drive URL in LogoURL column
                const logoUrlCell = sheet.getRange(rowNum, logoUrlColIndex + 1);
                logoUrlCell.setValue(driveUrl);
                console.log(`  ✓ Drive URL stored for ${groupName}`);
                
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
            console.log(`\nFlushing ${results.populated} logo operations...`);
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
 * Returns true if any group is missing a logo URL
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
        const logoUrlColIndex = headers.indexOf('LogoURL');
        
        if (templateColIndex === -1 || logoUrlColIndex === -1) {
            return false;
        }
        
        // Check if any group has a template but no logo URL
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const templateUrl = row[templateColIndex] || '';
            const logoUrl = row[logoUrlColIndex] || '';
            
            if (!templateUrl) {
                continue;
            }
            
            // If has template but no logo URL, needs population
            if (!logoUrl || logoUrl === '') {
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
