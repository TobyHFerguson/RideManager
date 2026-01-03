// @ts-check

if (typeof require !== 'undefined') {
    // @ts-ignore - Node.js compatibility check
    var dates = require('./common/dates');
}

/**
 * RideManagerCore - Pure JavaScript business logic for ride management
 * All functions are testable without GAS dependencies
 */
var RideManagerCore = (function() {
    /**
     * Extracts event ID from an event URL
     * @param {string} eventUrl - The event URL (e.g., "https://ridewithgps.com/events/12345-event-name")
     * @returns {string} The extracted event ID (e.g., "12345")
     */
    function extractEventID(eventUrl) {
        return eventUrl.substring(eventUrl.lastIndexOf('/') + 1).split('-')[0];
    }

    /**
     * Extracts latitude and longitude from route data
     * @param {{first_lat: number, first_lng: number}} route - Route object with first_lat and first_lng properties
     * @returns {string} Location string in format "lat,lng" or empty string if route is null
     */
    function extractLatLong(route) {
        return route ? `${route.first_lat},${route.first_lng}` : '';
    }

    /**
     * Prepares route import configuration for RWGPS
     * @param {Object} rowData - Plain object with row data
     * @param {string} rowData.routeURL - Route URL
     * @param {string} rowData.routeName - Route name
     * @param {Date|string} rowData.startDate - Ride start date
     * @param {string} rowData.group - Ride group
     * @param {Object} globals - Global configuration
     * @param {number} globals.EXPIRY_DELAY - Days until route expires
     * @param {string} globals.FOREIGN_PREFIX - Prefix to remove from foreign route names
     * @param {Function} addDays - Function to add days to a date (dates.add)
     * @param {Function} formatDate - Function to format date as MMDDYYYY (dates.MMDDYYYY)
     * @returns {Object} Route configuration object with url, expiry, tags, and optional name
     */
    function prepareRouteImport(rowData, globals, addDays, formatDate) {
        const startDate = rowData.startDate || new Date();
        const expiryDate = addDays(startDate, globals.EXPIRY_DELAY);
        
        /** @type {{url: string, expiry: string, tags: string[], name?: string}} */
        const route = {
            url: rowData.routeURL || rowData.routeName,
            expiry: String(formatDate(expiryDate)),
            tags: [rowData.group]
        };

        // Add name if routeName differs from routeURL
        if (rowData.routeName !== rowData.routeURL) {
            route.name = rowData.routeName;
        }

        // Remove foreign prefix if present
        if (route.name && route.name.startsWith(globals.FOREIGN_PREFIX)) {
            route.name = route.name.substring(globals.FOREIGN_PREFIX.length);
        }

        return route;
    }

    /**
     * Determines if an event name is managed (has group identifier)
     * @param {string} eventName - The event name to check
     * @param {string[]} groupNames - Array of valid group names
     * @returns {boolean} True if event name contains a group identifier
     */
    function isManagedEventName(eventName, groupNames) {
        // This logic is from SCCCCEvent.managedEventName
        for (let i = 0; i < groupNames.length; i++) {
            if (eventName.indexOf(groupNames[i]) !== -1) {
                return true;
            }
        }
        return false;
    }

    /**
     * Extracts group name from event name
     * @param {string} eventName - The event name
     * @param {string[]} groupNames - Array of valid group names
     * @returns {string | null} The group name if found, null otherwise
     */
    function extractGroupName(eventName, groupNames) {
        // This logic is from SCCCCEvent.getGroupName
        for (let i = 0; i < groupNames.length; i++) {
            if (eventName.indexOf(groupNames[i]) !== -1) {
                return groupNames[i];
            }
        }
        return null;
    }

    /**
     * Validates if event name ends with square bracket (debug check for Issue 22)
     * @param {string} eventName - The event name to validate
     * @param {number} rowNum - Row number for error message
     * @param {string} originalName - Original name before processing
     * @param {string} source - Source of the event name (e.g., "RWGPS", "newEvent")
     * @throws {Error} If event name ends with square bracket
     */
    function validateEventNameFormat(eventName, rowNum, originalName, source) {
        if (eventName.trim().endsWith(']')) {
            throw new Error(
                `updateRow_: row ${rowNum}: Event name from ${source} ends with a square bracket: ${eventName}. Original name: ${originalName}`
            );
        }
    }

    /**
     * Prepares calendar event data from row and ride event
     * @param {Object} rideEvent - Ride event object
     * @param {string} rideEvent.name - Event name
     * @param {string|Date} rideEvent.start_time - Event start time
     * @param {Object} rowData - Row data
     * @param {Date|string} rowData.endTime - Event end time
     * @returns {Object} Calendar event data with name, start, end
     */
    function prepareCalendarEventData(rideEvent, rowData) {
        return {
            name: rideEvent.name || '',
            start: rideEvent.start_time ? new Date(rideEvent.start_time) : new Date(),
            end: rowData.endTime ? new Date(rowData.endTime) : new Date()
        };
    }

    return {
        extractEventID,
        extractLatLong,
        prepareRouteImport,
        isManagedEventName,
        extractGroupName,
        validateEventNameFormat,
        prepareCalendarEventData
    };
})();

if (typeof module !== 'undefined') {
    module.exports = RideManagerCore;
}
