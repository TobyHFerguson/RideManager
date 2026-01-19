// @ts-check
/// <reference path="./gas-globals.d.ts" />


if (typeof require !== 'undefined') {
    var Groups = require("./Groups");
    var dates = require('./common/dates');
}

/**
 * @typedef {import('./Externals').RWGPS} RWGPS
 * @typedef {import('./Externals').RWGPSEvent} RWGPSEvent
 * @typedef {import('./Externals').Organizer} Organizer
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
     * Look up organizers by name using RWGPSMembersAdapter (cached sheet lookup)
     * 
     * @param {string[]} leaderNames - Array of leader names to look up
     * @returns {Organizer[]} Array of Organizer objects with id and text properties
     */
    function _lookupOrganizers(leaderNames) {
        if (!leaderNames || !leaderNames.length) {
            return [];
        }
        
        const membersAdapter = new RWGPSMembersAdapter();
        /** @type {Organizer[]} */
        const organizers = [];
        
        for (const name of leaderNames) {
            if (!name || name.trim() === '') {
                continue;
            }
            
            const result = membersAdapter.lookupUserIdByName(name);
            if (result.success && result.userId) {
                organizers.push({
                    id: result.userId,
                    text: result.name || name
                });
            } else {
                console.warn(`_lookupOrganizers: Could not find organizer "${name}": ${result.error || 'Not found'}`);
                // Skip this organizer - don't add to array
            }
        }
        
        return organizers;
    }

    /**
     * Common sync logic for update, cancel, and reinstate operations.
     * Syncs all row data (columns A-F) with RWGPS event, updates logo if group changed,
     * and handles Google Calendar event updates/migrations.
     * 
     * @param {RowCoreInstance} row - Row to sync
     * @param {{forceCancel?: boolean, forceReinstate?: boolean}} [options] - Options
     *   - forceCancel: If true, mark event as cancelled (add CANCELLED: prefix)
     *   - forceReinstate: If true, ensure event is NOT cancelled (for unmanaged rides)
     * @returns {{rideEvent: SCCCCEvent, success: boolean}} Result with the built ride event
     */
    function _syncRowWithRwgps(row, options = {}) {
        const { forceCancel = false, forceReinstate = false } = options;
        const names = Groups.getGroupNames();
        const client = RWGPSClientFactory.create();

        /** @type {SCCCCEvent} */
        let rideEvent;
        
        // Determine original group from ride name (handles CANCELLED: prefix)
        const baseRideName = row.rideName.replace(/^CANCELLED:\s*/, '');
        const originalGroup = SCCCCEvent.getGroupName(baseRideName, names);
        
        // Check if managed or unmanaged ride
        if (!SCCCCEvent.managedEventName(baseRideName, names)) {
            // Unmanaged ride: can't sync row data, just handle cancel/reinstate title change
            if (forceCancel) {
                const result = client.cancelEvent(row.rideURL);
                if (!result.success) {
                    throw new Error(`Cancel failed: ${result.error}`);
                }
                rideEvent = EventFactory.fromRwgpsEvent(result.event);
            } else if (forceReinstate) {
                const result = client.reinstateEvent(row.rideURL);
                if (!result.success) {
                    throw new Error(`Reinstate failed: ${result.error}`);
                }
                rideEvent = EventFactory.fromRwgpsEvent(result.event);
            } else {
                // Regular update for unmanaged ride
                const result = client.getEvent(row.rideURL);
                if (!result.success || !result.event) {
                    throw new Error(`Failed to get event from RWGPS: ${result.error || 'Unknown error'}`);
                }
                rideEvent = EventFactory.fromRwgpsEvent(result.event);
            }
            RideManagerCore.validateEventNameFormat(rideEvent.name, row.rowNum || 0, row.rideName, 'RWGPS');
        } else {
            // Managed ride: sync all row data (columns A-F)
            const event_id = _extractEventID(row.rideURL);
            const organizers = _lookupOrganizers(row.leaders);
            
            rideEvent = EventFactory.newEvent(row, organizers, event_id);
            
            // Determine cancelled state
            if (forceCancel) {
                rideEvent.cancel();  // Add CANCELLED: prefix
            } else if (!forceReinstate && ValidationCore.isCancelled(row)) {
                // Regular update: preserve cancelled state from row
                rideEvent.cancel();
            }
            // Note: forceReinstate means DON'T call cancel(), so event is not cancelled
            
            RideManagerCore.validateEventNameFormat(rideEvent.name, row.rowNum || 0, row.rideName, 'newEvent');
            
            // Set route expiration via client
            const expiryDate = /** @type {Date} */ (dates.add(row.startDate, getGlobals().EXPIRY_DELAY));
            const expiryResult = client.setRouteExpiration(row.routeURL, expiryDate, true);
            if (!expiryResult.success) {
                console.warn(`RideManager._syncRowWithRwgps: Failed to set route expiration: ${expiryResult.error}`);
                // Non-fatal - continue with update
            }
            
            // Convert SCCCCEvent to v1 API format and edit event on RWGPS
            const v1EventData = RWGPSClientCore.convertSCCCCEventToV1Format(rideEvent);
            const editResult = client.editEvent(row.rideURL, v1EventData);
            if (!editResult.success) {
                throw new Error(`Failed to edit event on RWGPS: ${editResult.error || 'Unknown error'}`);
            }
        }

        // Update ride link in spreadsheet
        row.setRideLink(rideEvent.name, row.rideURL);
        
        // Update logo if group changed (logo is per-group from Groups sheet)
        if (originalGroup !== row.group) {
            const groupSpecs = Groups.getGroupSpecs();
            const newGroupSpec = groupSpecs[row.group];
            if (newGroupSpec && newGroupSpec.LogoURL) {
                console.log(`RideManager._syncRowWithRwgps: Group changed from ${originalGroup} to ${row.group}, updating logo...`);
                const logoResult = client.updateEventLogo(row.rideURL, newGroupSpec.LogoURL);
                if (!logoResult.success) {
                    console.warn(`RideManager._syncRowWithRwgps: Failed to update logo: ${logoResult.error}`);
                    // Non-fatal - continue
                } else {
                    console.log(`RideManager._syncRowWithRwgps: Logo updated successfully for row ${row.rowNum}`);
                }
            }
        }
        
        // Log the operation
        const operation = forceCancel ? 'CANCEL_RIDE' : (forceReinstate ? 'REINSTATE_RIDE' : 'UPDATE_RIDE');
        UserLogger.log(operation, `Row ${row.rowNum}, ${rideEvent.name}`, {
            rideUrl: row.rideURL,
            groupChanged: originalGroup !== row.group
        });
        
        // Handle Google Calendar: delete old if group changed
        if (originalGroup !== row.group && row.googleEventId) {
            const eventId = row.googleEventId;
            // @ts-ignore - googleEventId getter returns string (never null per RowCore.js implementation)
            if (!deleteEvent_(originalGroup, eventId)) {
                return { rideEvent, success: false };
            } else {
                row.setGoogleEventId(''); // Clear so new event is created below
            }
        }

        // Handle Google Calendar: update existing or create new
        const description = `<a href="${row.rideURL}">${rideEvent.name}</a>`;
        let success = false;
        if (row.googleEventId) {
            if (updateEvent_(row, rideEvent, description)) {
                success = true;
            }
        } else {
            const eventId = createEvent_(row, rideEvent, description);
            if (eventId) {
                // Create RichText link to calendar with event ID as display text
                const calendarId = getCalendarId(row.group);
                const link = GoogleEventCore.buildRichTextLink(eventId, calendarId, row.startDate);
                row.setGoogleEventIdLink(link.text, link.url);
                success = true;
            }
        }

        return { rideEvent, success };
    }

    /**
     * @param {RowCoreInstance} row
     * @param {boolean} sendEmail
     * @param {string} [reason]
     */
    function cancelRow_(row, sendEmail = false, reason = '') {
        // Use common sync logic with forceCancel=true
        // This syncs all row data (columns A-F) AND marks as cancelled
        _syncRowWithRwgps(row, { forceCancel: true });

        // Handle announcement cancellation (specific to cancel operation)
        if (row.announcementCell && row.status) {
            try {
                const manager = new AnnouncementManager();
                const announcementResult = manager.handleCancellation(row, sendEmail, reason);

                // Log to UserLogger
                UserLogger.log('CANCEL_RIDE', `Row ${row.rowNum}, ${row.rideName}, Reason: ${reason || '(none)'}`, {
                    announcementSent: announcementResult.announcementSent,
                    emailAddress: announcementResult.emailAddress || '(not sent)',
                    error: announcementResult.error
                });
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                console.error(`RideManager.cancelRow_: Error handling announcement cancellation: ${err.message}`);
                // Don't throw - ride cancellation succeeded, announcement is secondary
            }
        }
    }
    /**
     * Import a foreign route to club library using RWGPSClient
     * @param {RowCoreInstance} row
     */
    function importRow_(row) {
        const globals = getGlobals();
        
        // Create RWGPSClient via factory
        const client = RWGPSClientFactory.create();
        
        // Calculate expiry date
        const expiryDate = /** @type {Date} */ (dates.add(row.startDate, globals.EXPIRY_DELAY));
        const expiryStr = `${expiryDate.getMonth() + 1}/${expiryDate.getDate()}/${expiryDate.getFullYear()}`;
        
        // Use route name as-is from spreadsheet (including FOREIGN prefix if present)
        // User's choice of name (with or without prefix) should be preserved
        const routeName = row.routeName;
        
        // Import route using new client (copies to club library, adds tags, sets expiry)
        const result = client.importRoute(row.routeURL, {
            name: routeName,
            expiry: expiryStr,
            tags: row.group ? [row.group] : [],
            userId: globals.SCCCC_USER_ID
        });
        
        if (!result.success) {
            throw new Error(`Route import failed: ${result.error}`);
        }
        
        // Update spreadsheet with new route URL (keeping the same name user chose)
        row.setRouteLink(routeName || result.routeUrl, result.routeUrl);
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
     * @param {boolean} sendEmail
     * @param {string} [reason]
     */
    function reinstateRow_(row, sendEmail = false, reason = '') {
        // Use common sync logic with forceReinstate=true
        // This syncs all row data (columns A-F) AND ensures NOT cancelled
        _syncRowWithRwgps(row, { forceReinstate: true });
        
        // Handle announcement reinstatement (specific to reinstate operation)
        if (row.announcementCell && row.status === 'cancelled') {
            try {
                const manager = new AnnouncementManager();
                const announcementResult = manager.handleReinstatement(row, sendEmail, reason);

                // Log to UserLogger
                UserLogger.log('REINSTATE_RIDE', `Row ${row.rowNum}, ${row.rideName}, Reason: ${reason || '(none)'}`, {
                    announcementSent: announcementResult.announcementSent,
                    emailAddress: announcementResult.emailAddress || '(not sent)',
                    error: announcementResult.error
                });
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                console.error(`RideManager.reinstateRow_: Error handling announcement reinstatement: ${err.message}`);
                // Don't throw - ride reinstatement succeeded, announcement is secondary
            }
        }
    }

    /**
     * Schedule a new ride event on RWGPS
     * Uses RWGPSClient.scheduleEvent() directly - NO templates, NO facade!
     * 
     * @param {RowCoreInstance} row
     */
    function schedule_row_(row) {
        // Get group specs for logo URL
        const groupSpecs = Groups.getGroupSpecs();
        const groupSpec = groupSpecs[row.group];
        if (!groupSpec) {
            throw new Error(`Unknown group: ${row.group}. Expected one of ${Groups.getGroupNames().join(', ')}`);
        }
        
        const globals = getGlobals();
        
        // Create RWGPSClient via factory
        const client = RWGPSClientFactory.create();
        
        // Build event data for v1 API format
        const dateParts = RWGPSClientCore.formatDateForV1Api(row.startDateTime);
        const routeId = row.routeURL ? row.routeURL.split('/')[4] : null;
        
        // Look up organizer IDs from cached RWGPS Members sheet
        const organizerNames = Array.isArray(row.leaders) ? row.leaders : [row.leaders];
        const organizers = _lookupOrganizers(organizerNames);
        const organizerIds = organizers.map((/** @type {{id: number}} */ o) => o.id);
        
        // Build ride name using EventFactory logic (we need this for the event name)
        const rideEvent = EventFactory.newEvent(row, organizers, 0);
        
        const eventData = {
            name: rideEvent.name,
            description: rideEvent.desc,
            start_date: dateParts.start_date,
            start_time: dateParts.start_time,
            route_ids: routeId ? [routeId] : [],
            visibility: 1  // 1 = friends_only/members_only
        };
        
        const logoUrl = groupSpec.LogoURL || null;
        
        // Create event with RWGPSClient (handles login, logo upload, editing)
        // Organizer IDs pre-looked up from members sheet - no API lookup needed
        const createResult = client.scheduleEvent(eventData, organizerIds, logoUrl);
        
        if (!createResult.success) {
            throw new Error(`Failed to create RWGPS event: ${createResult.error}`);
        }
        
        const new_event_url = createResult.eventUrl;
        const newEventId = RWGPSClientCore.extractEventId(new_event_url);
        
        // Add group tag
        if (row.group) {
            client._addEventTags(newEventId, [row.group]);
        }
        
        // Set route expiration via importRoute (RWGPSClient handles this)
        const expiryDate = /** @type {Date} */ (dates.add(row.startDate, globals.EXPIRY_DELAY));
        const expiryStr = `${expiryDate.getMonth() + 1}/${expiryDate.getDate()}/${expiryDate.getFullYear()}`;
        client.importRoute(row.routeURL, { 
            expiry: expiryStr, 
            userId: globals.SCCCC_USER_ID,
            tags: []
        });
        
        // Update row with ride link
        row.setRideLink(rideEvent.name, new_event_url);
        
        // Create Google Calendar event
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
        const emailKey = `${row.group}_GROUP_ANNOUNCEMENT_ADDRESS`;
        const announcementEmail = row.announcementCell ? (globals[emailKey] || '(not configured)') : '(no announcement)';
        
        UserLogger.log('SCHEDULE_RIDE', `Row ${row.rowNum}, ${row.rideName}`, {
            rideUrl: new_event_url,
            googleEventId: eventId || '(creation failed)',
            announcementCreated: !!row.announcementCell,
            announcementEmail: announcementEmail
        });
    }
    /**
     * @param {RowCoreInstance} row
     */
    function updateRow_(row) {
        // Use common sync logic (no forceCancel/forceReinstate - preserves row's cancelled state)
        const { success } = _syncRowWithRwgps(row, {});

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
     * @param {(row: RowCoreInstance, sendEmail?: boolean, reason?: string) => void} fn
     * @param {boolean} sendEmail
     * @param {string} reason
     */
    function processRows_(rows, fn, sendEmail = false, reason = '') {
        /** @type {Error[]} */
        const errors = [];
        rows.forEach(row => {
            try {
                fn(row, sendEmail, reason);
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
         * @param {boolean} sendEmail
         * @param {string} reason
         */
        cancelRows: function (rows, sendEmail = false, reason = '') {
            processRows_(rows, cancelRow_, sendEmail, reason)
        },
        /**
         * @param {RowCoreInstance[]} rows
         */
        importRows: function (rows) {
            processRows_(rows, importRow_);
        },
        /**
         * @param {RowCoreInstance[]} rows
         * @param {boolean} sendEmail
         * @param {string} reason
         */
        reinstateRows: function (rows, sendEmail = false, reason = '') {
            processRows_(rows, reinstateRow_, sendEmail, reason);
        },
        /**
         * @param {RowCoreInstance[]} rows
         */
        scheduleRows: function (rows) {
            processRows_(rows, schedule_row_);
        },
        /**
         * @param {RowCoreInstance[]} rows
         * @param {RWGPS} _rwgps - DEPRECATED: Not used, kept for interface compatibility
         */
        unscheduleRows: function (rows, _rwgps) {
            // Create RWGPSClient via factory
            const client = RWGPSClientFactory.create();
            
            // Collect RideURLs and GoogleEventIds BEFORE any modifications
            const rideData = rows.map(row => ({
                rideUrl: row.rideURL || null,
                googleEventId: row.googleEventId || null,
                group: row.group
            }));

            // Step 1: Delete rides from RWGPS (loop over each, handle errors per-event)
            /** @type {string[]} */
            const rideUrlsToDelete = rideData.map(data => data.rideUrl).filter(url => url !== null && url !== undefined);
            if (rideUrlsToDelete.length > 0) {
                let deletedCount = 0;
                /** @type {string[]} */
                const failedUrls = [];
                
                rideUrlsToDelete.forEach(url => {
                    try {
                        const result = client.deleteEvent(url);
                        if (result.success) {
                            deletedCount++;
                        } else {
                            // Check for 404 (already deleted)
                            if (result.error && result.error.includes('404')) {
                                console.log(`RideManager.unscheduleRows: Ride already deleted (404): ${url}`);
                                deletedCount++; // Count as success
                            } else {
                                console.error(`RideManager.unscheduleRows: Failed to delete ${url}: ${result.error}`);
                                failedUrls.push(url);
                            }
                        }
                    } catch (err) {
                        const error = err instanceof Error ? err : new Error(String(err));
                        console.error(`RideManager.unscheduleRows: Error deleting ${url}: ${error.message}`);
                        failedUrls.push(url);
                    }
                });
                
                console.log(`RideManager.unscheduleRows: Deleted ${deletedCount}/${rideUrlsToDelete.length} ride(s) from RWGPS`);
                if (failedUrls.length > 0) {
                    console.warn(`RideManager.unscheduleRows: Failed to delete ${failedUrls.length} ride(s), continuing with cleanup`);
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
                
                try {
                    // Clear announcement fields from row
                    row.clearAnnouncement();
                } catch (error) {
                    console.error(`RideManager.unscheduleRows: Error clearing announcement fields:`, error);
                }
            });

            // Step 3: Batch remove announcements from queue
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
                    announcementRemoved: !!r.announcementCell
                });
            });
        },

        /**
         * @param {RowCoreInstance[]} rows
         */
        updateRows: function (rows) {
            processRows_(rows, updateRow_);
        }
    }
})();

