// @ts-check
/// <reference path="./gas-globals.d.ts" />
if (typeof require !== 'undefined') {
    // @ts-ignore
    const { getGroupNames } = require("./Groups");
    var dates = require('./common/dates');
}

/**
 * @typedef {import('./Externals').RWGPS} RWGPS
 * @typedef {import('./Externals').RWGPSEvent} RWGPSEvent
 */

const RideManager = (function () {
    /**
     * @param {string} name
     * @param {string} msg
     */
    function _log(name, msg) {
        console.log(`RideManager.${name}: ${msg}`);
    }
    /**
     * @param {string} event_url
     */
    function _extractEventID(event_url) {
        return event_url.substring(event_url.lastIndexOf('/') + 1).split('-')[0]
    }
    /**
     * @param {string} groupName
     */
    function getCalendarId(groupName) {
        const groupSpecs = getGroupSpecs();
        const id = groupSpecs[groupName.toUpperCase()].GoogleCalendarId;
        if (!id) {
            console.error(`getCalendarId(${groupName}) resulted in no id from these specs:`, groupSpecs)
        }
        return id;
    }
    /**
     * @param {any} row
     */
    function getLatLong(row) {
        const route = getRoute(row.RouteURL);
        return route ? `${route.first_lat},${route.first_lng}` : '';
    }

    /**
     * @param {any} row
     * @param {any} rwgps
     * @param {string} [reason]
     */
    function cancelRow_(row, rwgps, reason = '') {
        const rideEvent = EventFactory.fromRwgpsEvent(rwgps.get_event(row.RideURL));
        rideEvent.cancel();
        row.setRideLink(rideEvent.name, row.RideURL);
        rwgps.edit_event(row.RideURL, rideEvent)
        const description = `<a href="${row.RideURL}">${rideEvent.name}</a>`;
        GoogleCalendarManager.updateEvent(getCalendarId(row.Group), row.GoogleEventId, rideEvent.name, new Date(rideEvent.start_time), new Date(row.EndTime), getLatLong(row), description);
        
        // Handle announcement cancellation
        if (row.Announcement && row.Status) {
            try {
                const manager = new AnnouncementManager();
                const result = manager.handleCancellation(row, reason);
                
                // Log to UserLogger
                UserLogger.log('CANCEL_RIDE', `Row ${row.rowNum}, ${row.RideName}, Reason: ${reason || '(none)'}`, {
                    announcementSent: result.announcementSent,
                    error: result.error
                });
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                console.error(`RideManager.cancelRow_: Error handling announcement cancellation: ${err.message}`);
                // Don't throw - ride cancellation succeeded, announcement is secondary
            }
        }
        
        // Remove from calendar retry queue if present
        if (row.GoogleEventId) {
            try {
                const retryQueue = new RetryQueue();
                retryQueue.removeByEventId(row.GoogleEventId);
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                console.error(`RideManager.cancelRow_: Error removing from retry queue: ${err.message}`);
                // Don't throw - this is cleanup
            }
        }
    }
    /**
     * @param {any} row
     * @param {any} rwgps
     */
    function importRow_(row, rwgps) {
        /** @type {{url: any, expiry: string, tags: any[], name?: string}} */
        let route = {
            url: row.RouteURL ? row.RouteURL : row.RouteName,
            //TODO use dates as native objects, not strings
            expiry: String(dates.MMDDYYYY(dates.add(row.StartDate ? row.StartDate : new Date(), getGlobals().EXPIRY_DELAY))),
            tags: [row.Group]
        }
        let rn = row.RouteName;
        let ru = row.RouteURL;
        if (rn !== ru) route.name = row.RouteName;

        // Delete any foreign prefix in the name
        if (route.name && route.name.startsWith(getGlobals().FOREIGN_PREFIX)) route.name = route.name.substring(getGlobals().FOREIGN_PREFIX.length);
        const url = rwgps.importRoute(route);
        row.setRouteLink(route.name || url, url);
        //TODO remove dependency on Schedule
        row.linkRouteURL();
    }


    /**
     * @param {any} row
     * @param {any} rwgps
     * @param {string} [reason]
     */
    function reinstateRow_(row, rwgps, reason = '') {
        const rideEvent = EventFactory.fromRwgpsEvent(rwgps.get_event(row.RideURL));
        rideEvent.reinstate();
        row.setRideLink(rideEvent.name, row.RideURL);
        rwgps.edit_event(row.RideURL, rideEvent)
        const description = `<a href="${row.RideURL}">${rideEvent.name}</a>`;
        GoogleCalendarManager.updateEvent(getCalendarId(row.Group), row.GoogleEventId, rideEvent.name, new Date(rideEvent.start_time), new Date(row.EndTime), getLatLong(row), description);
        
        // Handle announcement reinstatement
        if (row.Announcement && row.Status === 'cancelled') {
            try {
                const manager = new AnnouncementManager();
                const result = manager.handleReinstatement(row, reason);
                
                // Log to UserLogger
                UserLogger.log('REINSTATE_RIDE', `Row ${row.rowNum}, ${row.RideName}, Reason: ${reason || '(none)'}`, {
                    announcementSent: result.announcementSent,
                    error: result.error
                });
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                console.error(`RideManager.reinstateRow_: Error handling announcement reinstatement: ${err.message}`);
                // Don't throw - ride reinstatement succeeded, announcement is secondary
            }
        }
        
        // Note: We do NOT remove from retry queue on reinstatement - let retry continue
    }

    /**
     * @param {any} row
     * @param {any} rwgps
     */
    function schedule_row_(row, rwgps) {
        /**
         * @param {string} groupName
         */
        function get_template_(groupName) {
            try {
                return getGroupSpecs()[groupName].TEMPLATE
            } catch {
                throw new Error(`Unknown group: ${groupName}. Expected one of ${getGroupNames().join(', ')}`);
            }
        }

        const new_event_url = rwgps.copy_template_(get_template_(row.Group));
        const event_id = _extractEventID(new_event_url);
        const rideEvent = EventFactory.newEvent(row, rwgps.getOrganizers(row.RideLeaders), event_id);
        rwgps.edit_event(new_event_url, rideEvent);
        rwgps.setRouteExpiration(row.RouteURL, dates.add(row.StartDate, getGlobals().EXPIRY_DELAY), true);
        row.setRideLink(rideEvent.name, new_event_url);
        rwgps.unTagEvents([new_event_url], ["template"]);
        const description = `<a href="${new_event_url}">${rideEvent.name}</a>`;
        console.log('RideManager.schedule_row_', `Creating Google Calendar event with rideEvent:`, rideEvent);
        const result = GoogleCalendarManager.createEvent(getCalendarId(row.Group), rideEvent.name, new Date(rideEvent.start_time), new Date(row.EndTime), getLatLong(row), description, new_event_url, row._rowNum);
        
        // Store event ID if calendar creation succeeded
        if (typeof result === 'object' && result !== null && 'success' in result) {
            if (result.success && result.eventId) {
                row.GoogleEventId = result.eventId;
            } else if (result.queued) {
                console.log(`RideManager.schedule_row_: Calendar event queued for background retry (row ${row.rowNum})`);
                // Event ID will be updated by background process
            } else {
                console.error(`RideManager.schedule_row_: Failed to create calendar event for row ${row.rowNum}: ${result.error || 'Unknown error'}`);
            }
        } else if (typeof result === 'string') {
            // Got event ID directly (legacy path)
            row.GoogleEventId = result;
        }
        
        // Create ride announcement regardless of calendar success
        try {
            console.log(`RideManager.schedule_row_: Creating announcement for row ${row.rowNum}...`);
            const manager = new (AnnouncementManager)();
            const docUrl = manager.createAnnouncement(row);
            console.log(`RideManager.schedule_row_: Announcement created at ${docUrl} for row ${row.rowNum}`);
        } catch (announcementError) {
            const err = announcementError instanceof Error ? announcementError : new Error(String(announcementError));
            const errorMsg = `Failed to create announcement: ${err.message}`;
            console.error(`RideManager.schedule_row_: ${errorMsg} (row ${row.rowNum})`);
            console.error(`RideManager.schedule_row_: Error stack:`, err.stack);
            // Show user a notification about the failure
            try {
                SpreadsheetApp.getUi().alert(
                    'Announcement Creation Failed',
                    `Ride scheduled successfully, but announcement creation failed:\n\n${errorMsg}\n\nStack: ${err.stack}\n\nCheck logs for details.`,
                    SpreadsheetApp.getUi().ButtonSet.OK
                );
            } catch (e) {
                console.error(`RideManager.schedule_row_: Failed to show UI alert:`, e);
            }
        }
    }
    /**
     * @param {any} row
     * @param {any} rwgps
     */
    function updateRow_(row, rwgps) {
        const names = getGroupNames();

        let rideEvent
        const originalGroup = SCCCCEvent.getGroupName(row.RideName, names);
        if (!SCCCCEvent.managedEventName(row.RideName, names)) {
            rideEvent = EventFactory.fromRwgpsEvent(rwgps.get_event(row.RideURL));
            // DEBUG ISSUE 22
            if (rideEvent.name.trim().endsWith(']')) {
                throw new Error(`updateRow_: row ${row.rowNum}: Event name from RWGPS ends with a square bracket: ${rideEvent.name}. Original name: ${row.RideName}`);
            }
        } else {
            const event_id = _extractEventID(row.RideURL);
            rideEvent = EventFactory.newEvent(row, rwgps.getOrganizers(row.RideLeaders), event_id);
            // DEBUG ISSUE 22
            if (rideEvent.name.trim().endsWith(']')) {
                throw new Error(`updateRow_: row ${row.rowNum}: Event name from newEvent ends with a square bracket: ${rideEvent.name}. Original name: ${row.RideName}`);
            }
            rwgps.setRouteExpiration(row.RouteURL, dates.add(row.StartDate, getGlobals().EXPIRY_DELAY), true);
        }

        row.setRideLink(rideEvent.name, row.RideURL);
        rwgps.edit_event(row.RideURL, rideEvent);
        if (originalGroup === row.Group) {
            const description = `<a href="${row.RideURL}">${rideEvent.name}</a>`;
            if (row.GoogleEventId) {
                GoogleCalendarManager.updateEvent(getCalendarId(row.Group), row.GoogleEventId, rideEvent.name, new Date(rideEvent.start_time), new Date(row.EndTime), getLatLong(row), description);
            } else {
                const result = GoogleCalendarManager.createEvent(getCalendarId(row.Group), rideEvent.name, new Date(rideEvent.start_time), new Date(row.EndTime), getLatLong(row), description, row.RideURL, row._rowNum);
                if (typeof result === 'object' && result !== null && 'success' in result) {
                    if (result.success && result.eventId) {
                        row.GoogleEventId = result.eventId;
                    } else if (result.queued) {
                        console.log(`RideManager.updateRow_: Calendar event queued for background retry (row ${row._rowNum})`);
                    }
                } else if (typeof result === 'string') {
                    row.GoogleEventId = result;
                }
            }
        } else {
            GoogleCalendarManager.deleteEvent(getCalendarId(originalGroup), row.GoogleEventId);
            const description = `<a href="${row.RideURL}">${rideEvent.name}</a>`;
            const result = GoogleCalendarManager.createEvent(getCalendarId(row.Group), rideEvent.name, new Date(rideEvent.start_time), new Date(row.EndTime), getLatLong(row), description, row.RideURL, row._rowNum);
            if (typeof result === 'object' && result !== null && 'success' in result) {
                if (result.success && result.eventId) {
                    row.GoogleEventId = result.eventId;
                } else if (result.queued) {
                    console.log(`RideManager.updateRow_: Calendar event queued for background retry (row ${row._rowNum}, group change)`);
                }
            } else if (typeof result === 'string') {
                row.GoogleEventId = result;
            }
            if (!row.GoogleEventId) {
                row.GoogleEventId = null; // Clear old event ID since we're creating in new calendar
            }
        }
    }

    /**
     * @param {any[]} rows
     * @param {any} rwgps
     * @param {Function} fn
     * @param {string} reason
     */
    function processRows_(rows, rwgps, fn, reason = '') {
        /** @type {Error[]} */
        const errors = [];
        rows.forEach(row => {
            try {
                fn(row, rwgps, reason);
            } catch (e) {
                const err = e instanceof Error ? e : new Error(String(e));
                err.message = `Error processing row ${row.rowNum}: ${err.message}`;
                errors.push(err);
            }
        });
        if (errors.length) {
            throw new AggregateError(errors, `Errors processing rows: ${errors.map(e => e.message).join(', ')}`);
        }
    }
    return {
        /**
         * @param {any[]} rows
         * @param {any} rwgps
         * @param {string} reason
         */
        cancelRows: function (rows, rwgps, reason = '') {
            processRows_(rows, rwgps, cancelRow_, reason)
        },
        /**
         * @param {any[]} rows
         * @param {any} rwgps
         */
        importRows: function (rows, rwgps) {
            processRows_(rows, rwgps, importRow_);
        },
        /**
         * @param {any[]} rows
         * @param {any} rwgps
         * @param {string} reason
         */
        reinstateRows: function (rows, rwgps, reason = '') {
            processRows_(rows, rwgps, reinstateRow_, reason);
        },
        /**
         * @param {any[]} rows
         * @param {any} rwgps
         */
        scheduleRows: function (rows, rwgps) {
            processRows_(rows, rwgps, schedule_row_);
        },
        /**
         * @param {any[]} rows
         * @param {any} rwgps
         */
        unscheduleRows: function (rows, rwgps) {
            // Collect RideURLs and GoogleEventIds BEFORE any modifications
            const rideData = rows.map(row => ({
                rideUrl: row.RideURL || null,
                googleEventId: row.GoogleEventId || null,
                group: row.Group
            }));
            
            // Step 1: Delete rides from RWGPS (batch operation, but handle errors gracefully)
            const rideUrlsToDelete = rideData.map(data => data.rideUrl).filter(url => url);
            if (rideUrlsToDelete.length > 0) {
                try {
                    rwgps.batch_delete_events(rideUrlsToDelete);
                    console.log(`RideManager.unscheduleRows: Deleted ${rideUrlsToDelete.length} ride(s) from RWGPS`);
                } catch (err) {
                    const error = err instanceof Error ? err : new Error(String(err));
                    const is404 = error.message.indexOf('Request failed for https://ridewithgps.com returned code 404') !== -1;
                    const is500 = error.message.indexOf('Request failed for https://ridewithgps.com returned code 500') !== -1;
                    
                    if (is404) {
                        // 404 = Not Found - rides already deleted, continue
                        console.log('RideManager.unscheduleRows: Rides already deleted on RWGPS (404)');
                    } else if (is500) {
                        // 500 could be transient server error - retry to confirm deletion
                        console.log('RideManager.unscheduleRows: Got 500 error, retrying to confirm rides deleted');
                        try {
                            rwgps.batch_delete_events(rideUrlsToDelete);
                            // Retry succeeded - this was a transient error, log but continue
                            console.error('RideManager.unscheduleRows: Retry succeeded - original 500 was transient, continuing');
                        } catch (retryErr) {
                            const retryError = retryErr instanceof Error ? retryErr : new Error(String(retryErr));
                            const retryIs404 = retryError.message.indexOf('Request failed for https://ridewithgps.com returned code 404') !== -1;
                            if (retryIs404) {
                                // Retry got 404 - rides are indeed deleted
                                console.log('RideManager.unscheduleRows: Retry confirmed rides deleted (404)');
                            } else {
                                // Different error on retry - log but continue with cleanup
                                console.error('RideManager.unscheduleRows: RWGPS deletion failed, continuing with cleanup:', retryError.message);
                            }
                        }
                    } else {
                        // Other error - log but continue with cleanup
                        console.error('RideManager.unscheduleRows: RWGPS deletion failed, continuing with cleanup:', error.message);
                    }
                }
            }
            
            // Step 2: Process each row individually (continue even if some fail)
            rows.forEach((row, index) => {
                const data = rideData[index];
                
                try {
                    // Delete ride link from spreadsheet
                    row.deleteRideLink();
                } catch (error) {
                    console.error(`RideManager.unscheduleRows: Error deleting ride link for row:`, error);
                }
                
                try {
                    // Delete calendar event
                    if (data.googleEventId) {
                        const calendarId = getCalendarId(data.group);
                        if (!calendarId) {
                            console.error(`RideManager.unscheduleRows: No Calendar ID found for ${data.group} - skipping calendar deletion`);
                        } else {
                            GoogleCalendarManager.deleteEvent(calendarId, data.googleEventId);
                        }
                    }
                    row.GoogleEventId = '';
                } catch (error) {
                    console.error(`RideManager.unscheduleRows: Error deleting calendar event ${data.googleEventId}:`, error);
                    // Still clear the field even if deletion failed
                    try {
                        row.GoogleEventId = '';
                    } catch (e) {
                        console.error(`RideManager.unscheduleRows: Error clearing GoogleEventId:`, e);
                    }
                }
            });
            
            // Step 3: Batch remove announcements
            const rideUrlsWithAnnouncements = rideData.map(data => data.rideUrl).filter(url => url);
            if (rideUrlsWithAnnouncements.length > 0) {
                try {
                    const count = new (AnnouncementManager)().removeByRideUrls(rideUrlsWithAnnouncements);
                    if (count > 0) {
                        console.log(`RideManager.unscheduleRows: Removed ${count} announcement(s) for ${rideUrlsWithAnnouncements.length} rides`);
                    }
                } catch (error) {
                    console.error(`RideManager.unscheduleRows: Error removing announcements:`, error);
                    // Don't throw - announcement cleanup is not critical
                }
            }
            
            // Step 4: Remove retry queue items (batch all removals in single instance)
            const rideUrls = rideData.map(data => data.rideUrl).filter(url => url);
            if (rideUrls.length > 0) {
                try {
                    const retryQueue = new RetryQueue();
                    rideUrls.forEach(rideUrl => {
                        retryQueue.removeByRideUrl(rideUrl);
                    });
                    console.log(`RideManager.unscheduleRows: Removed retry queue items for ${rideUrls.length} ride(s)`);
                } catch (error) {
                    console.error(`RideManager.unscheduleRows: Error removing retry queue items:`, error);
                    // Don't throw - retry queue cleanup is not critical
                }
            }
        },

        /**
         * @param {any[]} rows
         * @param {any} rwgps
         */
        updateRows: function (rows, rwgps) {
            processRows_(rows, rwgps, updateRow_);
        }
    }
})()

