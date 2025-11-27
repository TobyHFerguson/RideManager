/**
 * rowCheck - Validation functions for schedule rows
 * 
 * Type definitions for error and warning check functions.
 * Each function returns a string error/warning message or undefined if valid.
 */

import Row from './Row';

/**
 * RWGPS API wrapper (minimal interface for rowCheck)
 */
interface RWGPS {
    /**
     * Check if a ride leader name is known/valid
     * @param name - Ride leader name
     * @returns True if known
     */
    knownRideLeader(name: string): boolean;
}

/**
 * Validation function type
 * @param row - Row to validate
 * @param rwgps - Optional RWGPS instance for leader validation
 * @returns Error/warning message if invalid, undefined if valid
 */
type ValidationFunction = (row: Row, rwgps?: RWGPS) => string | undefined;

/**
 * Collection of validation functions for schedule rows
 * 
 * Each function checks a specific condition and returns:
 * - undefined if valid
 * - string error/warning message if invalid
 */
interface RowCheck {
    // ===== ERROR CHECKS (blocking operations) =====

    /**
     * Check if ride name follows managed event naming convention
     * Validates against known group names
     */
    unmanagedRide: ValidationFunction;

    /**
     * Check if ride has been scheduled (has RideURL)
     */
    unscheduled: ValidationFunction;

    /**
     * Check if StartDate is present and valid
     */
    noStartDate: ValidationFunction;

    /**
     * Check if StartTime is present and valid
     */
    noStartTime: ValidationFunction;

    /**
     * Check if Group is present and is a known group name
     */
    noGroup: ValidationFunction;

    /**
     * Check if route is inaccessible or already owned by club
     * Fetches route JSON to verify accessibility and ownership
     */
    routeInaccessibleOrOwnedByClub: ValidationFunction;

    /**
     * Check if route URL is valid and accessible
     */
    badRoute: ValidationFunction;

    /**
     * Check if ride is marked as cancelled
     */
    notCancelled: ValidationFunction;

    /**
     * Check if ride is NOT cancelled (inverse of notCancelled)
     */
    cancelled: ValidationFunction;

    /**
     * Check if ride has already been scheduled
     */
    scheduled: ValidationFunction;

    /**
     * Check if route is owned by club (not foreign)
     */
    foreignRoute: ValidationFunction;

    // ===== WARNING CHECKS (user can override) =====

    /**
     * Check if ride has valid ride leaders
     * Highlights ride leader cell if unknown leaders found
     * @param row - Row to check
     * @param rwgps - RWGPS instance for leader validation
     */
    noRideLeader: ValidationFunction;

    /**
     * Check if location is specified (not empty or placeholder)
     */
    noLocation: ValidationFunction;

    /**
     * Check if address is specified (not empty or placeholder)
     */
    noAddress: ValidationFunction;

    /**
     * Check if route elevation/distance are appropriate for group
     * Validates against group specifications (min/max elevation and distance)
     */
    inappropiateGroup: ValidationFunction;
}

/**
 * Default error check functions
 */
declare const errorFuns: ValidationFunction[];

/**
 * Default warning check functions
 */
declare const warningFuns: ValidationFunction[];

/**
 * Evaluate rows against error and warning functions
 * 
 * Adds `errors` and `warnings` arrays to each row object.
 * 
 * @param rows - Array of rows to validate
 * @param rwgps - RWGPS instance for leader validation
 * @param efs - Error functions to apply (default: errorFuns)
 * @param wfs - Warning functions to apply (default: warningFuns)
 * @returns Rows with errors and warnings arrays populated
 * 
 * @example
 * ```javascript
 * const rows = schedule.loadSelected();
 * const validatedRows = evalRows(rows, rwgps);
 * validatedRows.forEach(row => {
 *   if (row.errors.length > 0) {
 *     console.log(`Row ${row.rowNum} errors:`, row.errors);
 *   }
 *   if (row.warnings.length > 0) {
 *     console.log(`Row ${row.rowNum} warnings:`, row.warnings);
 *   }
 * });
 * ```
 */
declare function evalRows(
    rows: Row[],
    rwgps: RWGPS,
    efs?: ValidationFunction[],
    wfs?: ValidationFunction[]
): Row[];

/**
 * rowCheck object with all validation functions
 */
declare const rowCheck: RowCheck;

export default rowCheck;
export { errorFuns, warningFuns, evalRows, ValidationFunction, RWGPS };
