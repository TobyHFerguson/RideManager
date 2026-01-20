/**
 * RideManager provides functions to manage ride events, including scheduling, importing,
 * canceling, reinstating, updating, and unscheduling rides.
 * 
 * **Architecture**: RideManager is a thin GAS adapter that delegates business logic to RideManagerCore.
 * - Business logic (route preparation, validation, event data) is in RideManagerCore (pure JS, 100% tested)
 * - GAS API calls (RWGPS via RWGPSClientFactory, Calendar, Spreadsheet) are in this adapter
 * - No rwgps parameter needed - operations use RWGPSClientFactory.create() internally
 * 
 * @see RideManagerCore for testable business logic
 * @see RWGPSClientFactory for RWGPS API access
 */
declare const RideManager: {
    /**
     * Cancels the given rows' rides.
     * @param {Row[]} rows - Array of Row objects to cancel.
     * @param {boolean} sendEmail - Whether to send cancellation email.
     * @param {string} reason - Optional cancellation reason.
     */
    cancelRows(rows: Row[], sendEmail?: boolean, reason?: string): void;

    /**
     * Imports the given rows' routes.
     * @param {Row[]} rows - Array of Row objects to import.
     */
    importRows(rows: Row[]): void;

    /**
     * Reinstates the given rows' rides.
     * @param {Row[]} rows - Array of Row objects to reinstate.
     * @param {boolean} sendEmail - Whether to send reinstatement email.
     * @param {string} reason - Optional reinstatement reason.
     */
    reinstateRows(rows: Row[], sendEmail?: boolean, reason?: string): void;

    /**
     * Schedules the given rows' rides.
     * @param {Row[]} rows - Array of Row objects to schedule.
     */
    scheduleRows(rows: Row[]): void;

    /**
     * Unschedules the given rows' rides and deletes associated calendar events.
     * @param {Row[]} rows - Array of Row objects to unschedule.
     */
    unscheduleRows(rows: Row[]): void;

    /**
     * Updates the given rows' rides.
     * @param {Row[]} rows - Array of Row objects to update.
     */
    updateRows(rows: Row[]): void;
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

