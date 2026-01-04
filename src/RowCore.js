// @ts-check

if (typeof require !== 'undefined') {
    var HyperlinkUtils = require('./HyperlinkUtils.js');
}

/**
 * RowCore - Pure JavaScript domain model for a schedule row
 * 
 * This is a pure domain model with NO knowledge of:
 * - Spreadsheet structure or column names (no getGlobals() calls)
 * - GAS APIs (no SpreadsheetApp, no PropertiesService)
 * - Persistence mechanisms (ScheduleAdapter handles that)
 * 
 * Properties use clean camelCase names (rideName, not 'Ride Name').
 * All business logic is testable with plain JavaScript objects.
 * 
 * ARCHITECTURE: Hexagonal/Ports & Adapters Pattern
 * - RowCore = Pure domain (this file)
 * - ScheduleAdapter = Anti-corruption layer (maps spreadsheet ↔ domain)
 */

var RowCore = (function() {
    'use strict';

    /**
     * @typedef {Object} RowCoreParams
     * @property {Date} startDate - Start date/time of the ride
     * @property {number} [duration] - Duration in hours (for calculating end time)
     * @property {number} [defaultDuration] - Default duration if not specified
     * @property {string} group - Ride group (e.g., "Sat A", "Sun B")
     * @property {string} routeCell - Route hyperlink formula or text
     * @property {string} rideCell - Ride hyperlink formula or text
     * @property {string} rideLeaders - Comma-separated leader names
     * @property {string} googleEventId - Google Calendar Event ID
     * @property {string} location - Meeting location name
     * @property {string} address - Full address of meeting location
     * @property {string} [announcement] - Announcement document URL
     * @property {Date} [sendAt] - Scheduled send date/time
     * @property {string} [status] - Announcement status
     * @property {number} [attempts] - Number of send attempts
     * @property {string} [lastError] - Last error message
     * @property {Date} [lastAttemptAt] - Timestamp of last send attempt
     * @property {number} rowNum - Spreadsheet row number (1-based)
     * @property {Function} [onDirty] - Optional callback when row becomes dirty (called with this RowCore)
     */

    class RowCore {
        /**
         * Create a RowCore from plain domain data
         * @param {RowCoreParams} params - Domain properties (camelCase)
         */
        constructor({
            startDate,
            duration,
            defaultDuration,
            group,
            routeCell,
            rideCell,
            rideLeaders,
            googleEventId,
            location,
            address,
            announcement,
            sendAt,
            status,
            attempts,
            lastError,
            lastAttemptAt,
            rowNum,
            onDirty
        }) {
            // Core ride properties
            this.startDate = startDate;
            this.duration = duration;
            this.defaultDuration = defaultDuration;
            this.group = group;
            this.routeCell = routeCell || '';
            this.rideCell = rideCell || '';
            this.rideLeaders = rideLeaders || '';
            this.googleEventId = googleEventId || '';
            this.location = location || '';
            this.address = address || '';
            
            // Announcement properties
            this.announcement = announcement || '';
            this.sendAt = sendAt;
            this.status = status || '';
            this.attempts = attempts || 0;
            this.lastError = lastError || '';
            this.lastAttemptAt = lastAttemptAt;
            
            // Metadata
            this.rowNum = rowNum;
            
            // Track dirty fields for persistence
            this._dirtyFields = new Set();
            
            // Optional callback to notify when row becomes dirty
            this._onDirty = onDirty;
        }

        // ===== COMPUTED PROPERTIES (GETTERS) =====

        /**
         * Start time (alias for startDate)
         * @returns {Date}
         */
        get startTime() {
            return this.startDate;
        }

        /**
         * Calculate end time based on start time and duration
         * @returns {Date}
         */
        get endTime() {
            const durationHours = this.duration || this.defaultDuration || 0;
            return new Date(this.startTime.getTime() + durationHours * 60 * 60 * 1000);
        }

        /**
         * Extract route name from hyperlink formula or return text
         * @returns {string}
         */
        get routeName() {
            const { name } = HyperlinkUtils.parseHyperlinkFormula(this.routeCell);
            return name;
        }

        /**
         * Extract route URL from hyperlink formula
         * @returns {string}
         */
        get routeURL() {
            const { url } = HyperlinkUtils.parseHyperlinkFormula(this.routeCell);
            return url;
        }

        /**
         * Parse ride leaders into array
         * @returns {string[]}
         */
        get leaders() {
            return this.rideLeaders ? this.rideLeaders.split(',').map(rl => rl.trim()).filter(rl => rl) : [];
        }

        /**
         * Extract ride name from hyperlink formula or return text
         * @returns {string}
         */
        get rideName() {
            const { name } = HyperlinkUtils.parseHyperlinkFormula(this.rideCell);
            return name;
        }

        /**
         * Extract ride URL from hyperlink formula
         * @returns {string}
         */
        get rideURL() {
            const { url } = HyperlinkUtils.parseHyperlinkFormula(this.rideCell);
            return url;
        }

        // ===== BUSINESS LOGIC METHODS =====

        /**
         * Check if the ride is planned
         * A ride is planned if it has startDate, group, and routeURL
         * @returns {boolean}
         */
        isPlanned() {
            return !!(this.startDate && this.group && this.routeURL);
        }

        /**
         * Check if the ride is scheduled
         * A ride is scheduled if it has a rideName
         * @returns {boolean}
         */
        isScheduled() {
            return this.rideName !== '';
        }

        /**
         * Check if the ride is past due
         * @param {Date} currentDate - The current date to compare against
         * @returns {boolean}
         */
        isPastDue(currentDate) {
            return this.startDate < currentDate;
        }

        /**
         * Set the ride link (name and URL)
         * Creates a HYPERLINK formula
         * @param {string} name - Display name
         * @param {string} url - URL
         */
        setRideLink(name, url) {
            this.rideCell = HyperlinkUtils.createHyperlinkFormula(name, url);
            this.markDirty('rideCell');
        }

        /**
         * Delete the ride link
         */
        deleteRideLink() {
            this.rideCell = '';
            this.markDirty('rideCell');
        }

        /**
         * Set the route link (name and URL)
         * Creates a HYPERLINK formula
         * @param {string} name - Display name
         * @param {string} url - URL
         */
        setRouteLink(name, url) {
            this.routeCell = HyperlinkUtils.createHyperlinkFormula(name, url);
            this.markDirty('routeCell');
        }

        /**
         * Restore the ride link from current values
         * Used after formula might have been cleared
         */
        restoreRideLink() {
            const name = this.rideName;
            const url = this.rideURL;
            this.setRideLink(name, url);
        }

        /**
         * Clear all announcement-related fields
         * This is the proper way to "remove" an announcement from a row
         */
        clearAnnouncement() {
            this.announcement = '';
            this.sendAt = undefined;
            this.status = '';
            this.attempts = 0;
            this.lastError = '';
            this.lastAttemptAt = undefined;
            
            // Mark all announcement fields as dirty
            this.markDirty('announcement');
            this.markDirty('sendAt');
            this.markDirty('status');
            this.markDirty('attempts');
            this.markDirty('lastError');
            this.markDirty('lastAttemptAt');
        }

        /**
         * Set Google Calendar Event ID
         * @param {string} id - Event ID
         */
        setGoogleEventId(id) {
            this.googleEventId = id;
            this.markDirty('googleEventId');
        }

        /**
         * Set announcement document URL
         * @param {string} docUrl - Document URL
         */
        setAnnouncement(docUrl) {
            this.announcement = docUrl;
            this.markDirty('announcement');
        }

        /**
         * Set scheduled send date/time
         * @param {Date|undefined} datetime - Send time
         */
        setSendAt(datetime) {
            this.sendAt = datetime;
            this.markDirty('sendAt');
        }

        /**
         * Set announcement status
         * @param {string} status - Status value
         */
        setStatus(status) {
            this.status = status;
            this.markDirty('status');
        }

        /**
         * Set attempt count
         * @param {number} count - Number of attempts
         */
        setAttempts(count) {
            this.attempts = count;
            this.markDirty('attempts');
        }

        /**
         * Set last error message
         * @param {string} error - Error message
         */
        setLastError(error) {
            this.lastError = error || '';
            this.markDirty('lastError');
        }

        /**
         * Set timestamp of last send attempt
         * @param {Date|undefined} datetime - Timestamp
         */
        setLastAttemptAt(datetime) {
            this.lastAttemptAt = datetime;
            this.markDirty('lastAttemptAt');
        }

        // ===== DIRTY TRACKING =====

        /**
         * Mark a field as dirty (needs saving)
         * Automatically notifies adapter via onDirty callback when row first becomes dirty
         * @param {string} fieldName - The domain property name that was modified
         */
        markDirty(fieldName) {
            const wasClean = this._dirtyFields.size === 0;
            this._dirtyFields.add(fieldName);
            
            // Notify adapter when row first becomes dirty (not on every field change)
            if (wasClean && this._onDirty) {
                this._onDirty(this);
            }
        }

        /**
         * Get the set of dirty field names
         * @returns {Set<string>} Set of domain property names that have been modified
         */
        getDirtyFields() {
            return this._dirtyFields;
        }

        /**
         * Check if row is dirty
         * @returns {boolean}
         */
        isDirty() {
            return this._dirtyFields.size > 0;
        }

        /**
         * Mark row as clean (after saving)
         */
        markClean() {
            this._dirtyFields.clear();
        }
    }

    return RowCore;
})();

if (typeof module !== 'undefined') {
    module.exports = RowCore;
}
