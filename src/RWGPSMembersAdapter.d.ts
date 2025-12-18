/**
 * RWGPSMembersAdapter - GAS adapter for RWGPS club members data
 */

declare class RWGPSMembersAdapter {
    clubId: number;
    sheetName: string;
    spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet;

    /**
     * Creates a new RWGPSMembersAdapter
     * @param clubId - RWGPS club ID (default is SCCCC = 47)
     * @param sheetName - Name of the sheet to manage (default 'RWGPS Members')
     */
    constructor(clubId?: number, sheetName?: string);

    /**
     * Fetch and update club members data
     * Main entry point - fetches from API, transforms, and saves to sheet
     * Creates sheet if it doesn't exist
     * 
     * @returns Result object with success status and counts
     * @throws Error if API fetch or data processing fails
     */
    updateMembers(): {
        success: boolean;
        totalMembers: number;
        validMembers: number;
        filteredOut: number;
    };

    /**
     * Fetch data from RWGPS API
     * @private
     * @param url - API URL
     * @returns Raw JSON array from API
     * @throws Error if fetch fails or returns invalid data
     */
    private _fetchFromApi(url: string): any[];

    /**
     * Write members data to spreadsheet using Fiddler
     * Creates sheet if it doesn't exist
     * @private
     * @param members - Array of {Name: string} objects
     */
    private _writeToSheet(members: Array<{Name: string}>): void;

    /**
     * Get the sheet object (for testing/inspection)
     * @returns Sheet object or null if doesn't exist
     */
    getSheet(): GoogleAppsScript.Spreadsheet.Sheet | null;

    /**
     * Delete the members sheet (for cleanup)
     * @returns True if sheet was deleted, false if it didn't exist
     */
    deleteSheet(): boolean;
}

export default RWGPSMembersAdapter;
