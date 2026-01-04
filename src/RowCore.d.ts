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
 * Constructor parameters for RowCore
 */
interface RowCoreParams {
    /** Start date/time of the ride */
    startDate: Date;
    /** Duration in hours (for calculating end time) */
    duration?: number;
    /** Default duration if not specified */
    defaultDuration?: number;
    /** Ride group (e.g., "Sat A", "Sun B") */
    group: string;
    /** Route hyperlink formula or text */
    routeCell: string;
    /** Ride hyperlink formula or text */
    rideCell: string;
    /** Comma-separated leader names */
    rideLeaders: string;
    /** Google Calendar Event ID as RichText link */
    googleEventIdCell: string | {text: string, url: string};
    /** Meeting location name */
    location: string;
    /** Full address of meeting location */
    address: string;
    /** Announcement document URL */
    announcement?: string;
    /** Scheduled send date/time */
    sendAt?: Date;
    /** Announcement status */
    status?: string;
    /** Number of send attempts */
    attempts?: number;
    /** Last error message */
    lastError?: string;
    /** Timestamp of last send attempt */
    lastAttemptAt?: Date;
    /** Spreadsheet row number (1-based) */
    rowNum: number;
    /** Optional callback when row becomes dirty (called with this RowCore) */
    onDirty?: (row: RowCore) => void;
    /** Timestamp of last send attempt */
    lastAttemptAt?: Date;
    /** Spreadsheet row number (1-based) */
    rowNum: number;
}

/**
 * Pure domain model for a ride schedule row
 */
declare class RowCore {
    // Core ride properties
    /** Start date/time of the ride */
    startDate: Date;
    /** Duration in hours */
    duration?: number;
    /** Default duration in hours */
    defaultDuration?: number;
    /** Ride group (e.g., "Sat A", "Sun B") */
    group: string;
    /** Route hyperlink formula or text */
    routeCell: string;
    /** Ride hyperlink formula or text */
    rideCell: string;
    /** Comma-separated leader names */
    rideLeaders: string;
    /** Google Calendar Event ID as RichText link */
    googleEventIdCell: string | {text: string, url: string};
    /** Meeting location name */
    location: string;
    /** Full address of meeting location */
    address: string;
    
    // Announcement properties
    /** Announcement document URL */
    announcement: string;
    /** Scheduled send date/time */
    sendAt?: Date;
    /** Announcement status: 'pending' | 'sent' | 'failed' | 'abandoned' */
    status: string;
    /** Number of send attempts */
    attempts: number;
    /** Last error message */
    lastError: string;
    /** Timestamp of last send attempt */
    lastAttemptAt?: Date;
    
    // Metadata
    /** Spreadsheet row number (1-based) */
    readonly rowNum: number;
    
    /** Track dirty fields for persistence */
    private _dirtyFields: Set<string>;

    /**
     * Create a RowCore from plain domain data
     */
    constructor(params: RowCoreParams);

    // ===== COMPUTED PROPERTIES (GETTERS) =====

    /** Start time (alias for startDate) */
    get startTime(): Date;

    /** Calculate end time based on start time and duration */
    get endTime(): Date;

    /** Extract route name from hyperlink formula or return text */
    get routeName(): string;

    /** Extract route URL from hyperlink formula */
    get routeURL(): string;

    /** Parse ride leaders into array */
    get leaders(): string[];

    /** Extract ride name from hyperlink formula or return text */
    get rideName(): string;

    /** Extract ride URL from hyperlink formula */
    get rideURL(): string;

    /** Extract Google Calendar Event ID from RichText link */
    get googleEventId(): string;

    // ===== BUSINESS LOGIC METHODS =====

    /**
     * Check if the ride is planned
     * A ride is planned if it has startDate, group, and routeURL
     */
    isPlanned(): boolean;

    /**
     * Check if the ride is scheduled
     * A ride is scheduled if it has a rideName
     */
    isScheduled(): boolean;

    /**
     * Check if the ride is past due
     * @param currentDate - The current date to compare against
     */
    isPastDue(currentDate: Date): boolean;

    /**
     * Set the ride link (name and URL)
     * Creates a HYPERLINK formula
     * @param name - Display name
     * @param url - URL
     */
    setRideLink(name: string, url: string): void;

    /**
     * Delete the ride link
     */
    deleteRideLink(): void;

    /**
     * Set the route link (name and URL)
     * Creates a HYPERLINK formula
     * @param name - Display name
     * @param url - URL
     */
    setRouteLink(name: string, url: string): void;

    /**
     * Restore the ride link from current values
     * Used after formula might have been cleared
     */
    restoreRideLink(): void;

    /**
     * Clear all announcement-related fields
     * This is the proper way to "remove" an announcement from a row
     */
    clearAnnouncement(): void;

    /**
     * Set Google Calendar Event ID as RichText link
     * @param text - Event ID (display text)
     * @param url - Calendar URL
     */
    setGoogleEventIdLink(text: string, url: string): void;

    /**
     * Set Google Calendar Event ID (backward compatibility - plain text)
     * @deprecated Use setGoogleEventIdLink instead for RichText support
     * @param id - Event ID
     */
    setGoogleEventId(id: string): void;

    /**
     * Set announcement document URL
     * @param docUrl - Document URL
     */
    setAnnouncement(docUrl: string): void;

    /**
     * Set scheduled send date/time
     * @param datetime - Send time
     */
    setSendAt(datetime: Date | undefined): void;

    /**
     * Set announcement status
     * @param status - Status value
     */
    setStatus(status: string): void;

    /**
     * Set attempt count
     * @param count - Number of attempts
     */
    setAttempts(count: number): void;

    /**
     * Set last error message
     * @param error - Error message
     */
    setLastError(error: string): void;

    /**
     * Set timestamp of last send attempt
     * @param datetime - Timestamp
     */
    setLastAttemptAt(datetime: Date | undefined): void;

    // ===== DIRTY TRACKING =====

    /**
     * Mark a field as dirty (needs saving)
     * @param fieldName - The domain property name that was modified
     */
    markDirty(fieldName: string): void;

    /**
     * Get the set of dirty field names
     * @returns Set of domain property names that have been modified
     */
    getDirtyFields(): Set<string>;

    /**
     * Check if row is dirty
     */
    isDirty(): boolean;

    /**
     * Mark row as clean (after saving)
     */
    markClean(): void;
}

export default RowCore;
