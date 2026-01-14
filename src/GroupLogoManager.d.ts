/**
 * GroupLogoManager - Namespace object with logo management functions
 */
declare namespace GroupLogoManager {
    /**
     * Populate logos in Groups tab from template events
     */
    function populateGroupLogos(): {
        success: boolean;
        populated: number;
        skipped: number;
        errors: string[];
    };

    /**
     * Check if group logos need population
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
