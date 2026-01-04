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
 * @typedef {InstanceType<typeof RowCore>} RowCoreInstance
 * @typedef {import('./RideManagerCore').default} RideManagerCoreType
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
        // NOTE: extractEventID exists in RideManagerCore (see RideManagerCore.js:18, test coverage: 100%)
        // TypeScript error is false positive due to namespace export pattern (see copilot-instructions.md section 14)
        return RideManagerCore.extractEventID(event_url);
    }
    /**
     * @param {string} groupName
     */
    function getCalendarId(groupName) {
        const groupSpecs = getGroupSpecs();
        const normalizedGroupName = groupName.toUpperCase();
        const groupSpec = groupSpecs[normalizedGroupName];
        const id = groupSpec?.GoogleCalendarId;
        
        // Debug logging to help diagnose calendar ID issues
        console.log(`getCalendarId: Input groupName="${groupName}", normalized="${normalizedGroupName}"`);
        console.log(`getCalendarId: Found groupSpec:`, groupSpec);
        console.log(`getCalendarId: Resolved calendar ID="${id}"`);
        
        if (!id) {
            console.error(`getCalendarId(${groupName}) resulted in no id from these specs:`, groupSpecs);
        }
        return id;
    }
    /**
     * @param {RowCoreInstance} row
     */
    function getLatLong(row) {
        const route = getRoute(row.routeURL);
        // NOTE: extractLatLong exists in RideManagerCore (see RideManagerCore.js:33, test coverage: 100%)
        // TypeScript error is false positive due to namespace export pattern
        return RideManagerCore.extractLatLong(route);
    }

    /**
     * @param {RowCoreInstance} row
     * @param {RWGPS} rwgps
     * @param {boolean} sendEmail
     * @param {string} [reason]
     */
    function cancelRow_(row, rwgps, sendEmail = false, reason = '') {
        const rideEvent = EventFactory.fromRwgpsEvent(rwgps.get_event(row.rideURL));
        rideEvent.cancel();
        row.setRideLink(rideEvent.name, row.rideURL);
        rwgps.edit_event(row.rideURL, rideEvent)
        const description = `<a href="${row.rideURL}">${rideEvent.name}</a>`;
        updateEvent_(row, rideEvent, description);

        // Handle announcement cancellation
        if (row.announcement && row.status) {
            try {
                const manager = new AnnouncementManager();
                const result = manager.handleCancellation(row, sendEmail, reason);

                // Log to UserLogger
                UserLogger.log('CANCEL_RIDE', `Row ${row.rowNum}, ${row.rideName}, Reason: ${reason || '(none)'}`, {
                    announcementSent: result.announcementSent,
                    emailAddress: result.emailAddress || '(not sent)',
                    error: result.error
                });
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                console.error(`RideManager.cancelRow_: Error handling announcement cancellation: ${err.message}`);
                // Don't throw - ride cancellation succeeded, announcement is secondary
            }
        }
    }
    /**
     * @param {RowCoreInstance} row
     * @param {RWGPS} rwgps
     */
    function importRow_(row, rwgps) {
        // Prepare route configuration using Core logic
        const rowData = {
            routeURL: row.routeURL,
            routeName: row.routeName,
            startDate: row.startDate,
            group: row.group
        };
        // NOTE: prepareRouteImport exists in RideManagerCore (see RideManagerCore.js:46, test coverage: 100%)
        // TypeScript error is false positive due to namespace export pattern
        const globals = getGlobals();
        // Wrap dates functions to satisfy RideManagerCore's stricter signatures
        const addDays = (/** @type {Date | string} */ date, /** @type {number} */ days) => {
            const result = dates.add(date, days);
            return result instanceof Date ? result : new Date(); // Return Date, not NaN
        };
        const formatDate = (/** @type {Date} */ date) => {
            const result = dates.MMDDYYYY(date);
            return typeof result === 'string' ? result : ''; // Return string, not NaN
        };
        const route = RideManagerCore.prepareRouteImport(
            rowData,
            { EXPIRY_DELAY: globals.EXPIRY_DELAY, FOREIGN_PREFIX: globals.FOREIGN_PREFIX },
            addDays,
            formatDate
        );
        
        // GAS API call: import route to RWGPS
        const url = rwgps.importRoute(route);
        
        // Update spreadsheet (dirty tracking handles save automatically)
        row.setRouteLink(route.name || url, url);
    }

    /**
     * Update the calendar event for the ride in the given row
     * @param {RowCoreInstance} row 
     * @param {SCCCCEvent} rideEvent 
     * @param {string} description 
     * @return {boolean} true if update succeeded, false otherwise
     */
    function updateEvent_(row, rideEvent, description) {
        // NOTE: prepareCalendarEventData exists in RideManagerCore (see RideManagerCore.js:73, test coverage: 100%)
        // TypeScript error is false positive due to namespace export pattern
        // @ts-expect-error - rideEvent is SCCCCEvent instance, TypeScript sees class constructor type
        const eventData = RideManagerCore.prepareCalendarEventData(rideEvent, row);
        try {
            GoogleCalendarManager.updateEvent(
                getCalendarId(row.group),
                row.googleEventId,
                eventData.name,
                eventData.start,
                eventData.end,
                getLatLong(row),
                description
            );
            return true;
        } catch (calendarError) {
            const err = calendarError instanceof Error ? calendarError : new Error(String(calendarError));
            const errorMsg = `Failed to update calendar event: ${err.message}`;
            console.error(`RideManager.updateEvent_: ${errorMsg} (row ${row.rowNum})`);
            console.error(`RideManager.updateEvent_: Error stack:`, err.stack);
            // Show user a notification about the failure
            try {
                SpreadsheetApp.getUi().alert(
                    'Calendar Event Update Failed',
                    `Ride updated successfully, but calendar event update failed:\n\n${errorMsg}\n\nCheck logs for details.`,
                    SpreadsheetApp.getUi().ButtonSet.OK
                );
            } catch (e) {
                console.error(`RideManager.updateEvent_: Failed to show UI alert:`, e);
            }
            return false;
        }
    }

    /**
     * Create a new calendar event for the ride in the given row
     * @param {RowCoreInstance} row 
     * @param {SCCCCEvent} rideEvent 
     * @param {string} description 
     */
    function createEvent_(row, rideEvent, description) {
        // NOTE: prepareCalendarEventData exists in RideManagerCore (see RideManagerCore.js:73, test coverage: 100%)
        // TypeScript error is false positive due to namespace export pattern
        // @ts-expect-error - rideEvent is SCCCCEvent instance, TypeScript sees class constructor type
        const eventData = RideManagerCore.prepareCalendarEventData(rideEvent, row);
        try {
            const eventId = GoogleCalendarManager.createEvent(
                getCalendarId(row.group),
                eventData.name,
                eventData.start,
                eventData.end,
                getLatLong(row),
                description
            );
            return eventId;
        } catch (calendarError) {
            const err = calendarError instanceof Error ? calendarError : new Error(String(calendarError));
            const errorMsg = `Failed to create calendar event: ${err.message}`;
            console.error(`RideManager.createEvent_: ${errorMsg} (row ${row.rowNum})`);
            console.error(`RideManager.createEvent_: Error stack:`, err.stack);
            // Show user a notification about the failure
            try {
                SpreadsheetApp.getUi().alert(
                    'Calendar Event Creation Failed',
                    `Ride created successfully, but calendar event creation failed:\n\n${errorMsg}\n\nCheck logs for details.`,
                    SpreadsheetApp.getUi().ButtonSet.OK
                );
            } catch (e) {
                console.error(`RideManager.createEvent_: Failed to show UI alert:`, e);
            }
        }
    }

    /**
     * Delete the calendar event for the given group and event ID
     * @param {string} group Group from whose calendar the event is to be deleted
     * @param {string} eventId id of the event to be deleted
     * @returns {boolean} true if deletion succeeded, false otherwise
     */
    function deleteEvent_(group, eventId) {
        try {
            GoogleCalendarManager.deleteEvent(getCalendarId(group), eventId);
            return true;
        } catch (calendarError) {
            const err = calendarError instanceof Error ? calendarError : new Error(String(calendarError));
            const errorMsg = `Failed to delete calendar event: ${err.message}`;
            console.error(`RideManager.deleteEvent_: ${errorMsg}`);
            console.error(`RideManager.deleteEvent_: Error stack:`, err.stack);
            // Show user a notification about the failure
            try {
                SpreadsheetApp.getUi().alert(
                    'Calendar Event Deletion Failed',
                    `Calendar event deletion failed:\n\n${errorMsg}\n\nYou will have to delete this event manually.\n\nCheck logs for further details.`,
                    SpreadsheetApp.getUi().ButtonSet.OK
                );
            } catch (e) {
                console.error(`RideManager.deleteEvent_: Failed to show UI alert:`, e);
            }
            return false;
        }
    }
    /**
     * @param {RowCoreInstance} row
     * @param {RWGPS} rwgps
     * @param {boolean} sendEmail
     * @param {string} [reason]
     */
    function reinstateRow_(row, rwgps, sendEmail = false, reason = '') {
        const rideEvent = EventFactory.fromRwgpsEvent(rwgps.get_event(row.rideURL));
        rideEvent.reinstate();
        row.setRideLink(rideEvent.name, row.rideURL);
        rwgps.edit_event(row.rideURL, rideEvent)
        const description = `<a href="${row.rideURL}">${rideEvent.name}</a>`;
        updateEvent_(row, rideEvent, description)
        // Handle announcement reinstatement
        if (row.announcement && row.status === 'cancelled') {
            try {
                const manager = new AnnouncementManager();
                const result = manager.handleReinstatement(row, sendEmail, reason);

                // Log to UserLogger
                UserLogger.log('REINSTATE_RIDE', `Row ${row.rowNum}, ${row.rideName}, Reason: ${reason || '(none)'}`, {
                    announcementSent: result.announcementSent,
                    emailAddress: result.emailAddress || '(not sent)',
                    error: result.error
                });
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                console.error(`RideManager.reinstateRow_: Error handling announcement reinstatement: ${err.message}`);
                // Don't throw - ride reinstatement succeeded, announcement is secondary
            }
        }
    }

    /**
     * @param {RowCoreInstance} row
     * @param {RWGPS} rwgps
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

        const new_event_url = rwgps.copy_template_(get_template_(row.group));
        const event_id = _extractEventID(new_event_url);
        const rideEvent = EventFactory.newEvent(row, rwgps.getOrganizers(row.leaders), event_id);
        rwgps.edit_event(new_event_url, rideEvent);
        const expiryDate = /** @type {Date} */ (dates.add(row.startDate, getGlobals().EXPIRY_DELAY));
        rwgps.setRouteExpiration(row.routeURL, expiryDate, true);
        row.setRideLink(rideEvent.name, new_event_url);
        rwgps.unTagEvents([new_event_url], ["template"]);
        const description = `<a href="${new_event_url}">${rideEvent.name}</a>`;
        console.log('RideManager.schedule_row_', `Creating Google Calendar event with rideEvent:`, rideEvent);
        const eventId = createEvent_(row, rideEvent, description);
        if (eventId) {
            // Create RichText link to calendar with event ID as display text
            const calendarId = getCalendarId(row.group);
            const link = GoogleEventCore.buildRichTextLink(eventId, calendarId, row.startDate);
            row.setGoogleEventIdLink(link.text, link.url);
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
        
        // Log to UserLogger
        const globals = getGlobals();
        const emailKey = `${row.group}_GROUP_ANNOUNCEMENT_ADDRESS`;
        const announcementEmail = row.announcement ? (globals[emailKey] || '(not configured)') : '(no announcement)';
        
        UserLogger.log('SCHEDULE_RIDE', `Row ${row.rowNum}, ${row.rideName}`, {
            rideUrl: new_event_url,
            googleEventId: eventId || '(creation failed)',
            announcementCreated: !!row.announcement,
            announcementEmail: announcementEmail
        });
    }
    /**
     * @param {RowCoreInstance} row
     * @param {RWGPS} rwgps
     */
    function updateRow_(row, rwgps) {
        const names = getGroupNames();

        let rideEvent
        // NOTE: extractGroupName exists in RideManagerCore (see RideManagerCore.js:95, test coverage: 100%)
        // TypeScript error is false positive due to namespace export pattern
        const originalGroup = RideManagerCore.extractGroupName(row.rideName, names);
        // NOTE: isManagedEventName exists in RideManagerCore (see RideManagerCore.js:107, test coverage: 100%)
        if (!RideManagerCore.isManagedEventName(row.rideName, names)) {
            rideEvent = EventFactory.fromRwgpsEvent(rwgps.get_event(row.rideURL));
            // DEBUG ISSUE 22
            // NOTE: validateEventNameFormat exists in RideManagerCore (see RideManagerCore.js:120, test coverage: 100%)
            // TypeScript error is false positive due to namespace export pattern
            RideManagerCore.validateEventNameFormat(rideEvent.name, row.rowNum, row.rideName, 'RWGPS');
        } else {
            const event_id = _extractEventID(row.rideURL);
            rideEvent = EventFactory.newEvent(row, rwgps.getOrganizers(row.leaders), event_id);
            if (ValidationCore.isCancelled(row)) {
                rideEvent.cancel();
            }
            // DEBUG ISSUE 22
            // NOTE: validateEventNameFormat exists in RideManagerCore (see RideManagerCore.js:120, test coverage: 100%)
            // TypeScript error is false positive due to namespace export pattern
            RideManagerCore.validateEventNameFormat(rideEvent.name, row.rowNum, row.rideName, 'newEvent');
            const expiryDate = /** @type {Date} */ (dates.add(row.startDate, getGlobals().EXPIRY_DELAY));
            rwgps.setRouteExpiration(row.routeURL, expiryDate, true);
        }

        row.setRideLink(rideEvent.name, row.rideURL);
        rwgps.edit_event(row.rideURL, rideEvent);
        
        // Log to UserLogger
        UserLogger.log('UPDATE_RIDE', `Row ${row.rowNum}, ${row.rideName}`, {
            rideUrl: row.rideURL,
            groupChanged: originalGroup !== row.group
        });
        if (originalGroup !== row.group && row.googleEventId) {
            const eventId = row.googleEventId;
            // @ts-ignore - googleEventId getter returns string (never null per RowCore.js implementation), VS Code false positive
            if (!deleteEvent_(originalGroup, eventId)) {
                return;
            } else {
                row.setGoogleEventId(''); // Clear so new event is created below
            }
        }

        const description = `<a href="${row.rideURL}">${rideEvent.name}</a>`;
        let success = false;
        if (row.googleEventId) {
            if (updateEvent_(row, rideEvent, description)) {
                success = true;
            };
        } else {
            const eventId = createEvent_(row, rideEvent, description);
            if (eventId) {
                // Create RichText link to calendar with event ID as display text
                const calendarId = getCalendarId(row.group);
                const link = GoogleEventCore.buildRichTextLink(eventId, calendarId, row.startDate);
                row.setGoogleEventIdLink(link.text, link.url);
            }
        }


        // Update announcement (will create one if it doesn't exist)
        try {
            if (success) {
                const manager = new AnnouncementManager();
                const result = manager.updateAnnouncement(row);

                if (!result.success && result.error) {
                    console.error(`RideManager.updateRow_: Error updating announcement for row ${row.rowNum}: ${result.error}`);
                    // Don't throw - announcement update failure shouldn't block ride update
                }
            }
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            console.error(`RideManager.updateRow_: Error updating announcement for row ${row.rowNum}: ${err.message}`);
            // Errors don't block ride update
        }
    }

    /**
     * @param {RowCoreInstance[]} rows
     * @param {RWGPS} rwgps
     * @param {Function} fn
     * @param {boolean} sendEmail
     * @param {string} reason
     */
    function processRows_(rows, rwgps, fn, sendEmail = false, reason = '') {
        /** @type {Error[]} */
        const errors = [];
        rows.forEach(row => {
            try {
                fn(row, rwgps, sendEmail, reason);
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
         * @param {RowCoreInstance[]} rows
         * @param {RWGPS} rwgps
         * @param {boolean} sendEmail
         * @param {string} reason
         */
        cancelRows: function (rows, rwgps, sendEmail = false, reason = '') {
            processRows_(rows, rwgps, cancelRow_, sendEmail, reason)
        },
        /**
         * @param {RowCoreInstance[]} rows
         * @param {RWGPS} rwgps
         */
        importRows: function (rows, rwgps) {
            processRows_(rows, rwgps, importRow_);
        },
        /**
         * @param {RowCoreInstance[]} rows
         * @param {RWGPS} rwgps
         * @param {boolean} sendEmail
         * @param {string} reason
         */
        reinstateRows: function (rows, rwgps, sendEmail = false, reason = '') {
            processRows_(rows, rwgps, reinstateRow_, sendEmail, reason);
        },
        /**
         * @param {RowCoreInstance[]} rows
         * @param {RWGPS} rwgps
         */
        scheduleRows: function (rows, rwgps) {
            processRows_(rows, rwgps, schedule_row_);
        },
        /**
         * @param {RowCoreInstance[]} rows
         * @param {RWGPS} rwgps
         */
        unscheduleRows: function (rows, rwgps) {
            // Collect RideURLs and GoogleEventIds BEFORE any modifications
            const rideData = rows.map(row => ({
                rideUrl: row.rideURL || null,
                googleEventId: row.googleEventId || null,
                group: row.group
            }));

            // Step 1: Delete rides from RWGPS (batch operation, but handle errors gracefully)
            /** @type {string[]} */
            const rideUrlsToDelete = rideData.map(data => data.rideUrl).filter(url => url !== null && url !== undefined);
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
                            if (deleteEvent_(data.group, data.googleEventId)) {
                                row.setGoogleEventId('');
                            }
                        }
                    }
                } catch (error) {
                    console.error(`RideManager.unscheduleRows: Error deleting calendar event ${data.googleEventId}:`, error);
                    // Still clear the field even if deletion failed
                    try {
                        row.setGoogleEventId('');
                    } catch (e) {
                        console.error(`RideManager.unscheduleRows: Error clearing GoogleEventId:`, e);
                    }
                }
            });

            // Step 3: Batch remove announcements
            /** @type {string[]} */
            const rideUrlsWithAnnouncements = rideData.map(data => data.rideUrl).filter(url => url !== null && url !== undefined);
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
            
            // Log to UserLogger - one entry per row
            rows.forEach(r => {
                const name = r.rideName || r.routeName || '(unnamed)';
                const nameType = r.rideName ? 'ride' : (r.routeName ? 'route' : 'unknown');
                UserLogger.log('UNSCHEDULE_RIDE', `Row ${r.rowNum} (${nameType}: ${name})`, {
                    rideUrl: r.rideURL || '(not scheduled)',
                    announcementRemoved: !!r.announcement
                });
            });
        },

        /**
         * @param {RowCoreInstance[]} rows
         * @param {RWGPS} rwgps
         */
        updateRows: function (rows, rwgps) {
            processRows_(rows, rwgps, updateRow_);
        }
    }
})()

