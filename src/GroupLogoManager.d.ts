/**
 * GroupLogoManager - Namespace object with logo management functions
 * 
 * Manages logo storage in Drive and Groups spreadsheet:
 * - Stores logo files in "SCCCC Group Logos" Drive folder
 * - Saves Drive URLs in LogoURL column (persistent, user-manageable)
 * - Optionally displays thumbnails in Logo column (for visual reference)
 */
declare namespace GroupLogoManager {
    /**
     * Get or create the Drive folder for group logos
     */
    function getOrCreateLogoFolder(): GoogleAppsScript.Drive.Folder;
    
    /**
     * Upload logo blob to Drive and return shareable URL
     */
    function uploadLogoToDrive(
        blob: GoogleAppsScript.Base.Blob,
        fileName: string,
        folder: GoogleAppsScript.Drive.Folder
    ): string;
    
    /**
     * Populate logos in Groups tab from template events
     * 
     * Downloads logos from templates, uploads to Drive, stores Drive URLs
     */
    function populateGroupLogos(): {
        success: boolean;
        populated: number;
        skipped: number;
        errors: string[];
    };

    /**
     * Check if group logos need population
     * 
     * Returns true if any group has TEMPLATE but no LogoURL
     */
    function groupLogosNeedPopulation(): boolean;

    /**
     * Auto-populate group logos if missing (self-healing)
     */
    function autoPopulateGroupLogos(): {
        success: boolean;
        populated: number;
        skipped: number;
        errors: string[];
    };
}

export default GroupLogoManager;
