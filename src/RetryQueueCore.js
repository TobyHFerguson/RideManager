/**
 * RetryQueueCore - Pure JavaScript retry logic with no GAS dependencies
 * 
 * Retry Strategy:
 * - First hour: Every 5 minutes (12 attempts)
 * - Next 47 hours: Every hour (47 attempts)
 * - Total: Up to 48 hours of retries
 * 
 * This module contains only pure JavaScript and can be tested in Jest.
 */

// Node.js compatibility
if (typeof require !== 'undefined') {
    // No dependencies needed - pure JavaScript
}

var RetryQueueCore = (function() {
    
    class RetryQueueCore {
        /**
         * Create a new queue item
         * @param {Object} operation - Operation details
         * @param {function} generateId - Function to generate unique ID
         * @param {function} getCurrentTime - Function to get current timestamp
         * @returns {Object} Queue item
         */
        static createQueueItem(operation, generateId, getCurrentTime) {
            const now = getCurrentTime();
            
            return {
                id: generateId(),
                ...operation,
                enqueuedAt: now,
                nextRetryAt: now + (5 * 60 * 1000), // First retry in 5 minutes
                attemptCount: 0,
                lastError: null
            };
        }

        /**
         * Calculate next retry time based on attempt count
         * @param {number} attemptCount - Current attempt count
         * @param {number} enqueuedAt - Original enqueue timestamp
         * @param {number} currentTime - Current timestamp
         * @returns {number|null} Timestamp for next retry, or null if max retries exceeded
         */
        static calculateNextRetry(attemptCount, enqueuedAt, currentTime) {
            const ageHours = (currentTime - enqueuedAt) / (60 * 60 * 1000);
            
            // After 48 hours, give up
            if (ageHours >= 48) {
                return null;
            }
            
            // First hour: retry every 5 minutes
            if (ageHours < 1) {
                return currentTime + (5 * 60 * 1000);
            }
            
            // After first hour: retry every hour
            return currentTime + (60 * 60 * 1000);
        }

        /**
         * Filter queue items that are due for retry
         * @param {Array} queue - Array of queue items
         * @param {number} currentTime - Current timestamp
         * @returns {Array} Items due for retry
         */
        static getDueItems(queue, currentTime) {
            return queue.filter(item => item.nextRetryAt <= currentTime);
        }

        /**
         * Update queue item after failed retry
         * @param {Object} item - Queue item
         * @param {string} error - Error message
         * @param {number} currentTime - Current timestamp
         * @returns {Object} { shouldRetry: boolean, updatedItem: Object }
         */
        static updateAfterFailure(item, error, currentTime) {
            const updatedItem = {
                ...item,
                attemptCount: item.attemptCount + 1,
                lastError: error
            };
            
            const nextRetry = this.calculateNextRetry(
                updatedItem.attemptCount,
                item.enqueuedAt,
                currentTime
            );
            
            if (nextRetry) {
                updatedItem.nextRetryAt = nextRetry;
                return { shouldRetry: true, updatedItem };
            } else {
                // Max retries exceeded
                return { shouldRetry: false, updatedItem };
            }
        }

        /**
         * Remove an item from queue by ID
         * @param {Array} queue - Queue array
         * @param {string} id - Item ID to remove
         * @returns {Array} New queue array
         */
        static removeItem(queue, id) {
            return queue.filter(item => item.id !== id);
        }

        /**
         * Update an item in queue
         * @param {Array} queue - Queue array
         * @param {Object} updatedItem - Updated item
         * @returns {Array} New queue array
         */
        static updateItem(queue, updatedItem) {
            const index = queue.findIndex(item => item.id === updatedItem.id);
            if (index === -1) {
                return queue; // Item not found
            }
            
            const newQueue = [...queue];
            newQueue[index] = updatedItem;
            return newQueue;
        }

        /**
         * Calculate queue statistics
         * @param {Array} queue - Queue array
         * @param {number} currentTime - Current timestamp
         * @returns {Object} Queue statistics
         */
        static getStatistics(queue, currentTime) {
            return {
                totalItems: queue.length,
                dueNow: queue.filter(item => item.nextRetryAt <= currentTime).length,
                byAge: {
                    lessThan1Hour: queue.filter(item => 
                        (currentTime - item.enqueuedAt) < 60 * 60 * 1000
                    ).length,
                    lessThan24Hours: queue.filter(item => 
                        (currentTime - item.enqueuedAt) < 24 * 60 * 60 * 1000
                    ).length,
                    moreThan24Hours: queue.filter(item => 
                        (currentTime - item.enqueuedAt) >= 24 * 60 * 60 * 1000
                    ).length
                }
            };
        }

        /**
         * Format queue items for display
         * @param {Array} queue - Queue array
         * @param {number} currentTime - Current timestamp
         * @returns {Array} Formatted items
         */
        static formatItems(queue, currentTime) {
            return queue.map(item => ({
                id: item.id,
                rideUrl: item.rideUrl,
                rideTitle: item.rideTitle || 'Unknown',
                rowNum: item.rowNum || 'Unknown',
                userEmail: item.userEmail,
                attemptCount: item.attemptCount,
                enqueuedAt: new Date(item.enqueuedAt).toISOString(),
                nextRetryAt: new Date(item.nextRetryAt).toISOString(),
                ageMinutes: Math.floor((currentTime - item.enqueuedAt) / 60000)
            }));
        }
    }

    return RetryQueueCore;
})();

// Export for Node.js testing
if (typeof module !== 'undefined') {
    module.exports = RetryQueueCore;
}
