/**
 * RetryQueueCore - Pure JavaScript retry logic with no GAS dependencies
 * 
 * Type definitions for queue operations, retry logic, and statistics.
 * All functions are static methods on the RetryQueueCore class.
 */

/**
 * Queue item representing a failed operation awaiting retry
 */
export interface QueueItem {
    /** Unique identifier for this queue item */
    id: string;
    /** Operation type */
    type: 'create' | 'update' | 'delete';
    /** Calendar ID where operation should execute */
    calendarId: string;
    /** Stable ride URL identifier */
    rideUrl: string;
    /** Ride title for display in notifications */
    rideTitle?: string;
    /** Row number in spreadsheet for display in notifications */
    rowNum?: number | string;
    /** User email address for notifications */
    userEmail: string;
    /** Operation-specific parameters */
    params: OperationParams;
    /** Timestamp when item was first enqueued */
    enqueuedAt: number;
    /** Timestamp when next retry should occur */
    nextRetryAt: number;
    /** Number of retry attempts made */
    attemptCount: number;
    /** Last error message (null if no failure yet) */
    lastError: string | null;
}

/**
 * Parameters for calendar operations
 */
export interface OperationParams {
    /** Event title */
    title: string;
    /** Start time timestamp */
    startTime: number;
    /** End time timestamp */
    endTime: number;
    /** Location string */
    location?: string;
    /** Event description */
    description?: string;
    /** Event ID (for update/delete operations) */
    eventId?: string;
}

/**
 * Basic operation structure before queue item creation
 */
export interface Operation {
    type: 'create' | 'update' | 'delete';
    calendarId: string;
    rideUrl: string;
    rideTitle?: string;
    rowNum?: number | string;
    userEmail: string;
    params: OperationParams;
}

/**
 * Result of updating a queue item after failure
 */
export interface UpdateResult {
    /** True if should retry again, false if max retries exceeded */
    shouldRetry: boolean;
    /** Updated queue item with new retry time and attempt count */
    updatedItem: QueueItem;
}

/**
 * Queue statistics
 */
export interface QueueStatistics {
    /** Total number of items in queue */
    totalItems: number;
    /** Number of items due for retry now */
    dueNow: number;
    /** Breakdown by age */
    byAge: {
        /** Items enqueued less than 1 hour ago */
        lessThan1Hour: number;
        /** Items enqueued less than 24 hours ago */
        lessThan24Hours: number;
        /** Items enqueued more than 24 hours ago */
        moreThan24Hours: number;
    };
}

/**
 * Formatted queue item for display/logging
 */
export interface FormattedItem {
    id: string;
    type: string;
    rideUrl: string;
    rideTitle: string;
    rowNum: number | string;
    userEmail: string;
    enqueuedAt: string;
    nextRetryAt: string;
    attemptCount: number;
    lastError: string | null;
}

/**
 * Core retry queue logic - pure JavaScript, no GAS dependencies
 */
declare class RetryQueueCore {
    /**
     * Create a new queue item
     * @param operation - Operation details
     * @param generateId - Function to generate unique ID (e.g., Utilities.getUuid)
     * @param getCurrentTime - Function to get current timestamp (e.g., () => new Date().getTime())
     * @returns Queue item ready for storage
     */
    static createQueueItem(
        operation: Operation,
        generateId: () => string,
        getCurrentTime: () => number
    ): QueueItem;

    /**
     * Calculate next retry time based on attempt count and age
     * 
     * Retry Strategy:
     * - First hour: Every 5 minutes
     * - Next 47 hours: Every hour
     * - After 48 hours: null (give up)
     * 
     * @param attemptCount - Current attempt count
     * @param enqueuedAt - Original enqueue timestamp
     * @param currentTime - Current timestamp
     * @returns Timestamp for next retry, or null if max retries exceeded
     */
    static calculateNextRetry(
        attemptCount: number,
        enqueuedAt: number,
        currentTime: number
    ): number | null;

    /**
     * Filter queue items that are due for retry
     * @param queue - Array of queue items
     * @param currentTime - Current timestamp
     * @returns Items where nextRetryAt <= currentTime
     */
    static getDueItems(queue: QueueItem[], currentTime: number): QueueItem[];

    /**
     * Update queue item after failed retry
     * @param item - Queue item that failed
     * @param error - Error message
     * @param currentTime - Current timestamp
     * @returns Object indicating whether to retry and the updated item
     */
    static updateAfterFailure(
        item: QueueItem,
        error: string,
        currentTime: number
    ): UpdateResult;

    /**
     * Remove an item from queue by ID
     * @param queue - Queue array
     * @param id - Item ID to remove
     * @returns New queue array without the removed item
     */
    static removeItem(queue: QueueItem[], id: string): QueueItem[];

    /**
     * Update an item in queue
     * @param queue - Queue array
     * @param updatedItem - Updated item
     * @returns New queue array with updated item
     */
    static updateItem(queue: QueueItem[], updatedItem: QueueItem): QueueItem[];

    /**
     * Calculate queue statistics
     * @param queue - Queue array
     * @param currentTime - Current timestamp
     * @returns Statistics about queue state
     */
    static getStatistics(queue: QueueItem[], currentTime: number): QueueStatistics;

    /**
     * Format queue items for display/logging
     * @param queue - Queue array
     * @returns Formatted items with human-readable timestamps
     */
    static formatItems(queue: QueueItem[]): FormattedItem[];
}

export default RetryQueueCore;
