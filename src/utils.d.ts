/**
 * utils - Utility functions for HTML generation and debugging
 * 
 * Type definitions for helper utilities used across the application.
 */

/**
 * Zip multiple arrays together, filling gaps with initial value
 * 
 * @param init - Initial/default value to use for missing elements
 * @param arrays - Variable number of arrays to zip together
 * @returns Array of arrays where each inner array contains elements from same position
 * 
 * @example
 * ```javascript
 * const result = zip("", ["a", "b"], ["1", "2", "3"]);
 * // Returns: [["a", "1"], ["b", "2"], ["", "3"]]
 * ```
 */
declare function zip(init: any, ...arrays: any[][]): any[][];

/**
 * Create HTML table columns from values
 * 
 * @param type - Column type: 'h' for <th> (header) or 'd' for <td> (data)
 * @param values - Variable number of values, one per column
 * @returns HTML string with table columns
 * 
 * @example
 * ```javascript
 * const html = tableColumns('d', 'Cell 1', 'Cell 2', 'Cell 3');
 * // Returns: "<td>Cell 1</td><td>Cell 2</td><td>Cell 3</td>"
 * ```
 */
declare function tableColumns(type: 'h' | 'd', ...values: any[]): string;

/**
 * Log duration between start and end times
 * 
 * @param msg - Message to log
 * @param start - Start time
 * @param end - End time (defaults to now)
 * 
 * @example
 * ```javascript
 * const start = new Date();
 * // ... do work
 * duration('Operation', start); // Logs: "Operation duration: 2.5S"
 * ```
 */
declare function duration(msg: string, start: Date, end?: Date): void;

/**
 * Print error with caller function name
 * Extracts calling function from stack trace for better debugging
 * 
 * @param args - Arguments to log
 * 
 * @example
 * ```javascript
 * function myFunction() {
 *   printCallerError('Something went wrong', { detail: 'error' });
 *   // Logs: "myFunction Something went wrong { detail: 'error' }"
 * }
 * ```
 */
declare function printCallerError(...args: any[]): void;

/**
 * Get route data from RideWithGPS
 * 
 * @param url - Route URL (must match https://ridewithgps.com/routes/DIGITS pattern)
 * @param readThrough - If true, bypass cache and fetch fresh data (default: false)
 * @returns Route object from RWGPS API
 * @throws Error if URL is invalid or route cannot be accessed
 */
declare function getRoute(url: string, readThrough?: boolean): any;

export { zip, tableColumns, duration, printCallerError, getRoute };
