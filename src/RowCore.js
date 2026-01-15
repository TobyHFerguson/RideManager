// @ts-check

// RowCore needs HyperlinkUtils for backward compatibility (formula parsing)
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

/**
 * @typedef {Object} RowCoreParams
 * @property {Date} startDate - Start date/time of the ride
 * @property {number} [duration] - Duration in hours (for calculating end time)
 * @property {number} [defaultDuration] - Default duration if not specified
 * @property {string} group - Ride group (e.g., "Sat A", "Sun B")
 * @property {string | {text: string, url: string}} routeCell - Route hyperlink (URL string, object, or formula)
 * @property {string | {text: string, url: string}} rideCell - Ride hyperlink (URL string, object, or formula)
 * @property {string} rideLeaders - Comma-separated leader names
 * @property {string | {text: string, url: string}} googleEventIdCell - Google Calendar Event ID as RichText link
 * @property {string} location - Meeting location name
 * @property {string} address - Full address of meeting location
 * @property {string | {text: string, url: string}} [announcementCell] - Announcement document (RichText {text, url} object or URL string for backward compat)
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
            googleEventIdCell,
            location,
            address,
            announcementCell,
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
            
            // Normalize routeCell, rideCell, and googleEventIdCell to {text, url} format
            // Supports: string (legacy formula or URL), {text, url} object, or empty
            this.routeCell = this._normalizeLinkCell(routeCell);
            this.rideCell = this._normalizeLinkCell(rideCell);
            this.googleEventIdCell = this._normalizeLinkCell(googleEventIdCell);
            
            this.rideLeaders = rideLeaders || '';
            this.location = location || '';
            this.address = address || '';
            
            // Announcement properties (announcementCell is RichText {text, url} object)
            this.announcementCell = this._normalizeLinkCell(announcementCell) || { text: '', url: '' };
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
        
        /**
         * Normalize a link cell to {text, url} format
         * Handles multiple input formats for backward compatibility
         * @private
         * @param {string | {text: string, url: string} | any} cell - Input value
         * @returns {{text: string, url: string}} Normalized format
         */
        _normalizeLinkCell(cell) {
            // Already in correct format
            if (cell && typeof cell === 'object' && 'text' in cell && 'url' in cell) {
                return { text: cell.text || '', url: cell.url || '' };
            }
            
            // Legacy formula format (for backward compatibility during migration)
            if (typeof cell === 'string' && cell.toLowerCase().startsWith('=hyperlink')) {
                // Need HyperlinkUtils for backward compatibility
                if (typeof HyperlinkUtils !== 'undefined') {
                    const { url, name } = HyperlinkUtils.parseHyperlinkFormula(cell);
                    return { text: name, url: url };
                }
                // Fallback if HyperlinkUtils not available
                return { text: cell, url: '' };
            }
            
            // Plain URL string (treat as URL with same text)
            if (typeof cell === 'string' && cell) {
                return { text: cell, url: cell };
            }
            
            // Empty or invalid
            return { text: '', url: '' };
        }

        // ===== COMPUTED PROPERTIES (GETTERS) =====

        /**
         * Start date/time as a Date object
         * This is the canonical property name for domain objects
         * @returns {Date}
         */
        get startDateTime() {
            return this.startDate;
        }

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
         * Extract route name from hyperlink
         * @returns {string}
         */
        get routeName() {
            if (typeof this.routeCell === 'object' && this.routeCell.text) {
                return this.routeCell.text;
            }
            return '';
        }

        /**
         * Extract route URL from hyperlink
         * @returns {string}
         */
        get routeURL() {
            if (typeof this.routeCell === 'object' && this.routeCell.url) {
                return this.routeCell.url;
            }
            return '';
        }

        /**
         * Parse ride leaders into array
         * Iff leaders is empty string, return ['To Be Determined']
         * @returns {string[]}
         */
        get leaders() {
            const leadersArray = this.rideLeaders ? this.rideLeaders.split(',').map(rl => rl.trim()).filter(rl => rl) : [];
            return leadersArray.length > 0 ? leadersArray : ['To Be Determined'];
        }

        /**
         * Extract ride name from hyperlink
         * @returns {string}
         */
        get rideName() {
            if (typeof this.rideCell === 'object' && this.rideCell.text) {
                return this.rideCell.text;
            }
            return '';
        }

        /**
         * Extract ride URL from hyperlink
         * @returns {string}
         */
        get rideURL() {
            if (typeof this.rideCell === 'object' && this.rideCell.url) {
                return this.rideCell.url;
            }
            return '';
        }

        /**
         * Extract Google Calendar Event ID from RichText link
         * @returns {string}
         */
        get googleEventId() {
            if (typeof this.googleEventIdCell === 'object' && this.googleEventIdCell.text) {
                return this.googleEventIdCell.text;
            }
            return '';
        }
        
        /**
         * Get announcement document URL
         * @returns {string} Announcement document URL
         */
        get announcementURL() {
            if (typeof this.announcementCell === 'object' && this.announcementCell.url) {
                return this.announcementCell.url;
            }
            return '';
        }
        
        /**
         * Get announcement document title
         * @returns {string} Announcement document title/display text
         */
        get announcementText() {
            if (typeof this.announcementCell === 'object' && this.announcementCell.text) {
                return this.announcementCell.text;
            }
            return '';
        }
        
        /**
         * Get announcement as RichText object (backward compatibility)
         * @deprecated Use announcementCell directly
         * @returns {{text: string, url: string}} RichText object
         */
        get announcement() {
            return this.announcementCell;
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
         * Stores as {text, url} object for RichText creation
         * @param {string} name - Display name
         * @param {string} url - URL
         */
        setRideLink(name, url) {
            this.rideCell = { text: name, url: url };
            this.markDirty('rideCell');
        }

        /**
         * Delete the ride link
         */
        deleteRideLink() {
            this.rideCell = { text: '', url: '' };
            this.markDirty('rideCell');
        }

        /**
         * Set the route link (name and URL)
         * Stores as {text, url} object for RichText creation
         * @param {string} name - Display name
         * @param {string} url - URL
         */
        setRouteLink(name, url) {
            this.routeCell = { text: name, url: url };
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
            this.announcementCell = { text: '', url: '' };
            this.sendAt = undefined;
            this.status = '';
            this.attempts = '';
            this.lastError = '';
            this.lastAttemptAt = undefined;
            
            // Mark all announcement fields as dirty
            this.markDirty('announcementCell');
            this.markDirty('sendAt');
            this.markDirty('status');
            this.markDirty('attempts');
            this.markDirty('lastError');
            this.markDirty('lastAttemptAt');
        }

        /**
         * Set Google Calendar Event ID as RichText link
         * @param {string} text - Event ID (display text)
         * @param {string} url - Calendar URL
         */
        setGoogleEventIdLink(text, url) {
            this.googleEventIdCell = { text, url };
            this.markDirty('googleEventIdCell');
        }
        
        /**
         * Set Google Calendar Event ID (backward compatibility - plain text)
         * @deprecated Use setGoogleEventIdLink instead for RichText support
         * @param {string} id - Event ID
         */
        setGoogleEventId(id) {
            this.googleEventIdCell = { text: id, url: '' };
            this.markDirty('googleEventIdCell');
        }

        /**
         * Set announcement document with RichText hyperlink
         * Follows same pattern as setGoogleEventIdLink (lines 315-318)
         * @param {string} docUrl - Document URL
         * @param {string} [displayText] - Document title to display (defaults to URL if not provided)
         */
        setAnnouncement(docUrl, displayText) {
            if (docUrl) {
                // Store as {text, url} object for RichText rendering by ScheduleAdapter
                this.announcementCell = {
                    text: displayText || docUrl,
                    url: docUrl
                };
            } else {
                // Allow clearing the announcement
                this.announcementCell = { text: '', url: '' };
            }
            this.markDirty('announcementCell');
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

if (typeof module !== 'undefined') {
    module.exports = RowCore;
}
