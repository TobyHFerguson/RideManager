// @ts-check
/// <reference path="./gas-globals.d.ts" />

/**
 * RWGPSMembersAdapter - GAS adapter for RWGPS club members data
 * 
 * This is a thin GAS-specific wrapper that handles:
 * - Fetching member data from RWGPS API via UrlFetchApp
 * - Sheet creation and management using Fiddler (bmPreFiddler)
 * - Writing member data to spreadsheet
 * 
 * All business logic (data transformation, validation) is in RWGPSMembersCore (pure JavaScript).
 * This layer only handles GAS APIs.
 * 
 * ARCHITECTURE PATTERN: Fetch → Transform → Write
 * ==================================================
 * 1. Fetch raw JSON from RWGPS API
 * 2. Pass to RWGPSMembersCore for transformation
 * 3. Write transformed data using Fiddler
 */

// Node.js compatibility
// @ts-ignore - Node.js compatibility check for Jest tests
if (typeof require !== 'undefined') {
    // RWGPSMembersCore is globally available via gas-globals.d.ts
}

class RWGPSMembersAdapter {
    /**
     * Creates a new RWGPSMembersAdapter
     * @param {import('./Externals').RWGPS} rwgps Object from RWGPSLib
     * @param {string} [sheetName='RWGPS Members'] - Name of the sheet to manage
         */
        constructor(rwgps, sheetName = 'RWGPS Members') {
            if (!rwgps) {
                throw new Error('RWGPSMembersAdapter requires a valid RWGPS instance');
            }
            this.rwgps = rwgps;
            this.sheetName = sheetName;
            this.spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        }

        /**
         * Fetch and update club members data
         * Main entry point - fetches from API, transforms, and saves to sheet
         * Creates sheet if it doesn't exist
         * 
         * @returns {{success: boolean, addedCount: number, removedCount: number, errorCount: number, totalMembers: number}} Result object with success status and counts
         * @throws {Error} If API fetch or data processing fails
         */
        updateMembers() {
            try {
                // Fetch raw data from RWGPS API (GAS operation)
                // @ts-expect-error - get_club_members is defined in RWGPSLib
                const rawData = this.rwgps.get_club_members();
                
                // Validate API response (Core logic)
                RWGPSMembersCore.validateApiResponse(rawData);
                
                // Transform data (Core logic)
                const members = RWGPSMembersCore.transformMembersData(rawData);
                
                // Filter out empty names (Core logic)
                const validMembers = RWGPSMembersCore.filterEmptyNames(members);
                
                // Write to spreadsheet (GAS operation)
                this._writeToSheet(validMembers);
                
                return {
                    success: true,
                    totalMembers: rawData.length,
                    validMembers: validMembers.length,
                    filteredOut: rawData.length - validMembers.length
                };
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                console.error('RWGPSMembersAdapter.updateMembers error:', err);
                throw new Error(`Failed to update RWGPS members: ${err.message}`);
            }
        }

        /**
         * Fetch data from RWGPS API
         * @private
         * @param {string} url - API URL
         * @returns {Array<Object>} Raw JSON array from API
         * @throws {Error} If fetch fails or returns invalid data
         */
        _fetchFromApi(url) {
            try {
                const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
                const responseCode = response.getResponseCode();
                
                if (responseCode !== 200) {
                    throw new Error(`API returned status code ${responseCode}`);
                }
                
                const contentText = response.getContentText();
                const data = JSON.parse(contentText);
                
                return data;
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                if (err.message.includes('API returned status code')) {
                    throw err;
                }
                throw new Error(`Failed to fetch from RWGPS API: ${err.message}`);
            }
        }

        /**
         * Write members data to spreadsheet using Fiddler
         * Creates sheet if it doesn't exist
         * @private
         * @param {Array<Object>} members - Array of {Name: string} objects
         */
        _writeToSheet(members) {
            // Get or create Fiddler instance
            const fiddler = bmPreFiddler.PreFiddler().getFiddler({
                sheetName: this.sheetName,
                createIfMissing: true  // Create sheet if it doesn't exist
            });
            
            // Write data using Fiddler
            // setData() expects array of objects matching column headers
            // dump() writes to spreadsheet and returns the fiddler for chaining
            fiddler.setData(members).dumpValues();
            
            console.log(`RWGPSMembersAdapter: Wrote ${members.length} members to sheet "${this.sheetName}"`);
        }

        /**
         * Get the sheet object (for testing/inspection)
         * @returns {GoogleAppsScript.Spreadsheet.Sheet|null} Sheet object or null if doesn't exist
         */
        getSheet() {
            return this.spreadsheet.getSheetByName(this.sheetName);
        }

        /**
         * Look up user ID by name from the members sheet
         * Used for organizer lookup when scheduling events
         * 
         * @param {string} organizerName - Name to search for
         * @returns {{success: boolean, userId?: number, name?: string, error?: string}} Result with userId if found
         */
        lookupUserIdByName(organizerName) {
            try {
                // Get Fiddler instance
                const fiddler = bmPreFiddler.PreFiddler().getFiddler({
                    sheetName: this.sheetName,
                    createIfMissing: false
                });

                // Read data from sheet
                const members = fiddler.getData();

                // Use Core logic for lookup
                return RWGPSMembersCore.lookupUserIdByName(members, organizerName);

            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                return {
                    success: false,
                    error: `Failed to lookup organizer: ${err.message}`
                };
            }
        }

        /**
         * Delete the members sheet (for cleanup)
         * @returns {boolean} True if sheet was deleted, false if it didn't exist
         */
        deleteSheet() {
            const sheet = this.getSheet();
            if (sheet) {
                this.spreadsheet.deleteSheet(sheet);
                console.log(`RWGPSMembersAdapter: Deleted sheet "${this.sheetName}"`);
                return true;
            }
            return false;
        }
}

// Node.js/Jest export
if (typeof module !== 'undefined') {
    module.exports = RWGPSMembersAdapter;
}
