// @ts-check
// AnnouncementCore.js - Pure JavaScript business logic for ride announcement management
// This module is fully testable in Jest (no GAS dependencies)

/**
 * Core logic for managing ride announcements
 * - Queue management for pending announcements
 * - Template expansion calculations
 * - Send time calculations
 * - Statistics and formatting
 */
var AnnouncementCore = (function() {
    'use strict';

    /**
     * Calculate the send time for a ride announcement
     * Send at 6:00 PM, 2 calendar days before the ride date
     * 
     * Note: This function works in the LOCAL timezone of the execution environment.
     * In Google Apps Script, this will be the script's timezone (Session.getScriptTimeZone()).
     * In tests, this will be the system's local timezone.
     * 
     * @param {Date|string} rideDate - The date/time of the ride (in local timezone)
     * @param {string} [timezone='America/Los_Angeles'] - Timezone parameter (currently unused, for future enhancement)
     * @returns {Date} The scheduled send time (6 PM local time, 2 days before ride)
     */
    function calculateSendTime(rideDate, timezone = 'America/Los_Angeles') {
        const ride = new Date(rideDate);
        
        // Create a date 2 days before the ride
        const sendDate = new Date(ride);
        sendDate.setDate(sendDate.getDate() - 2);
        
        // Set time to 6:00 PM (18:00) in local time
        // NOTE: timezone parameter is currently unused because JavaScript's Date object
        // doesn't natively support timezone-aware operations without external libraries.
        // This would require either:
        //   1. Using Intl.DateTimeFormat (complex, browser-dependent)
        //   2. Using a library like moment-timezone (adds dependency)
        //   3. Manual UTC offset calculations (error-prone)
        // 
        // For now, we rely on the execution environment (GAS) having the correct timezone set.
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
     * Get rows from spreadsheet that are due for sending or reminder
     * 
     * @param {any[]} rows - Array of RowCore domain objects
     * @param {number} currentTime - Current timestamp
     * @returns {Object} Object with dueToSend and dueForReminder arrays
     */
    function getDueItems(rows, currentTime) {
        /** @type {any[]} */
        const dueToSend = [];
        
        rows.forEach(row => {
            // Skip rows without announcement data
            if (!row.announcement || !row.sendAt) {
                return;
            }
            
            const sendTime = new Date(row.sendAt).getTime();
            const status = row.status || 'pending';
            
            if (status === 'pending') {
                const timeDiff = sendTime - currentTime;
                
                // Due to send (within 1 hour window OR past due)
                if (timeDiff <= 60 * 60 * 1000) {
                    dueToSend.push(row);
                }
            }
            // Note: 'failed' status announcements are NOT retried automatically
            // User must manually retry by updating the ride
        });
        
        return dueToSend;
    }



    /**
     * Get statistics about announcements from rows
     * 
     * @param {any[]} rows - Array of RowCore domain objects
     * @returns {Object} Statistics object
     */
    function getStatistics(rows) {
        const stats = {
            total: 0,
            pending: 0,
            failed: 0,
            sent: 0
        };
        
        rows.forEach(row => {
            if (row.announcement) {
                stats.total++;
                const status = row.status || 'pending';
                if (stats.hasOwnProperty(status)) {
                    /** @type {any} */ (stats)[status]++;
                }
            }
        });
        
        return stats;
    }

    /**
     * Enrich row data with calculated template fields
     * Adds DateTime, Date, Day, Time, RideLink, Gain, Length, FPM, StartPin, Lat, Long fields
     * 
     * @param {Object} rowData - Original RowCore domain object with ride properties
     * @param {{distance?: number, elevation_gain?: number, first_lat?: number, first_lng?: number}} [route] - Optional route object from RWGPS
     * @returns {Object} Enriched row data with calculated fields
     */
    function enrichRowData(rowData, route) {
        /** @type {any} */
        const enriched = { ...rowData };
        
        // Map camelCase domain properties to PascalCase for template expansion
        // This allows templates to use {RideName}, {Location}, etc.
        if (rowData.rideName !== undefined) enriched.RideName = rowData.rideName;
        if (rowData.rideURL !== undefined) enriched.RideURL = rowData.rideURL;
        if (rowData.routeName !== undefined) enriched.RouteName = rowData.routeName;
        if (rowData.routeURL !== undefined) enriched.RouteURL = rowData.routeURL;
        if (rowData.location !== undefined) enriched.Location = rowData.location;
        if (rowData.address !== undefined) enriched.Address = rowData.address;
        if (rowData.group !== undefined) enriched.Group = rowData.group;
        if (rowData.rideLeader !== undefined) enriched.RideLeader = rowData.rideLeader;
        if (rowData.date !== undefined) enriched.StartDate = rowData.date;
        
        // Parse the start date/time
        const startDate = rowData.date ? new Date(rowData.date) : null;
        
        if (startDate && !isNaN(startDate.getTime())) {
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
        
        // RideLink: Hyperlink connecting rideURL to rideName
        if (rowData.rideURL && rowData.rideName) {
            enriched.RideLink = `<a href="${rowData.rideURL}">${rowData.rideName}</a>`;
        } else if (rowData.rideName) {
            enriched.RideLink = rowData.rideName;
        } else if (rowData.rideURL) {
            enriched.RideLink = rowData.rideURL;
        }
        
        // RideLeader: Use rideLeader field
        if (rowData.rideLeader) {
            enriched.RideLeader = rowData.rideLeader;
        }
        
        // Route-based fields (if route object provided)
        if (route) {
            const METERS_TO_MILES = 0.000621371;
            const METERS_TO_FEET = 3.28084;
            
            // Length: Route distance in miles
            if (route.distance !== undefined && route.distance !== null) {
                enriched.Length = Math.round(route.distance * METERS_TO_MILES);
            }
            
            // Gain: Elevation gain in feet
            if (route.elevation_gain !== undefined && route.elevation_gain !== null) {
                enriched.Gain = Math.round(route.elevation_gain * METERS_TO_FEET);
            }
            
            // FPM: Feet per mile (gain/length)
            if (enriched.Gain !== undefined && enriched.Length !== undefined && enriched.Length > 0) {
                enriched.FPM = Math.round(enriched.Gain / enriched.Length);
            }
            
            // Lat/Long: Start location coordinates
            if (route.first_lat !== undefined && route.first_lat !== null) {
                enriched.Lat = route.first_lat;
            }
            if (route.first_lng !== undefined && route.first_lng !== null) {
                enriched.Long = route.first_lng;
            }
            
            // StartPin: Hyperlinked pins to Apple and Google maps
            if (enriched.Lat !== undefined && enriched.Long !== undefined) {
                const appleUrl = `https://maps.apple.com/?ll=${enriched.Lat},${enriched.Long}&q=Ride%20Start`;
                const googleUrl = `https://www.google.com/maps/search/?api=1&query=${enriched.Lat},${enriched.Long}`;
                enriched.StartPin = `<a href="${appleUrl}">Apple Maps</a> / <a href="${googleUrl}">Google Maps</a>`;
            }
        }
        
        return enriched;
    }

    /**
     * Expand template placeholders with row data
     * 
     * @param {string} template - Template text with {FieldName} placeholders
     * @param {Object} rowData - Row data object with ride properties
     * @param {{distance?: number, elevation_gain?: number, first_lat?: number, first_lng?: number}} [route] - Optional route object from RWGPS
     * @returns {Object} Object with expandedText and missingFields
     */
    function expandTemplate(template, rowData, route = null) {
        /** @type {string[]} */
        const missingFields = [];
        
        // Enrich row data with calculated fields before expansion
        const enrichedData = enrichRowData(rowData, route);
        
        const expandedText = template.replace(/{([^}]+)}/g, (/** @type {string} */ match, /** @type {string} */ fieldName) => {
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

    /**
     * Calculate new announcement document name based on ride name
     * Format: "RA-{RideName}"
     * 
     * @param {string} rideName - New ride name
     * @returns {string} New document name
     */
    function calculateAnnouncementDocName(rideName) {
        return `RA-${rideName}`;
    }

    /**
     * Determine what updates are needed for an announcement when ride is updated
     * Returns an object describing what needs to be updated
     * 
     * @param {Object} currentAnnouncement - Current announcement data
     * @param {string} currentAnnouncement.documentName - Current document name
     * @param {Object} newRideData - New ride data
     * @param {string} newRideData.rideName - New ride name
     * @param {Date|string} newRideData.rideDate - New ride date
     * @param {string} [timezone='America/Los_Angeles'] - Timezone for calculation
     * @returns {Object} Update decision object
     */
    function calculateAnnouncementUpdates(currentAnnouncement, newRideData, timezone = 'America/Los_Angeles') {
        const updates = {
            needsDocumentRename: false,
            newDocumentName: null,
            needsSendAtUpdate: true,  // Always update sendAt
            calculatedSendAt: null
        };

        // Check if document name needs update
        const newDocName = calculateAnnouncementDocName(newRideData.rideName);
        if (currentAnnouncement.documentName !== newDocName) {
            updates.needsDocumentRename = true;
            // @ts-expect-error
            updates.newDocumentName = newDocName;
        }

        // Calculate new sendAt based on updated ride date
        // @ts-expect-error
        updates.calculatedSendAt = calculateSendTime(newRideData.rideDate, timezone);

        return updates;
    }

    // Public API
    return {
        calculateSendTime,
        createQueueItem,
        getDueItems,
        getStatistics,
        enrichRowData,
        expandTemplate,
        extractSubject,
        calculateAnnouncementDocName,
        calculateAnnouncementUpdates
    };
})();

// Export for Node.js/Jest
if (typeof module !== 'undefined') {
    module.exports = AnnouncementCore;
}
