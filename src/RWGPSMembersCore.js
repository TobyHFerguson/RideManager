/**
 * RWGPSMembersCore - Pure JavaScript business logic for RWGPS club member data processing
 * 
 * This module handles transformation and validation of club member data from RWGPS API.
 * It has NO GAS dependencies and can be fully tested in Jest.
 * 
 * The RWGPS API returns an array of member objects with nested user data.
 * This module extracts first_name and last_name from the user object and formats them.
 */

class RWGPSMembersCore {
    /**
     * Transform RWGPS API member data to spreadsheet format
     * Extracts first_name and last_name from user object, concatenates with space
     * 
     * @param {any[]} membersData - Raw JSON array from RWGPS API
     * @returns {Array<{Name: string}>} Array of objects with Name field: [{Name: "First Last"}, ...]
     * 
     * @example
     * const input = [{
     *   user: { first_name: "John", last_name: "Doe" }
     * }];
     * const output = transformMembersData(input);
     * // output: [{Name: "John Doe"}]
     */
    static transformMembersData(membersData) {
        if (!Array.isArray(membersData)) {
            throw new Error('Members data must be an array');
        }

        return membersData.map((/** @type {any} */ member) => {
            // Validate member structure
            if (!member || typeof member !== 'object') {
                throw new Error('Invalid member object');
            }

            if (!member.user || typeof member.user !== 'object') {
                throw new Error('Member missing user object');
            }

            const { first_name, last_name } = member.user;

            // Handle missing names - use empty string if not present
            const firstName = first_name || '';
            const lastName = last_name || '';

            // Concatenate with space, trim to handle cases where one name is missing
            const fullName = `${firstName} ${lastName}`.trim();

            return { Name: fullName };
        }).sort((a, b) => a.Name.localeCompare(b.Name));
    }

    /**
     * Validate that the API response has the expected structure
     * 
     * @param {*} data - Data to validate
     * @returns {boolean} True if valid
     * @throws {Error} If data is invalid with descriptive message
     */
    static validateApiResponse(data) {
        if (data === null || data === undefined) {
            throw new Error('API response is null or undefined');
        }

        if (!Array.isArray(data)) {
            throw new Error('API response must be an array');
        }

        // Empty array is valid (club with no members)
        if (data.length === 0) {
            return true;
        }

        // Check first element has expected structure (sample validation)
        const firstMember = data[0];
        if (!firstMember || typeof firstMember !== 'object') {
            throw new Error('API response contains invalid member data');
        }

        if (!firstMember.user || typeof firstMember.user !== 'object') {
            throw new Error('API response member missing user object');
        }

        return true;
    }

    /**
     * Filter out members with empty names
     * Useful for cleaning up data where both first and last names are missing
     * 
     * @param {Array<{Name: string}>} members - Array of {Name: string} objects
     * @returns {Array<{Name: string}>} Filtered array excluding empty names
     */
    static filterEmptyNames(members) {
        if (!Array.isArray(members)) {
            throw new Error('Members must be an array');
        }

        return members.filter((/** @type {any} */ member) => {
            if (!member || typeof member !== 'object') {
                return false;
            }

            const name = member.Name;
            return name && typeof name === 'string' && name.trim().length > 0;
        });
    }
}

// Node.js/Jest export
if (typeof module !== 'undefined') {
    module.exports = RWGPSMembersCore;
}
