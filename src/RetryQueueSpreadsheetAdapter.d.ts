/**
 * RetryQueueSpreadsheetAdapter - GAS adapter for retry queue spreadsheet I/O
 */
declare class RetryQueueSpreadsheetAdapter {
    /**
     * Creates a new RetryQueueSpreadsheetAdapter
     */
    constructor(sheetName?: string);

    /**
     * Load all queue items from the spreadsheet
     */
    loadAll(): any[];

    /**
     * Save queue items back to the spreadsheet
     */
    save(items: any[]): void;

    /**
     * Add a new item to the queue
     */
    enqueue(item: any): void;

    /**
     * Update an existing item in the queue
     */
    update(updatedItem: any): void;

    /**
     * Remove an item from the queue by ID
     */
    remove(id: string): void;

    /**
     * Find an item by ID
     */
    findById(id: string): any | null;

    /**
     * Get queue statistics
     */
    getStatistics(): {
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

    /**
     * Clear the entire queue
     */
    clear(): void;

    /**
     * Get the sheet name
     */
    getSheetName(): string;

    /**
     * Get the underlying sheet object
     */
    getSheet(): GoogleAppsScript.Spreadsheet.Sheet;
}
