// @ts-check

if (typeof require !== 'undefined') {
    var HyperlinkUtils = require('./HyperlinkUtils.js');
}

/**
 * Row - Pure JavaScript domain model for a schedule row
 * 
 * This class represents a single ride schedule entry and provides getters/setters
 * to map between spreadsheet column names and business logic properties.
 * 
 * It is now independent of GAS APIs (no SpreadsheetApp, no Range objects).
 * The ScheduleAdapter is responsible for creating Row instances and persisting changes.
 */

var Row = (function() {
    'use strict';

    class Row {
        /**
         * Create a Row from plain object data
         * @param {Object} data - Plain object with column names as keys (from Fiddler)
         * @param {ScheduleAdapter} adapter - Reference to the adapter for persistence operations
         */
        constructor(data, adapter) {
            this._data = { ...data };
            this._adapter = adapter;
            this._dirty = false; // Track if row needs saving
            this._dirtyFields = new Set(); // Track which specific fields are dirty
            
            // Store metadata
            this.rowNum = data._rowNum;
            this._range = data._range;
            
            // Remove metadata from data object
            delete this._data._rowNum;
            delete this._data._range;
        }

        // ===== GETTERS =====

        get StartDate() {
            return this._data[getGlobals().STARTDATETIMECOLUMNNAME];
        }

        get StartTime() {
            return this._data[getGlobals().STARTDATETIMECOLUMNNAME];
        }

        get EndTime() {
            const duration = this._data[getGlobals().DURATIONCOLUMNNAME] || getGlobals().DEFAULTRIDEDURATION;
            const end = new Date(this.StartTime.getTime() + duration * 60 * 60 * 1000);
            return end;
        }

        get Group() {
            return this._data[getGlobals().GROUPCOLUMNNAME];
        }

        get RouteName() {
            const cellValue = this._data[getGlobals().ROUTECOLUMNNAME];
            const { name } = HyperlinkUtils.parseHyperlinkFormula(cellValue);
            return name;
        }

        get RouteURL() {
            const cellValue = this._data[getGlobals().ROUTECOLUMNNAME];
            const { url } = HyperlinkUtils.parseHyperlinkFormula(cellValue);
            return url;
        }

        get RideLeaders() {
            let rls = this._data[getGlobals().RIDELEADERCOLUMNNAME];
            return rls ? rls.split(',').map(rl => rl.trim()).filter(rl => rl) : [];
        }

        get RideName() {
            const cellValue = this._data[getGlobals().RIDECOLUMNNAME];
            const { name } = HyperlinkUtils.parseHyperlinkFormula(cellValue);
            return name;
        }

        get RideURL() {
            const cellValue = this._data[getGlobals().RIDECOLUMNNAME];
            const { url } = HyperlinkUtils.parseHyperlinkFormula(cellValue);
            return url;
        }

        get GoogleEventId() {
            return this._data[getGlobals().GOOGLEEVENTIDCOLUMNNAME];
        }

        get Location() {
            return this._data[getGlobals().LOCATIONCOLUMNNAME];
        }

        get Address() {
            return this._data[getGlobals().ADDRESSCOLUMNNAME];
        }

        // Announcement queue fields (no Globals needed - column names have no spaces)
        get Announcement() {
            return this._data['Announcement'] || '';
        }

        get SendAt() {
            return this._data['SendAt'];
        }

        get Status() {
            return this._data['Status'] || '';
        }

        get Attempts() {
            return this._data['Attempts'] || 0;
        }

        get LastError() {
            return this._data['LastError'] || '';
        }

        get LastAttemptAt() {
            const val = this._data['LastAttemptAt'];
            return val ? new Date(val) : undefined;
        }

        // ===== SETTERS =====

        set GoogleEventId(id) {
            const columnName = getGlobals().GOOGLEEVENTIDCOLUMNNAME;
            this._data[columnName] = id;
            this._markDirty(columnName);
        }

        set Announcement(docUrl) {
            this._data['Announcement'] = docUrl;
            this._markDirty('Announcement');
        }

        set SendAt(datetime) {
            this._data['SendAt'] = datetime;
            this._markDirty('SendAt');
        }

        set Status(status) {
            this._data['Status'] = status;
            this._markDirty('Status');
        }

        set Attempts(count) {
            this._data['Attempts'] = count;
            this._markDirty('Attempts');
        }

        set LastError(error) {
            this._data['LastError'] = error || '';
            this._markDirty('LastError');
        }

        set LastAttemptAt(datetime) {
            this._data['LastAttemptAt'] = datetime;
            this._markDirty('LastAttemptAt');
        }

        // ===== METHODS =====

        /**
         * Highlight the ride leader cell
         * @param {boolean} onoff - True to highlight, false to clear
         * @returns {Row} this for chaining
         */
        highlightRideLeader(onoff) {
            if (this._adapter) {
                this._adapter.highlightCell(this.rowNum, getGlobals().RIDELEADERCOLUMNNAME, onoff);
            }
            return this;
        }

        /**
         * Set the ride link (name and URL)
         * @param {string} name - Display name
         * @param {string} url - URL
         */
        setRideLink(name, url) {
            const columnName = getGlobals().RIDECOLUMNNAME;
            const formula = HyperlinkUtils.createHyperlinkFormula(name, url);
            this._data[columnName] = formula;
            this._markDirty(columnName);
        }

        /**
         * Delete the ride link
         */
        deleteRideLink() {
            const columnName = getGlobals().RIDECOLUMNNAME;
            this._data[columnName] = '';
            this._markDirty(columnName);
        }

        /**
         * Set the route link (name and URL)
         * @param {string} name - Display name
         * @param {string} url - URL
         */
        setRouteLink(name, url) {
            const columnName = getGlobals().ROUTECOLUMNNAME;
            const formula = HyperlinkUtils.createHyperlinkFormula(name, url);
            this._data[columnName] = formula;
            this._markDirty(columnName);
        }

        /**
         * Determines if the schedule row is planned by checking if StartDate, Group, and RouteURL are set.
         * @returns {boolean} True if all required properties are present; otherwise, false.
         */
        isPlanned() {
            return !!(this.StartDate && this.Group && this.RouteURL);
        }

        /**
         * Determines if the ride is scheduled.
         * @returns {boolean} Returns true if the ride has a name, otherwise false.
         */
        isScheduled() {
            return this.RideName !== '';
        }

        /**
         * Resolve and link the name and the url in the Route column
         * @returns {Row} this for chaining
         */
        linkRouteURL() {
            // Skip the header row
            if (this.rowNum === 1) return this;

            const getRouteJson = (url) => {
                const error = rowCheck.badRoute(this);
                if (error) {
                    throw new Error(error);
                }
                const response = UrlFetchApp.fetch(`${url}.json`, { muteHttpExceptions: true });
                switch (response.getResponseCode()) {
                    case 403:
                        throw new Error(`This route: ${url} is not publicly accessible`);
                    case 404:
                        throw new Error(`This route: ${url} cannot be found on the server`);
                    case 200:
                        break;
                    default:
                        throw new Error(`Unknown error retrieving data for ${url}`);
                }
                return JSON.parse(response.getContentText());
            };

            let url = this.RouteURL;
            let text = this.RouteName;

            // It's possible to not have a URL but to have the text, and that text be a URL string! 
            // In that case then make the url be the text and set both parts of the hyperlink to be that url string
            if (!url) {
                url = text;
                this.setRouteLink(text, url);
            }
            
            // However we got here then the url and the text are the same - the Route Name is not being displayed to
            // the user. So lets try and put in the correct route name. If the route is foreign we'll prefix the name
            // to make that clear to the user.
            if (url === text) {
                try {
                    let route = getRouteJson(url);
                    let name = `${(route.user_id !== getGlobals().SCCCC_USER_ID) ? getGlobals().FOREIGN_PREFIX + ' ' : ''}` + route.name;
                    this.setRouteLink(name, url);
                } catch (e) {
                    Logger.log(`Row ${this.rowNum}: ${e.message}`);
                }
            }
            
            return this;
        }

        /**
         * Restore the ride link from stored formula
         */
        restoreRideLink() {
            const name = this.RideName;
            const url = this.RideURL;
            this.setRideLink(name, url);
        }

        /**
         * Mark this row as dirty (needs saving)
         * @private
         * @param {string} fieldName - The column name that was modified
         */
        _markDirty(fieldName) {
            this._dirty = true;
            if (fieldName) {
                this._dirtyFields.add(fieldName);
            }
            if (this._adapter) {
                this._adapter._markRowDirty(this);
            }
        }

        /**
         * Get the internal data object (for persistence)
         * @returns {Object} Plain object with column names as keys
         */
        _getData() {
            return {
                ...this._data,
                _rowNum: this.rowNum,
                _range: this._range
            };
        }

        /**
         * Check if row is dirty
         * @returns {boolean}
         */
        _isDirty() {
            return this._dirty;
        }

        /**
         * Mark row as clean (after saving)
         */
        _markClean() {
            this._dirty = false;
            this._dirtyFields.clear();
        }

        /**
         * Get the set of dirty field names
         * @returns {Set<string>} Set of column names that have been modified
         */
        _getDirtyFields() {
            return this._dirtyFields;
        }
    }

    return Row;
})();

if (typeof module !== 'undefined') {
    module.exports = Row;
}
