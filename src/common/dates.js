// @ts-check

/**
 * Common date utilities for the application
 * Provides date conversion and formatting functions
 */

/**
 * Converts various input types to a Date object
 * @param {Date | any[] | string | number | {year?: number, month?: number, date?: number}} d - Input to convert
 * @returns {Date | typeof NaN} Date object or NaN if invalid
 */
function convert(d) {
    // Date object: return a new instance
    if (d instanceof Date) {
        return new Date(d);
    }
    
    // Array: interpret as [year, month, day] (month is 0-11)
    if (Array.isArray(d)) {
        return new Date(d[0], d[1], d[2]);
    }
    
    // String: let Date constructor parse it
    if (typeof d === 'string') {
        return new Date(d);
    }
    
    // Object with date properties
    if (typeof d === 'object' && d !== null) {
        // Try standard Date constructor first
        let result = new Date(/** @type {any} */ (d));
        if (result.toString() !== 'Invalid Date') {
            return result;
        }
        
        // Try year/month/date properties (month is 0-11)
        const obj = /** @type {{year?: number, month?: number, date?: number}} */ (d);
        if (obj.year !== undefined && obj.month !== undefined && obj.date !== undefined) {
            result = new Date(obj.year, obj.month, obj.date);
            if (result.toString() !== 'Invalid Date') {
                return result;
            }
        }
    }
    
    // Number: interpret as timestamp (milliseconds since epoch)
    if (typeof d === 'number' && Number.isFinite(d)) {
        return new Date(d);
    }
    
    return NaN;
}

/**
 * Returns the weekday abbreviation (e.g., "Mon", "Tue")
 * @param {Date | string | number} d - Date to format
 * @returns {string | typeof NaN} Weekday abbreviation or NaN if invalid
 */
function weekday(d) {
    const date = convert(d);
    if (date instanceof Date && !isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', { 
            timeZone: 'America/Los_Angeles', 
            weekday: 'short' 
        });
    }
    return NaN;
}

/**
 * Returns date in MM/DD format
 * @param {Date | string | number} d - Date to format
 * @returns {string | typeof NaN} Date string or NaN if invalid
 */
function MMDD(d) {
    const date = convert(d);
    if (date instanceof Date && !isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', { 
            timeZone: 'America/Los_Angeles',
            month: 'numeric', 
            day: 'numeric' 
        });
    }
    return NaN;
}

/**
 * Returns date in MM/DD/YYYY format
 * @param {Date | string | number} d - Date to format
 * @returns {string | typeof NaN} Date string or NaN if invalid
 */
function MMDDYYYY(d) {
    const date = convert(d);
    if (date instanceof Date && !isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', { 
            timeZone: 'America/Los_Angeles',
            year: 'numeric', 
            month: 'numeric', 
            day: 'numeric' 
        });
    }
    return NaN;
}

/**
 * Returns time in 24-hour format (e.g., "14:30")
 * @param {Date | string | number} d - Date to format
 * @returns {string | typeof NaN} Time string or NaN if invalid
 */
function T24(d) {
    const date = convert(d);
    if (date instanceof Date && !isNaN(date.getTime())) {
        return date.toLocaleTimeString('en-US', { 
            timeZone: 'America/Los_Angeles',
            hour: 'numeric', 
            minute: 'numeric', 
            hour12: false 
        });
    }
    return NaN;
}

/**
 * Returns time in 12-hour format with AM/PM (e.g., "2:30 PM")
 * @param {Date | string | number} d - Date to format
 * @returns {string | typeof NaN} Time string or NaN if invalid
 */
function T12(d) {
    const date = convert(d);
    if (date instanceof Date && !isNaN(date.getTime())) {
        return date.toLocaleTimeString('en-US', { 
            timeZone: 'America/Los_Angeles',
            hour: 'numeric', 
            minute: 'numeric', 
            hour12: true 
        });
    }
    return NaN;
}

/**
 * Adds specified number of days to a date
 * @param {Date | string | number} d - Date to modify
 * @param {number} days - Number of days to add (can be negative)
 * @returns {Date | typeof NaN} New date or NaN if invalid
 */
function add(d, days) {
    const date = convert(d);
    if (date instanceof Date && !isNaN(date.getTime())) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }
    return NaN;
}

/**
 * Adds specified number of minutes to a date
 * @param {Date | string | number} d - Date to modify
 * @param {number} minutes - Number of minutes to add (can be negative)
 * @returns {Date | typeof NaN} New date or NaN if invalid
 */
function addMinutes(d, minutes) {
    const date = convert(d);
    if (date instanceof Date && !isNaN(date.getTime())) {
        return new Date(date.getTime() + minutes * 60 * 1000);
    }
    return NaN;
}

// Collect functions into module object following standard pattern
var dates = {
    convert,
    weekday,
    MMDD,
    MMDDYYYY,
    T24,
    T12,
    add,
    addMinutes
};

// Node.js module export
if (typeof module !== 'undefined') {
    module.exports = dates;
}
