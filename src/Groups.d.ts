/**
 * Groups - Manage group specifications
 * 
 * Type definitions for group name and specification retrieval.
 */

/**
 * Group specification type
 */
export type GroupSpec = {
    Template?: string;
    MIN_LENGTH?: number;
    LogoURL?: string;
    GoogleCalendarId?: string;
    [key: string]: any;
};

/**
 * Groups class with static methods for group management
 */
declare class Groups {
    /**
     * Returns an array of group names (e.g., ["A", "B", "C", ...]).
     * @returns Array of group names.
     */
    static getGroupNames(): string[];

    /**
     * Returns an object mapping group names to their specifications.
     * @returns Object of group specs keyed by group name.
     */
    static getGroupSpecs(): Record<string, GroupSpec>;

    /**
     * Initializes the group cache and returns the group specs.
     * @returns Object of group specs keyed by group name.
     */
    static initializeGroupCache(): Record<string, GroupSpec>;
}

// Global function aliases for backward compatibility (declared in gas-globals.d.ts)
export function getGroupNames(): string[];
export function getGroupSpecs(): Record<string, GroupSpec>;

export default Groups;
