/**
 * Common date utilities type definitions
 */

/**
 * Converts various input types to a Date object
 */
export function convert(
    d: Date | Array<number> | string | number | {year?: number, month?: number, date?: number}
): Date | typeof NaN;

/**
 * Returns the weekday abbreviation (e.g., "Mon", "Tue")
 */
export function weekday(d: Date | string | number): string | typeof NaN;

/**
 * Returns date in MM/DD format
 */
export function MMDD(d: Date | string | number): string | typeof NaN;

/**
 * Returns date in MM/DD/YYYY format
 */
export function MMDDYYYY(d: Date | string | number): string | typeof NaN;

/**
 * Returns time in 24-hour format (e.g., "14:30")
 */
export function T24(d: Date | string | number): string | typeof NaN;

/**
 * Returns time in 12-hour format with AM/PM (e.g., "2:30 PM")
 */
export function T12(d: Date | string | number): string | typeof NaN;

/**
 * Adds specified number of days to a date
 */
export function add(d: Date | string | number, days: number): Date | typeof NaN;

/**
 * Adds specified number of minutes to a date
 */
export function addMinutes(d: Date | string | number, minutes: number): Date | typeof NaN;
