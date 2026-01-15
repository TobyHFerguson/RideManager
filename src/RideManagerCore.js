// @ts-check

if (typeof require !== 'undefined') {
    // @ts-ignore - Node.js compatibility check
    var dates = require('./common/dates');
}

/**
 * RideManagerCore - Pure JavaScript business logic for ride management
 * All functions are testable without GAS dependencies
 */
class RideManagerCore {
    /**
     * Extracts event ID from an event URL
     * @param {string} eventUrl - The event URL (e.g., "https://ridewithgps.com/events/12345-event-name")
     * @returns {string} The extracted event ID (e.g., "12345")
     */
    static extractEventID(eventUrl) {
        return eventUrl.substring(eventUrl.lastIndexOf('/') + 1).split('-')[0];
    }

    /**
     * Extracts latitude and longitude from route data
     * @param {{first_lat: number, first_lng: number}} route - Route object with first_lat and first_lng properties
     * @returns {string} Location string in format "lat,lng" or empty string if route is null
     */
    static extractLatLong(route) {
        return route ? `${route.first_lat},${route.first_lng}` : '';
    }

    /**
     * Prepares route import configuration for RWGPS
     * @param {{routeURL?: string, routeName?: string, startDate: Date, group: string}} rowData - Plain object with row data
     * @param {{EXPIRY_DELAY: number, FOREIGN_PREFIX: string}} globals - Global configuration
     * @param {Function} addDays - Function to add days to a date (dates.add)
     * @param {Function} formatDate - Function to format date as MMDDYYYY (dates.MMDDYYYY)
     * @returns {{url: string, expiry: string, tags: string[], name?: string}} Route configuration object with url, expiry, tags, and optional name
     */
    static prepareRouteImport(rowData, globals, addDays, formatDate) {
        const startDate = rowData.startDate || new Date();
        const expiryDate = addDays(startDate, globals.EXPIRY_DELAY);
        
        /** @type {{url: string, expiry: string, tags: string[], name?: string}} */
        const route = {
            url: rowData.routeURL || rowData.routeName || '',
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
     * Validates if event name ends with square bracket (debug check for Issue 22)
     * @param {string} eventName - The event name to validate
     * @param {number} rowNum - Row number for error message
     * @param {string} originalName - Original name before processing
     * @param {string} source - Source of the event name (e.g., "RWGPS", "newEvent")
     * @throws {Error} If event name ends with square bracket
     */
    static validateEventNameFormat(eventName, rowNum, originalName, source) {
        if (eventName.trim().endsWith(']')) {
            throw new Error(
                `updateRow_: row ${rowNum}: Event name from ${source} ends with a square bracket: ${eventName}. Original name: ${originalName}`
            );
        }
    }

    /**
     * Prepares calendar event data from row and ride event
     * @param {{name: string, startDateTime?: Date, start_time?: Date | string}} rideEvent - Ride event object (uses startDateTime for domain, start_time for API compat)
     * @param {{endTime: Date}} rowData - Row data with end time
     * @returns {{name: string, start: Date, end: Date}} Calendar event data with name, start, end
     */
    static prepareCalendarEventData(rideEvent, rowData) {
        // Support both domain (startDateTime) and legacy API (start_time) formats
        const startTime = rideEvent.startDateTime || rideEvent.start_time;
        return {
            name: rideEvent.name || '',
            start: startTime ? new Date(startTime) : new Date(),
            end: rowData.endTime ? new Date(rowData.endTime) : new Date()
        };
    }
}

if (typeof module !== 'undefined') {
    module.exports = RideManagerCore;
}
