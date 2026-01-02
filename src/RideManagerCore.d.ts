/**
 * RideManagerCore - Pure JavaScript business logic for ride management
 * All functions are testable without GAS dependencies
 */
declare namespace RideManagerCore {
    /**
     * Extracts event ID from an event URL
     * @param eventUrl - The event URL (e.g., "https://ridewithgps.com/events/12345-event-name")
     * @returns The extracted event ID (e.g., "12345")
     */
    function extractEventID(eventUrl: string): string;

    /**
     * Extracts latitude and longitude from route data
     * @param route - Route object with first_lat and first_lng properties
     * @returns Location string in format "lat,lng" or empty string if route is null
     */
    function extractLatLong(route: any): string;

    /**
     * Route import configuration
     */
    interface RouteImportConfig {
        url: string;
        expiry: string;
        tags: string[];
        name?: string;
    }

    /**
     * Prepares route import configuration for RWGPS
     * @param rowData - Plain object with row data
     * @param globals - Global configuration
     * @param addDays - Function to add days to a date (dates.add)
     * @param formatDate - Function to format date as MMDDYYYY (dates.MMDDYYYY)
     * @returns Route configuration object with url, expiry, tags, and optional name
     */
    function prepareRouteImport(
        rowData: {
            routeURL: string;
            routeName: string;
            startDate?: Date | string;
            group: string;
        },
        globals: {
            EXPIRY_DELAY: number;
            FOREIGN_PREFIX: string;
        },
        addDays: (date: Date | string, days: number) => Date,
        formatDate: (date: Date) => string
    ): RouteImportConfig;

    /**
     * Determines if an event name is managed (has group identifier)
     * @param eventName - The event name to check
     * @param groupNames - Array of valid group names
     * @returns True if event name contains a group identifier
     */
    function isManagedEventName(eventName: string, groupNames: string[]): boolean;

    /**
     * Extracts group name from event name
     * @param eventName - The event name
     * @param groupNames - Array of valid group names
     * @returns The group name if found, null otherwise
     */
    function extractGroupName(eventName: string, groupNames: string[]): string | null;

    /**
     * Validates if event name ends with square bracket (debug check for Issue 22)
     * @param eventName - The event name to validate
     * @param rowNum - Row number for error message
     * @param originalName - Original name before processing
     * @param source - Source of the event name (e.g., "RWGPS", "newEvent")
     * @throws {Error} If event name ends with square bracket
     */
    function validateEventNameFormat(
        eventName: string,
        rowNum: number,
        originalName: string,
        source: string
    ): void;

    /**
     * Calendar event data
     */
    interface CalendarEventData {
        name: string;
        start: Date;
        end: Date;
    }

    /**
     * Prepares calendar event data from row and ride event
     * @param rideEvent - Ride event object
     * @param rowData - Row data
     * @returns Calendar event data with name, start, end
     */
    function prepareCalendarEventData(
        rideEvent: {
            name?: string;
            start_time?: string | Date;
        },
        rowData: {
            endTime?: Date | string;
        }
    ): CalendarEventData;
}

export default RideManagerCore;
