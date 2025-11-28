// AnnouncementCore.js - Pure JavaScript business logic for ride announcement management
// This module is fully testable in Jest (no GAS dependencies)

/**
 * Core logic for managing ride announcements
 * - Queue management for pending announcements
 * - Template expansion calculations
 * - Send time calculations
 * - Retry logic with exponential backoff
 * - Statistics and formatting
 */
var AnnouncementCore = (function() {
    'use strict';

    /**
     * Calculate the send time for a ride announcement
     * Send at 6:00 PM, 2 calendar days before the ride date
     * 
     * @param {Date|string} rideDate - The date/time of the ride
     * @param {string} [timezone='America/Los_Angeles'] - Timezone for calculation
     * @returns {Date} The scheduled send time
     */
    function calculateSendTime(rideDate, timezone = 'America/Los_Angeles') {
        const ride = new Date(rideDate);
        
        // Create a date 2 days before the ride
        const sendDate = new Date(ride);
        sendDate.setDate(sendDate.getDate() - 2);
        
        // Set time to 6:00 PM (18:00) in the specified timezone
        // Note: This creates a date object with 18:00 in local time
        // The GAS adapter will handle timezone conversion using Session.getScriptTimeZone()
        sendDate.setHours(18, 0, 0, 0);
        
        return sendDate;
    }

    /**
     * Create a new announcement queue item
     * 
     * @param {string} rideURL - Unique identifier for the ride (from RWGPS)
     * @param {string} documentId - Google Doc ID of the announcement template
     * @param {Date|string} sendTime - When to send the announcement
     * @param {string} rsEmail - Email of ride scheduler who created it
     * @param {number} rowNum - Row number in spreadsheet (for display)
     * @param {string} rideName - Ride name (for display)
     * @param {Function} generateId - Function to generate unique ID
     * @param {Function} getCurrentTime - Function to get current timestamp
     * @returns {Object} Queue item
     */
    function createQueueItem(rideURL, documentId, sendTime, rsEmail, rowNum, rideName, generateId, getCurrentTime) {
        const now = getCurrentTime();
        const send = new Date(sendTime).getTime();
        
        return {
            id: generateId(),
            rideURL: rideURL,
            documentId: documentId,
            sendTime: send,
            rsEmail: rsEmail,
            rowNum: rowNum,
            rideName: rideName,
            status: 'pending',
            createdAt: now,
            attemptCount: 0,
            lastError: null,
            reminderSent: false
        };
    }

    /**
     * Calculate next retry time using exponential backoff
     * Retry intervals: 5min, 15min, 30min, 1hr, 2hr, 4hr, 8hr
     * Max retry window: 24 hours from creation
     * 
     * @param {number} attemptCount - Number of failed attempts
     * @param {number} createdAt - Timestamp when item was created
     * @param {number} currentTime - Current timestamp
     * @returns {number|null} Next retry time in ms, or null if should stop retrying
     */
    function calculateNextRetry(attemptCount, createdAt, currentTime) {
        const ageMs = currentTime - createdAt;
        const ageHours = ageMs / (60 * 60 * 1000);
        
        // Stop retrying after 24 hours
        if (ageHours >= 24) {
            return null;
        }
        
        // Exponential backoff intervals in milliseconds
        const intervals = [
            5 * 60 * 1000,      // 5 minutes
            15 * 60 * 1000,     // 15 minutes
            30 * 60 * 1000,     // 30 minutes
            60 * 60 * 1000,     // 1 hour
            2 * 60 * 60 * 1000, // 2 hours
            4 * 60 * 60 * 1000, // 4 hours
            8 * 60 * 60 * 1000  // 8 hours
        ];
        
        const intervalIndex = Math.min(attemptCount, intervals.length - 1);
        const retryInterval = intervals[intervalIndex];
        
        return currentTime + retryInterval;
    }

    /**
     * Get items from queue that are due for sending or reminder
     * 
     * @param {Array} queue - Array of queue items
     * @param {number} currentTime - Current timestamp
     * @returns {Object} Object with dueToSend and dueForReminder arrays
     */
    function getDueItems(queue, currentTime) {
        const dueToSend = [];
        const dueForReminder = [];
        const reminderWindow = 24 * 60 * 60 * 1000; // 24 hours in ms
        
        queue.forEach(item => {
            if (item.status === 'pending') {
                const timeDiff = item.sendTime - currentTime;
                
                // Due to send (within 1 hour window to account for hourly trigger)
                if (timeDiff <= 60 * 60 * 1000) {
                    dueToSend.push(item);
                }
                // Due for 24-hour reminder (within 1 hour of 24 hours before send)
                else if (!item.reminderSent && 
                         timeDiff >= reminderWindow - (60 * 60 * 1000) && 
                         timeDiff <= reminderWindow + (60 * 60 * 1000)) {
                    dueForReminder.push(item);
                }
            }
            // Failed items that are ready for retry
            else if (item.status === 'failed' && item.nextRetry && item.nextRetry <= currentTime) {
                dueToSend.push(item);
            }
        });
        
        return { dueToSend, dueForReminder };
    }

    /**
     * Update queue item after a failure
     * 
     * @param {Object} item - Queue item
     * @param {string} error - Error message
     * @param {number} currentTime - Current timestamp
     * @returns {Object} Updated item
     */
    function updateAfterFailure(item, error, currentTime) {
        const newAttemptCount = item.attemptCount + 1;
        const nextRetry = calculateNextRetry(newAttemptCount, item.createdAt, currentTime);
        
        return {
            ...item,
            status: nextRetry ? 'failed' : 'abandoned',
            attemptCount: newAttemptCount,
            lastError: error,
            nextRetry: nextRetry,
            lastAttemptAt: currentTime
        };
    }

    /**
     * Mark item as successfully sent
     * 
     * @param {Object} item - Queue item
     * @param {number} currentTime - Current timestamp
     * @returns {Object} Updated item
     */
    function markAsSent(item, currentTime) {
        return {
            ...item,
            status: 'sent',
            sentAt: currentTime
        };
    }

    /**
     * Mark item as reminder sent
     * 
     * @param {Object} item - Queue item
     * @param {number} currentTime - Current timestamp
     * @returns {Object} Updated item
     */
    function markReminderSent(item, currentTime) {
        return {
            ...item,
            reminderSent: true,
            reminderSentAt: currentTime
        };
    }

    /**
     * Remove item from queue by ID
     * 
     * @param {Array} queue - Array of queue items
     * @param {string} id - Item ID to remove
     * @returns {Array} New queue without the item
     */
    function removeItem(queue, id) {
        return queue.filter(item => item.id !== id);
    }

    /**
     * Update an item in the queue
     * 
     * @param {Array} queue - Array of queue items
     * @param {string} id - Item ID to update
     * @param {Object} updates - Properties to update
     * @returns {Array} New queue with updated item
     */
    function updateItem(queue, id, updates) {
        return queue.map(item => 
            item.id === id ? { ...item, ...updates } : item
        );
    }

    /**
     * Get statistics about the queue
     * 
     * @param {Array} queue - Array of queue items
     * @returns {Object} Statistics object
     */
    function getStatistics(queue) {
        const stats = {
            total: queue.length,
            pending: 0,
            failed: 0,
            sent: 0,
            abandoned: 0
        };
        
        queue.forEach(item => {
            if (stats.hasOwnProperty(item.status)) {
                stats[item.status]++;
            }
        });
        
        return stats;
    }

    /**
     * Format queue items for display
     * 
     * @param {Array} queue - Array of queue items
     * @param {number} currentTime - Current timestamp for age calculation
     * @returns {Array} Formatted items
     */
    function formatItems(queue, currentTime) {
        return queue.map(item => {
            const sendDate = new Date(item.sendTime);
            const ageMs = currentTime - item.createdAt;
            const ageHours = Math.floor(ageMs / (60 * 60 * 1000));
            
            return {
                id: item.id,
                rideName: item.rideName || 'Unknown Ride',
                rowNum: item.rowNum || '?',
                sendTime: sendDate.toLocaleString(),
                status: item.status,
                rsEmail: item.rsEmail,
                documentId: item.documentId,
                ageHours: ageHours,
                attemptCount: item.attemptCount,
                lastError: item.lastError
            };
        });
    }

    /**
     * Expand template string with row data
     * Missing/null fields are returned as {FieldName} for highlighting
     * 
     * @param {string} template - Template string with {FieldName} placeholders
     * @param {Object} rowData - Object with field names as keys
     * @returns {Object} Object with expandedText and missingFields array
     */
    function expandTemplate(template, rowData) {
        const missingFields = [];
        
        const expandedText = template.replace(/{([^}]+)}/g, (match, fieldName) => {
            const value = rowData[fieldName];
            
            if (value === null || value === undefined || value === '') {
                missingFields.push(fieldName);
                return match; // Return {FieldName} unchanged for highlighting
            }
            
            return value;
        });
        
        return {
            expandedText,
            missingFields
        };
    }

    /**
     * Extract subject line from template
     * Looks for "Subject: {text}" at start of document
     * 
     * @param {string} template - Template text
     * @returns {Object} Object with subject and body
     */
    function extractSubject(template) {
        const subjectMatch = template.match(/^Subject:\s*(.+?)$/m);
        
        if (subjectMatch) {
            const subject = subjectMatch[1].trim();
            const body = template.replace(/^Subject:\s*.+?(\r?\n|$)/, '').trim();
            return { subject, body };
        }
        
        return { subject: null, body: template };
    }

    // Public API
    return {
        calculateSendTime,
        createQueueItem,
        calculateNextRetry,
        getDueItems,
        updateAfterFailure,
        markAsSent,
        markReminderSent,
        removeItem,
        updateItem,
        getStatistics,
        formatItems,
        expandTemplate,
        extractSubject
    };
})();

// Export for Node.js/Jest
if (typeof module !== 'undefined') {
    module.exports = AnnouncementCore;
}
