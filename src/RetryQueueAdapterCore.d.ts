/**
 * RetryQueueAdapterCore - Pure JavaScript retry queue spreadsheet adapter logic
 */
declare class RetryQueueAdapterCore {
    /**
     * Get column names for the retry queue spreadsheet
     */
    static getColumnNames(): string[];

    /**
     * Convert queue item to spreadsheet row object
     */
    static itemToRow(item: any): any;

    /**
     * Convert spreadsheet row object to queue item
     */
    static rowToItem(row: any): any;

    /**
     * Convert array of queue items to array of row objects
     */
    static itemsToRows(items: any[]): any[];

    /**
     * Convert array of row objects to array of queue items
     */
    static rowsToItems(rows: any[]): any[];

    /**
     * Find index of item in rows array by ID
     */
    static findIndexById(rows: any[], id: string): number;

    /**
     * Update a row in the rows array
     */
    static updateRow(rows: any[], updatedItem: any): any[];

    /**
     * Remove a row from the rows array by ID
     */
    static removeRow(rows: any[], id: string): any[];

    /**
     * Add a new row to the rows array
     */
    static addRow(rows: any[], newItem: any): any[];

    /**
     * Validate row object has all required fields
     */
    static validateRow(row: any): { valid: boolean; errors: string[] };

    /**
     * Sort rows by next retry time (soonest first)
     */
    static sortByNextRetry(rows: any[]): any[];

    /**
     * Filter rows by status
     */
    static filterByStatus(rows: any[], status: string): any[];

    /**
     * Get summary statistics from rows
     */
    static getStatistics(rows: any[]): {
        total: number;
        pending: number;
        retrying: number;
        failed: number;
        byType: {
            create: number;
            update: number;
            delete: number;
        };
    };
}
