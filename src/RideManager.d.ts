/**
 * RideManager provides functions to manage ride events, including scheduling, importing,
 * canceling, reinstating, updating, and unscheduling rides, as well as updating rider counts.
 */
declare const RideManager: {
    /**
     * Cancels the given rows' rides.
     * @param {Row[]} rows - Array of Row objects to cancel.
     * @param {any} rwgps - RWGPS connector/service.
     * @param {boolean} sendEmail - Whether to send cancellation email.
     * @param {string} reason - Optional cancellation reason.
     */
    cancelRows(rows: Row[], rwgps: any, sendEmail?: boolean, reason?: string): void;

    /**
     * Imports the given rows' routes.
     * @param {Row[]} rows - Array of Row objects to import.
     * @param {any} rwgps - RWGPS connector/service.
     */
    importRows(rows: Row[], rwgps: any): void;

    /**
     * Reinstates the given rows' rides.
     * @param {Row[]} rows - Array of Row objects to reinstate.
     * @param {any} rwgps - RWGPS connector/service.
     * @param {boolean} sendEmail - Whether to send reinstatement email.
     * @param {string} reason - Optional reinstatement reason.
     */
    reinstateRows(rows: Row[], rwgps: any, sendEmail?: boolean, reason?: string): void;

    /**
     * Schedules the given rows' rides.
     * @param {Row[]} rows - Array of Row objects to schedule.
     * @param {any} rwgps - RWGPS connector/service.
     */
    scheduleRows(rows: Row[], rwgps: any): void;

    /**
     * Unschedules the given rows' rides and deletes associated calendar events.
     * @param {Row[]} rows - Array of Row objects to unschedule.
     * @param {any} rwgps - RWGPS connector/service.
     */
    unscheduleRows(rows: Row[], rwgps: any): void;

    /**
     * Updates the rider counts for the given rows using the RWGPS connector.
     * @param {Row[]} rows - Array of Row objects to update.
     * @param {any} rwgps - RWGPS connector/service.
     */
    updateRiderCounts(rows: Row[], rwgps: any): void;

    /**
     * Updates the given rows' rides.
     * @param {Row[]} rows - Array of Row objects to update.
     * @param {any} rwgps - RWGPS connector/service.
     */
    updateRows(rows: Row[], rwgps: any): void;
};

/**
 * Extracts the event ID from a given event URL.
 * @param {string} event_url - The event URL.
 * @returns {string} The extracted event ID.
 */
declare function _extractEventID(event_url: string): string;

/**
 * Gets the Google Calendar ID for a given group name.
 * @param {string} groupName - The group name.
 * @returns {string | undefined} The calendar ID, or undefined if not found.
 */
declare function getCalendarId(groupName: string): string | undefined;

/**
 * Gets the location string for a given row.
 * @param {Row} row - The row object.
 * @returns {string} The location string (latitude,longitude) or empty string.
 */
declare function getLocation(row: Row): string;

