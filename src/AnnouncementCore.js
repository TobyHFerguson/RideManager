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
     * Max retry window: 24 hours from scheduled send time
     * 
     * @param {number} attemptCount - Number of failed attempts
     * @param {number} sendTime - Scheduled send time timestamp
     * @param {number} lastAttemptTime - Last attempt time timestamp
     * @returns {number|null} Next retry time in ms, or null if should stop retrying
     */
    function calculateNextRetry(attemptCount, sendTime, lastAttemptTime) {
        const timeSinceSend = lastAttemptTime - sendTime;
        const hoursSinceSend = timeSinceSend / (60 * 60 * 1000);
        
        // Stop retrying after 24 hours from scheduled send time
        if (hoursSinceSend >= 24) {
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
        
        return lastAttemptTime + retryInterval;
    }

    /**
     * Get rows from spreadsheet that are due for sending or reminder
     * 
     * @param {Array} rows - Array of Row objects from spreadsheet
     * @param {number} currentTime - Current timestamp
     * @returns {Object} Object with dueToSend and dueForReminder arrays
     */
    function getDueItems(rows, currentTime) {
        const dueToSend = [];
        const dueForReminder = [];
        const reminderWindow = 24 * 60 * 60 * 1000; // 24 hours in ms
        
        rows.forEach(row => {
            // Skip rows without announcement data
            if (!row.Announcement || !row.SendAt) {
                return;
            }
            
            const sendTime = new Date(row.SendAt).getTime();
            const status = row.Status || 'pending';
            const attempts = row.Attempts || 0;
            
            if (status === 'pending') {
                const timeDiff = sendTime - currentTime;
                
                // Due to send (within 1 hour window OR past due)
                if (timeDiff <= 60 * 60 * 1000) {
                    dueToSend.push(row);
                }
                // Due for 24-hour reminder (within 1 hour of 24 hours before send)
                else if (timeDiff >= reminderWindow - (60 * 60 * 1000) && 
                         timeDiff <= reminderWindow + (60 * 60 * 1000)) {
                    dueForReminder.push(row);
                }
            }
            // Failed items that are ready for retry
            else if (status === 'failed') {
                const lastAttemptAt = row.LastAttemptAt ? row.LastAttemptAt.getTime() : sendTime;
                const nextRetry = calculateNextRetry(attempts, sendTime, lastAttemptAt);
                if (nextRetry && nextRetry <= currentTime) {
                    dueToSend.push(row);
                }
            }
        });
        
        return { dueToSend, dueForReminder };
    }

    /**
     * Calculate updated values after a failure
     * Returns an object with status, attempts, and lastError to update on the row
     * 
     * @param {number} attempts - Current attempt count
     * @param {number} sendTime - Scheduled send time
     * @param {string} error - Error message
     * @param {number} currentTime - Current timestamp
     * @returns {Object} Object with status, attempts, lastError
     */
    function calculateFailureUpdate(attempts, sendTime, error, currentTime) {
        const newAttemptCount = attempts + 1;
        const nextRetry = calculateNextRetry(newAttemptCount, sendTime, currentTime);
        
        return {
            status: nextRetry ? 'failed' : 'abandoned',
            attempts: newAttemptCount,
            lastError: error
        };
    }

    /**
     * Get statistics about announcements from rows
     * 
     * @param {Array} rows - Array of Row objects
     * @returns {Object} Statistics object
     */
    function getStatistics(rows) {
        const stats = {
            total: 0,
            pending: 0,
            failed: 0,
            sent: 0,
            abandoned: 0
        };
        
        rows.forEach(row => {
            if (row.Announcement) {
                stats.total++;
                const status = row.Status || 'pending';
                if (stats.hasOwnProperty(status)) {
                    stats[status]++;
                }
            }
        });
        
        return stats;
    }

    /**
     * Enrich row data with calculated template fields
     * Adds DateTime, Date, Day, Time, RideLink fields
     * 
     * @param {Object} rowData - Original row data
     * @returns {Object} Enriched row data with calculated fields
     */
    function enrichRowData(rowData) {
        const enriched = { ...rowData };
        
        // Parse the start date/time
        const startDate = rowData.Date ? new Date(rowData.Date) : null;
        
        if (startDate && !isNaN(startDate)) {
            // Format date and time fields
            const options = { timeZone: 'America/Los_Angeles' };
            
            // DateTime: Full date and time (e.g., "Saturday, December 7, 2024 at 10:00 AM")
            enriched.DateTime = startDate.toLocaleString('en-US', {
                ...options,
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
            
            // Date: Just the date (e.g., "December 7, 2024")
            enriched.Date = startDate.toLocaleDateString('en-US', {
                ...options,
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            // Day: Day of week (e.g., "Saturday")
            enriched.Day = startDate.toLocaleDateString('en-US', {
                ...options,
                weekday: 'long'
            });
            
            // Time: Just the time (e.g., "10:00 AM")
            enriched.Time = startDate.toLocaleTimeString('en-US', {
                ...options,
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        }
        
        // RideLink: Hyperlink connecting RideURL to RideName
        if (rowData.RideURL && rowData.RideName) {
            enriched.RideLink = `<a href="${rowData.RideURL}">${rowData.RideName}</a>`;
        } else if (rowData.RideName) {
            enriched.RideLink = rowData.RideName;
        } else if (rowData.RideURL) {
            enriched.RideLink = rowData.RideURL;
        }
        
        // RideLeader: Use RideLeaders field (already should be a string from rowData)
        if (rowData.RideLeaders) {
            enriched.RideLeader = rowData.RideLeaders;
        }
        
        return enriched;
    }

    function expandTemplate(template, rowData) {
        const missingFields = [];
        
        // Enrich row data with calculated fields before expansion
        const enrichedData = enrichRowData(rowData);
        
        const expandedText = template.replace(/{([^}]+)}/g, (match, fieldName) => {
            const value = enrichedData[fieldName];
            
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
        calculateFailureUpdate,
        getStatistics,
        enrichRowData,
        expandTemplate,
        extractSubject
    };
})();

// Export for Node.js/Jest
if (typeof module !== 'undefined') {
    module.exports = AnnouncementCore;
}
