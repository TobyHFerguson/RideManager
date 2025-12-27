/**
 * RWGPSMembersCore - Pure JavaScript business logic for RWGPS club member data processing
 */

declare namespace RWGPSMembersCore {
    /**
     * Transform RWGPS API member data to spreadsheet format
     * Extracts first_name and last_name from user object, concatenates with space
     * 
     * @param membersData - Raw JSON array from RWGPS API
     * @returns Array of objects with Name field: [{Name: "First Last"}, ...]
     */
    function transformMembersData(membersData: any[]): Array<{Name: string}>;

    /**
     * Validate that the API response has the expected structure
     * 
     * @param data - Data to validate
     * @returns True if valid
     * @throws Error if data is invalid with descriptive message
     */
    function validateApiResponse(data: any): boolean;

    /**
     * Get the API URL for club members
     * 
     * @param clubId - RWGPS club ID
     * @returns Full API URL
     */
    function getApiUrl(clubId: number): string;

    /**
     * Filter out members with empty names
     * Useful for cleaning up data where both first and last names are missing
     * 
     * @param members - Array of {Name: string} objects
     * @returns Filtered array excluding empty names
     */
    function filterEmptyNames(members: Array<{Name: string}>): Array<{Name: string}>;
}

export default RWGPSMembersCore;
