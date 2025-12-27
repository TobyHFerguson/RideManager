/**
 * Returns an array of group names (e.g., ["A", "B", "C", ...]).
 * @returns {string[]} Array of group names.
 */
export function getGroupNames(): string[];

/**
 * Returns an object mapping group names to their specifications.
 * @returns {Record<string, {Template?: string, MIN_LENGTH?: number, [key: string]: any}>} Object of group specs.
 */
declare function getGroupSpecs(): Record<string, {Template?: string, MIN_LENGTH?: number, [key: string]: any}>;

/**
 * Initializes the group cache and returns the group specs.
 * @returns {Record<string, {Template?: string, MIN_LENGTH?: number, [key: string]: any}>} Object of group specs.
 */
declare function initializeGroupCache(): Record<string, {Template?: string, MIN_LENGTH?: number, [key: string]: any}>;

/**
 * Retrieves group data from the sheet and returns group specs.
 * @returns {Record<string, {Template?: string, MIN_LENGTH?: number, [key: string]: any}>} Object of group specs.
 */
declare function getGroupsFromSheet_(): Record<string, {Template?: string, MIN_LENGTH?: number, [key: string]: any}>;

/**
 * Flattens an array of group objects into a mapping from group name to group spec.
 * @param {Array<{Group: string, [key: string]: any}>} groups - Array of group objects.
 * @returns {Record<string, {Template?: string, MIN_LENGTH?: number, [key: string]: any}>} Object of group specs.
 */
declare function flatten_(groups: Array<{Group: string, [key: string]: any}>): Record<string, {Template?: string, MIN_LENGTH?: number, [key: string]: any}>;
