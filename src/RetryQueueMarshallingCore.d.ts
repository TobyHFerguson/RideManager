/**
 * RetryQueueMarshallingCore - Pure JavaScript data marshalling for retry queue
 * 
 * This module handles conversion between queue item objects and SpreadsheetApp 2D arrays.
 */

declare class RetryQueueMarshallingCore {
    /**
     * Convert queue item to 2D array row for SpreadsheetApp
     * @param item - Queue item
     * @returns Row array [QueueID, Operation, Params, RideURL, EnqueuedAt, AttemptCount, NextRetryAt]
     */
    static itemToRow(item: any): any[];

    /**
     * Convert 2D array row to queue item
     * @param row - Row array from SpreadsheetApp.getValues()
     * @returns Queue item
     */
    static rowToItem(row: any[]): any;

    /**
     * Convert array of queue items to 2D array for SpreadsheetApp
     * @param items - Array of queue items
     * @returns 2D array of rows
     */
    static itemsToRows(items: any[]): any[][];

    /**
     * Convert 2D array to array of queue items
     * @param rows - 2D array from SpreadsheetApp.getValues()
     * @returns Array of queue items
     */
    static rowsToItems(rows: any[][]): any[];

    /**
     * Get column names for spreadsheet headers
     * @returns Column names
     */
    static getColumnNames(): string[];

    /**
     * Get column count
     * @returns Number of columns
     */
    static getColumnCount(): number;
}
