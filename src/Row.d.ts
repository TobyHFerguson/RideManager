/**
 * Row - Domain model for a schedule row
 * 
 * Type definitions for schedule row data and operations.
 * This class is a pure JavaScript domain model independent of GAS APIs.
 */

/**
 * Represents a single ride schedule entry
 * 
 * This class provides getters/setters to map between spreadsheet column names
 * and business logic properties. It tracks dirty state for efficient persistence.
 */
declare class Row {
    /** Adapter reference for persistence operations */
    private _adapter: any;
    /** Internal data storage (column names as keys) */
    private _data: Record<string, any>;
    /** Whether row has unsaved changes */
    private _dirty: boolean;
    /** Set of column names that have been modified */
    private _dirtyFields: Set<string>;
    /** Spreadsheet row number (1-based) */
    readonly rowNum: number;
    /** Range object from spreadsheet (metadata) */
    private _range: any;

    /**
     * Create a Row from plain object data
     * @param data - Plain object with column names as keys (from Fiddler)
     * @param adapter - Reference to the adapter for persistence operations
     */
    constructor(data: Record<string, any>, adapter: any);

    // ===== GETTERS =====

    /** Start date/time of the ride */
    get StartDate(): Date;

    /** Start time of the ride (same as StartDate) */
    get StartTime(): Date;

    /** Calculated end time based on start time and duration */
    get EndTime(): Date;

    /** Ride group (e.g., "Sat A", "Sun B") */
    get Group(): string;

    /** Route name extracted from Route column hyperlink */
    get RouteName(): string;

    /** Route URL extracted from Route column hyperlink */
    get RouteURL(): string;

    /** Array of ride leader names */
    get RideLeaders(): string[];

    /** Ride name extracted from Ride column hyperlink */
    get RideName(): string;

    /** Ride URL extracted from Ride column hyperlink */
    get RideURL(): string;

    /** Google Calendar event ID */
    get GoogleEventId(): string;

    /** Ride location/starting point */
    get Location(): string;

    /** Street address of starting location */
    get Address(): string;

    // ===== SETTERS =====

    /** Set Google Calendar event ID */
    set GoogleEventId(id: string);

    // ===== METHODS =====

    /**
     * Highlight the ride leader cell
     * @param onoff - True to highlight (red), false to clear
     * @returns this for chaining
     */
    highlightRideLeader(onoff: boolean): Row;

    /**
     * Set the ride link (name and URL)
     * Creates a HYPERLINK formula in the Ride column
     * @param name - Display name
     * @param url - URL
     */
    setRideLink(name: string, url: string): void;

    /**
     * Delete the ride link
     * Clears the Ride column
     */
    deleteRideLink(): void;

    /**
     * Set the route link (name and URL)
     * Creates a HYPERLINK formula in the Route column
     * @param name - Display name
     * @param url - URL
     */
    setRouteLink(name: string, url: string): void;

    /**
     * Check if the ride is planned
     * A ride is planned if it has StartDate, Group, and RouteURL
     * @returns True if all required properties are present
     */
    isPlanned(): boolean;

    /**
     * Check if the ride is scheduled
     * A ride is scheduled if it has a RideName
     * @returns True if ride has a name
     */
    isScheduled(): boolean;

    /**
     * Resolve and link the name and URL in the Route column
     * Fetches route data from RWGPS if needed and updates the hyperlink
     * @returns this for chaining
     */
    linkRouteURL(): Row;

    /**
     * Restore the ride link from stored formula
     * Used after formula might have been cleared
     */
    restoreRideLink(): void;

    // ===== INTERNAL METHODS =====

    /**
     * Mark this row as dirty (needs saving)
     * @private
     * @param fieldName - The column name that was modified
     */
    _markDirty(fieldName?: string): void;

    /**
     * Get the internal data object (for persistence)
     * @private
     * @returns Plain object with column names as keys, plus metadata
     */
    _getData(): Record<string, any>;

    /**
     * Check if row is dirty
     * @private
     */
    _isDirty(): boolean;

    /**
     * Mark row as clean (after saving)
     * @private
     */
    _markClean(): void;

    /**
     * Get the set of dirty field names
     * @private
     * @returns Set of column names that have been modified
     */
    _getDirtyFields(): Set<string>;
}

export default Row;
