/**
 * RWGPSMembersCore - Pure JavaScript business logic for RWGPS club member data processing
 */
declare class RWGPSMembersCore {
    /**
     * Transform RWGPS API member data to spreadsheet format
     * Extracts first_name, last_name, and user ID from user object
     *
     * @param membersData - Raw JSON array from RWGPS API
     * @returns Array of objects with Name and UserID fields
     */
    static transformMembersData(membersData: any[]): Array<{Name: string, UserID: number}>;

    /**
     * Validate that the API response has the expected structure
     * 
     * @param data - Data to validate
     * @returns True if valid
     * @throws Error if data is invalid with descriptive message
     */
    static validateApiResponse(data: any): boolean;

    /**
     * Get the API URL for club members
     * 
     * @param clubId - RWGPS club ID
     * @returns Full API URL
     */
    static getApiUrl(clubId: number): string;

    /**
     * Filter out members with empty names
     * Useful for cleaning up data where both first and last names are missing
     * 
     * @param members - Array of {Name: string, UserID: number} objects
     * @returns Filtered array excluding empty names
     */
    static filterEmptyNames(members: Array<{Name: string, UserID: number}>): Array<{Name: string, UserID: number}>;

    /**
     * Find members whose RWGPS profile is missing a first or last name
     * @param membersData - Raw JSON array from RWGPS API
     * @returns Members needing a profile fix
     */
    static getIncompleteNameMembers(membersData: any[]): Array<{
        UserID: number | null;
        FirstName: string;
        LastName: string;
        Email: string;
    }>;

    /**
     * Build the RWGPS profile URL for a user
     * @param userId - RWGPS user ID
     * @returns Profile URL, or empty string if userId is missing
     */
    static buildProfileUrl(userId: number | null): string;

    /**
     * Find members whose RWGPS profile is missing a first or last name
     *
     * @param membersData - Raw JSON array from RWGPS API
     * @returns Members needing a profile fix
     */
    static getIncompleteNameMembers(membersData: any[]): Array<{UserID: number | null, FirstName: string, LastName: string, Email: string}>;

    /**
     * Build the RWGPS profile URL for a user
     *
     * @param userId - RWGPS user ID
     * @returns Profile URL, or empty string if userId is missing
     */
    static buildProfileUrl(userId: number | null): string;

    /**
     * Look up a member's user ID by name
     * Supports exact and partial name matching (case-insensitive)
     * 
     * @param members - Array of {Name, UserID} objects from sheet
     * @param nameToFind - Name to search for (e.g., "Toby Ferguson")
     * @returns Result object with success, userId, name, or error
     */
    static lookupUserIdByName(
        members: Array<{Name: string, UserID: number}>, 
        nameToFind: string
    ): {success: boolean, userId?: number, name?: string, error?: string};
}

export default RWGPSMembersCore;
