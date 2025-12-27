/**
 * ScheduleAdapter - GAS-specific adapter for reading/writing schedule data
 * 
 * Type definitions for schedule data operations.
 * This adapter separates GAS dependencies from pure JavaScript business logic.
 */

import Row from './Row';

/**
 * Adapter for schedule spreadsheet operations
 * 
 * Handles:
 * - Reading spreadsheet data via Fiddler
 * - Converting to/from Row domain objects  
 * - Formula preservation (Route and Ride columns)
 * - Selection handling
 * - Batch saves with dirty row tracking
 */
declare class ScheduleAdapter {
    /** Name of the spreadsheet sheet */
    readonly sheetName: string;
    /** Google Sheets Sheet object */
    private sheet: GoogleAppsScript.Spreadsheet.Sheet;
    /** Fiddler instance for data I/O */
    private fiddler: any;
    /** Column names from header row */
    private columnNames: string[];
    /** Set of rows that need saving */
    private dirtyRows: Set<Row>;
    /** Cached spreadsheet data */
    private _cachedData: Array<Record<string, any>> | null;

    /**
     * Creates a new ScheduleAdapter
     * @param sheetName - Name of the sheet to manage (default: 'Consolidated Rides')
     * @throws Error if sheet is not found
     */
    constructor(sheetName?: string);

    // ===== PUBLIC DATA LOADING METHODS =====

    /**
     * Load all data from the spreadsheet (with caching)
     * @returns Array of Row instances for all rows
     */
    loadAll(): Row[];

    /**
     * Load selected rows from the spreadsheet (with caching)
     * Uses the current spreadsheet selection
     * @returns Array of selected Row instances
     */
    loadSelected(): Row[];

    /**
     * Load rows younger than (after) the specified date (with caching)
     * @param date - The cutoff date
     * @returns Array of Row instances after the date
     */
    loadYoungerRows(date: Date): Row[];

    /**
     * Load the last row in the spreadsheet (with caching)
     * @returns The last Row instance or null if no data
     */
    loadLastRow(): Row | null;

    // ===== PUBLIC SAVE METHOD =====

    /**
     * Save dirty rows back to the spreadsheet
     * 
     * Only writes the specific dirty cells to preserve meaningful version history.
     * For each dirty row, only the modified fields are written to the spreadsheet.
     * This ensures version tracking shows exactly what changed, not all rows.
     * 
     * CRITICAL: Formulas in Route/Ride columns are handled specially:
     * - If a formula column is dirty, we write the formula (not the value)
     * - After write, formulas are stored in PropertiesService for next load
     * 
     * Clears cache after save to force reload on next operation.
     */
    save(): void;

    // ===== PUBLIC UTILITY METHODS =====

    /**
     * Highlight a cell in the spreadsheet
     * @param rowNum - The row number (1-based)
     * @param columnName - The column name
     * @param highlight - True to highlight (red), false to clear
     */
    highlightCell(rowNum: number, columnName: string, highlight: boolean): void;

    /**
     * Delete/clear a ride link cell
     * @param rowNum - The row number (1-based)
     */
    deleteRideLink(rowNum: number): void;

    /**
     * Store all formulas (Route and Ride columns)
     * Called on spreadsheet open to preserve formulas
     */
    storeFormulas(): void;

    /**
     * Store Route column formulas only
     */
    storeRouteFormulas(): void;

    /**
     * Check if a column number matches a column name
     * @param columnName - Column name to check
     * @param columnNum - Column number (1-based)
     * @returns True if the column matches
     */
    isColumn(columnName: string, columnNum: number): boolean;

    /**
     * Get the sheet name
     * @returns Sheet name
     */
    getSheetName(): string;

    /**
     * Get the underlying sheet object
     * @returns Google Sheets Sheet object
     */
    getSheet(): GoogleAppsScript.Spreadsheet.Sheet;

    /**
     * Restore a formula for a specific row and column
     * @param rowNum - Spreadsheet row number (1-based)
     * @param columnName - Either 'Ride' or 'Route'
     */
    restoreFormula(rowNum: number, columnName: string): void;

    // ===== PRIVATE METHODS =====

    /**
     * Ensure data is loaded and cached
     * Overlays stored formulas onto the data so Route and Ride columns
     * contain formula strings instead of displayed values
     * @private
     */
    _ensureDataLoaded(): void;

    /**
     * Overlay stored formulas onto cached data
     * @private
     */
    _overlayFormulas(): void;

    /**
     * Load formulas from document properties
     * @private
     * @param propertyName - Property name ('rideColumnFormulas' or 'routeColumnFormulas')
     * @returns 2D array of formulas or null if not found
     */
    _loadFormulas(propertyName: string): string[][] | null;

    /**
     * Create a Row instance from Fiddler data
     * @private
     * @param data - Raw row data from Fiddler
     * @param rowNum - Spreadsheet row number (1-based)
     * @returns Row instance
     */
    _createRow(data: Record<string, any>, rowNum: number): Row;

    /**
     * Mark a row as dirty (needs saving)
     * Called by Row instances when they're modified
     * @private
     * @param row - The row to mark as dirty
     */
    _markRowDirty(row: Row): void;

    /**
     * Get the column index for a column name
     * @private
     * @param name - Column name
     * @returns Zero-based column index
     * @throws Error if column name is not found
     */
    _getColumnIndex(name: string): number;

    /**
     * Convert cell ranges to full row ranges
     * @private
     */
    _convertCellRangesToRowRanges(
        cellRangeList: GoogleAppsScript.Spreadsheet.RangeList
    ): GoogleAppsScript.Spreadsheet.Range[];

    /**
     * Store Route and Ride column formulas in document properties
     * @private
     */
    _storeFormulas(): void;

    /**
     * Store Ride column formulas
     * @private
     */
    _storeRideFormulas(): void;

    /**
     * Store Route column formulas
     * @private
     */
    _storeRouteFormulas(): void;

    /**
     * Get a range for a specific column
     * @private
     * @param columnName - Column name
     * @param rowNum - Starting row number (1-based, default: 2)
     * @param numRows - Number of rows (0 = to end of sheet, default: 0)
     * @returns Range object
     */
    _getColumnRange(columnName: string, rowNum?: number, numRows?: number): GoogleAppsScript.Spreadsheet.Range;
}

export default ScheduleAdapter;
