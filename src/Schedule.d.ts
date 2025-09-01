// @ts-check
declare const Schedule: ScheduleInstance;

/**
 * The Schedule class provides methods to interact with and manipulate ride scheduling data
 * stored in the "Consolidated Rides" sheet of a Google Spreadsheet. It supports operations
 * such as storing/restoring formulas, highlighting cells, saving and retrieving rows, and
 * handling ride and route information.
*
 * Represents a schedule within a Google Spreadsheet, providing methods for reading, writing,
 * and manipulating schedule-related data. The `Schedule` class manages rows, columns, and
 * formulas associated with the schedule, and offers utilities for highlighting cells,
 * saving and restoring formulas, and converting ranges to row objects.
 *
 * @remarks
 * This class is designed to work with Google Apps Script and interacts directly with
 * spreadsheet data and document properties. It supports operations such as retrieving
 * specific columns or rows, storing and restoring formulas, and highlighting cells for
 * user feedback.
 *
 * @property crSheet - The sheet instance representing the current schedule.
 * @property columnNames - An array of strings representing the names of the columns.
 * @property rows - A set containing all the rows associated with the schedule.
 *
 * @example
 * ```typescript
 * const schedule = new Schedule();
 * const youngerRows = schedule.getYoungerRows(new Date());
 * schedule.highlightCell(5, "RideLeader", true);
 * schedule.save();
 * ```
 */
interface ScheduleInstance {
    /**
     * The sheet instance representing the current schedule within the Google Spreadsheet.
     * Used for reading and writing schedule-related data.
     */
    crSheet: GoogleAppsScript.Spreadsheet.Sheet;
    /**
     * An array of strings representing the names of the columns in the schedule.
     */
    columnNames: string[];
    /**
     * A set containing all the rows associated with the schedule.
     * Each row represents a distinct entry or item in the schedule.
     */
    rows: Set<Row>;

    constructor();

    /**
     * Gets a range object for a specified column and rows.
     * @param columnName The name of the column to get the range for.
     * @param rowNum The starting row number (default is 2).
     * @param numRows The number of rows to include in the range. If 0, uses all rows from rowNum to the last row.
     * @returns The range object for the specified column and rows.
     */
    _getColumnRange(columnName: string, rowNum?: number, numRows?: number): GoogleAppsScript.Spreadsheet.Range;

    /**
     * Gets a range object for the ride column.
     */
    _getRideColumnRange(rowNum?: number, numCols?: number): GoogleAppsScript.Spreadsheet.Range;

    /**
     * Gets a range object for the route column.
     */
    _getRouteColumnRange(rowNum?: number, numCols?: number): GoogleAppsScript.Spreadsheet.Range;

    /**
     * Stores both ride and route formulas in document properties.
     */
    storeFormulas(): void;

    /**
     * Stores route column formulas in document properties.
     */
    storeRouteFormulas(): void;

    /**
     * Stores ride column formulas in document properties.
     */
    storeRideFormulas(): void;

    /**
     * Restores both ride and route formulas for a given row.
     * @param rowNum The row number to restore formulas for.
     */
    restoreFormula(rowNum: number): void;

    /**
     * Restores the route formula for a given row.
     * @param rowNum The row number to restore the route formula for.
     */
    restoreRouteFormula(rowNum: number): void;

    /**
     * Restores the ride formula for a given row.
     * @param rowNum The row number to restore the ride formula for.
     */
    restoreRideFormula(rowNum: number): void;

    /**
     * Returns all rows scheduled after a given date.
     * @param date The date after which rows should be returned.
     * @returns Array of Row objects.
     */
    getYoungerRows(date: Date): Row[];

    /**
     * Finds the last row before yesterday's date.
     * @returns The row number.
     */
    findLastRowBeforeYesterday(): number;

    /**
     * Returns the index of a column by name.
     * @param name The column name.
     * @returns The column index.
     */
    getColumnIndex(name: string): number;

    /**
     * Gets the start date from a row's values.
     * @param values The row values.
     * @returns The start date.
     */
    getStartDate(values: any[]): Date;

    /**
     * Gets the start time from a row's values.
     * @param values The row values.
     * @returns The start time.
     */
    getStartTime(values: any[]): Date;

    /**
     * Gets the group from a row's values.
     * @param values The row values.
     * @returns The group name.
     */
    getGroup(values: any[]): string;

    /**
     * Gets the ride leader from a row's values.
     * @param values The row values.
     * @returns The ride leader.
     */
    getRideLeader(values: any[]): string;

    /**
     * Gets the location from a row's values.
     * @param values The row values.
     * @returns The location.
     */
    getLocation(values: any[]): string;

    /**
     * Gets the address from a row's values.
     * @param values The row values.
     * @returns The address.
     */
    getAddress(values: any[]): string;

    /**
     * Highlights or unhighlights a cell in the sheet.
     * @param rowNum The row number.
     * @param colName The column name.
     * @param onoff Whether to highlight (true) or unhighlight (false).
     */
    highlightCell(rowNum: number, colName: string, onoff: boolean): void;

    /**
     * Adds a row to the set of rows to be saved.
     * @param row The Row object.
     */
    saveRow(row: Row): void;

    /**
     * Reduces a set of rows to those with disjoint ranges.
     * @param rows Set of Row objects.
     * @returns Set of Row objects with unique ranges.
     */
    getRowSet(rows: Set<Row>): Set<Row>;

    /**
     * Saves all rows in the set to the sheet and persists formulas.
     */
    save(): void;

    /**
     * Clears the ride link cell for a given row.
     * @param rowNum The row number.
     */
    deleteRideLink(rowNum: number): void;

    /**
     * Converts a sheet range to an array of Row objects.
     * @param range The sheet range.
     * @returns Array of Row objects.
     */
    convertRangeToRows(range: GoogleAppsScript.Spreadsheet.Range): Row[];

    /**
     * Gets the selected rows from the sheet.
     * @returns Array of Row objects.
     */
    getSelectedRows(): Row[];

    /**
     * Gets the last row in the sheet as a Row object.
     * @returns The last Row object.
     */
    getLastRow(): Row;
}

/**
 * The Row class represents a row in the schedule and provides methods to access and manipulate
 * ride and route information for that row.
 */
declare class Row {
    schedule: Schedule;
    range: GoogleAppsScript.Spreadsheet.Range;
    offset: number;
    values: any[];
    formulas: any[];
    rowNum: number;

    constructor(schedule: Schedule, range: GoogleAppsScript.Spreadsheet.Range, offset: number, values: any[], formulas: any[]);

    /**
     * Gets the start date for the row.
     */
    get StartDate(): Date;

    /**
     * Gets the start time for the row.
     */
    get StartTime(): Date;

    /**
     * Gets the end time for the row.
     */
    get EndTime(): Date;

    /**
     * Gets the group for the row.
     */
    get Group(): string;

    /**
     * Gets the route name for the row.
     */
    get RouteName(): string;

    /**
     * Gets the route URL for the row.
     */
    get RouteURL(): string;

    /**
     * Gets the ride leaders for the row.
     */
    get RideLeaders(): string[];

    /**
     * Gets the ride name for the row.
     */
    get RideName(): string;

    /**
     * Gets the ride URL for the row.
     */
    get RideURL(): string;

    /**
     * Gets the Google Event ID for the row.
     */
    get GoogleEventId(): string;

    /**
     * Sets the Google Event ID for the row.
     */
    set GoogleEventId(id: string);

    /**
     * Gets the location for the row.
     */
    get Location(): string;

    /**
     * Gets the address for the row.
     */
    get Address(): string;

    /**
     * Highlights the ride leader cell.
     * @param onoff Whether to highlight (true) or unhighlight (false).
     * @returns The Row object.
     */
    highlightRideLeader(onoff: boolean): Row;

    /**
     * Sets the ride link formula.
     * @param name The name for the ride link.
     * @param url The URL for the ride link.
     */
    setRideLink(name: string, url: string): void;

    /**
     * Deletes the ride link formula.
     */
    deleteRideLink(): void;

    /**
     * Sets the route link formula.
     * @param name The name for the route link.
     * @param url The URL for the route link.
     */
    setRouteLink(name: string, url: string): void;

    /**
     * Resolves and links the route name and URL.
     * @returns The Row object.
     */
    linkRouteURL(): Row;

    /**
     * Restores the ride link formula.
     */
    restoreRideLink(): void;

    /**
     * Determines if the schedule row is planned.
     * @returns True if all required properties are present; otherwise, false.
     */
    isPlanned(): boolean;

    /**
     * Determines if the ride is scheduled.
     * @returns True if the ride has a name, otherwise false.
     */
    isScheduled(): boolean;
}