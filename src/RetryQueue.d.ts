/**
 * RetryQueue - GAS adapter for RetryQueueCore
 * 
 * Type definitions for GAS-specific retry queue operations.
 * This is a thin wrapper around RetryQueueCore that handles GAS APIs.
 */

import { QueueItem, Operation, QueueStatistics, FormattedItem } from './RetryQueueCore';

/**
 * Result of processing the queue
 */
export interface ProcessResult {
    /** Number of items processed */
    processed: number;
    /** Number that succeeded */
    succeeded: number;
    /** Number that failed permanently */
    failed: number;
    /** Number remaining in queue */
    remaining: number;
}

/**
 * Result of executing a calendar operation
 */
export interface ExecutionResult {
    /** True if operation succeeded */
    success: boolean;
    /** Error message if failed, undefined if succeeded */
    error?: string;
    /** Event ID if operation succeeded */
    eventId?: string;
}

/**
 * Queue status for display
 */
export interface QueueStatus {
    /** Number of items in queue */
    itemCount: number;
    /** Array of formatted queue items */
    items: FormattedItem[];
    /** Statistics about queue state */
    statistics: QueueStatistics;
}

/**
 * GAS adapter for retry queue - handles PropertiesService, CalendarApp, MailApp
 */
declare class RetryQueue {
    /** PropertiesService instance */
    private props: GoogleAppsScript.Properties.Properties;
    /** Key for storing queue in PropertiesService */
    private readonly QUEUE_KEY: string;
    /** Key for storing trigger ID in PropertiesService */
    private readonly TRIGGER_KEY: string;

    constructor();

    /**
     * Add a failed calendar operation to the retry queue
     * 
     * @param operation - Operation details including type, calendarId, rideUrl, params, userEmail
     * @returns Queue item ID
     * 
     * @example
     * ```javascript
     * const retryQueue = new RetryQueue();
     * const id = retryQueue.enqueue({
     *   type: 'create',
     *   calendarId: 'calendar@example.com',
     *   rideUrl: 'https://ridewithgps.com/routes/12345',
     *   rideTitle: 'Saturday Morning Ride',
     *   rowNum: 42,
     *   userEmail: 'user@example.com',
     *   params: {
     *     title: 'Saturday Morning Ride',
     *     startTime: new Date('2025-01-15T09:00:00').getTime(),
     *     endTime: new Date('2025-01-15T12:00:00').getTime(),
     *     location: 'Start Location',
     *     description: 'Ride description'
     *   }
     * });
     * ```
     */
    enqueue(operation: Operation): string;

    /**
     * Process all due retry operations
     * Called by time-based trigger
     * 
     * @returns Processing results
     */
    processQueue(): ProcessResult;

    /**
     * Get queue status for display
     * 
     * @returns Queue status with items and statistics
     */
    getStatus(): QueueStatus;

    /**
     * Clear all items from the queue
     * Used for testing or manual cleanup
     */
    clear(): void;

    /**
     * Get raw queue data (internal use)
     * @private
     */
    _getQueue(): QueueItem[];

    /**
     * Save queue data (internal use)
     * @private
     */
    _saveQueue(queue: QueueItem[]): void;

    /**
     * Execute a calendar operation (internal use)
     * @private
     */
    _executeOperation(item: QueueItem): ExecutionResult;

    /**
     * Ensure retry trigger exists (internal use)
     * @private
     */
    _ensureTriggerExists(): void;

    /**
     * Remove retry trigger (internal use)
     * @private
     */
    _removeTrigger(): void;

    /**
     * Notify user of successful retry (internal use)
     * @private
     */
    _notifySuccess(item: QueueItem): void;

    /**
     * Notify user of permanent failure (internal use)
     * @private
     */
    _notifyFailure(item: QueueItem): void;
}

export default RetryQueue;
