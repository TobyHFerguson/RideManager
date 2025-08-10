if (typeof require !== 'undefined') {
    const { getGroupNames } = require("./Groups");
}

const RideManager = (function () {
    function _log(name, msg) {
        console.log(`RideManager.${name}: ${msg}`);
    }
    function _extractEventID(event_url) {
        return event_url.substring(event_url.lastIndexOf('/') + 1).split('-')[0]
    }
    function getCalendarId(groupName) {
        const groupSpecs = getGroupSpecs();
        const id = groupSpecs[groupName.toUpperCase()].GoogleCalendarId;
        if (!id) {
            console.error(`getCalendarId(${groupName}) resulted in no id from these specs:`, groupSpecs)
        }
        return id;
    }
    function getLocation(row) {
        const route = getRoute(row.RouteURL);
        return route ? `${route.first_lat},${route.first_lng}` : '';
    }

    function cancelRow_(row, rwgps) {
        const event = EventFactory.fromRwgpsEvent(rwgps.get_event(row.RideURL));
        event.cancel();
        row.setRideLink(event.name, row.RideURL);
        rwgps.edit_event(row.RideURL, event)
    }
    function importRow_(row, rwgps) {
        let route = {
            url: row.RouteURL ? row.RouteURL : row.RouteName,
            //TODO use dates as native objects, not strings
            expiry: dates.MMDDYYYY(dates.add(row.StartDate ? row.StartDate : new Date(), getGlobals().EXPIRY_DELAY)),
            tags: [row.Group]
        }
        let rn = row.RouteName;
        let ru = row.RouteURL;
        if (rn !== ru) route.name = row.RouteName;

        // Delete any foreign prefix in the name
        if (route.name.startsWith(getGlobals().FOREIGN_PREFIX)) route.name = route.name.substring(getGlobals().FOREIGN_PREFIX.length);
        const url = rwgps.importRoute(route);
        row.setRouteLink(route.name || url, url);
        //TODO remove dependency on Schedule
        row.linkRouteURL();
    }


    function reinstateRow_(row, rwgps) {
        const event = EventFactory.fromRwgpsEvent(rwgps.get_event(row.RideURL));
        event.reinstate();
        row.setRideLink(event.name, row.RideURL);
        rwgps.edit_event(row.RideURL, event)
    }

    function schedule_row_(row, rwgps) {
        function get_template_(groupName) {
            try {
                return getGroupSpecs()[groupName].TEMPLATE
            } catch {
                throw new Error(`Unknown group: ${groupName}. Expected one of ${getGroupNames().join(', ')}`);
            }
        }

        const new_event_url = rwgps.copy_template_(get_template_(row.Group));
        const event_id = _extractEventID(new_event_url);
        const event = EventFactory.newEvent(row, rwgps.getOrganizers(row.RideLeaders), event_id);
        rwgps.edit_event(new_event_url, event);
        rwgps.setRouteExpiration(row.RouteURL, dates.add(row.StartDate, getGlobals().EXPIRY_DELAY), true);
        row.setRideLink(event.name, new_event_url);
        rwgps.unTagEvents([new_event_url], ["template"]);
        const description = `<a href="${new_event_url}">${event.name}</a>`;
        const eventId = GoogleCalendarManager.createEvent(getCalendarId(row.Group), event.name, event.start_time, row.EndTime, getLocation(row), description);
        row.GoogleEventId = eventId;
    }
    function updateRow_(row, rwgps) {
        const names = getGroupNames();

        let event
        const originalGroup = Event.getGroupName(row.RideName, names);
        if (!Event.managedEventName(row.RideName, names)) {
            event = EventFactory.fromRwgpsEvent(rwgps.get_event(row.RideURL));
            // DEBUG ISSUE 22
            if (event.name.trim().endsWith(']')) {
                throw new Error(`updateRow_: row ${row.rowNum}: Event name from RWGPS ends with a square bracket: ${event.name}. Original name: ${row.RideName}`);
            }
        } else {
            const event_id = _extractEventID(row.RideURL);
            event = EventFactory.newEvent(row, rwgps.getOrganizers(row.RideLeaders), event_id);
            // DEBUG ISSUE 22
            if (event.name.trim().endsWith(']')) {
                throw new Error(`updateRow_: row ${row.rowNum}: Event name from newEvent ends with a square bracket: ${event.name}. Original name: ${row.RideName}`);
            }
            rwgps.setRouteExpiration(row.RouteURL, dates.add(row.StartDate, getGlobals().EXPIRY_DELAY), true);
        }
        event.updateRiderCount(rwgps.getRSVPCounts([row.RideURL], [row.RideLeaders]), names);
        // DEBUG ISSUE 22
        if (event.name.trim().endsWith(']')) {
            throw new Error(`updateRow_: row ${row.rowNum}: Event name from updateRiderCount ends with a square bracket: ${event.name}. Original name: ${row.RideName}`);
        }

        row.setRideLink(event.name, row.RideURL);
        rwgps.edit_event(row.RideURL, event);
        if (originalGroup === row.Group) {
            const description = `<a href="${row.RideURL}">${event.name}</a>`;
            if (row.GoogleEventId) {
                GoogleCalendarManager.updateEvent(getCalendarId(row.Group), row.GoogleEventId, event.name, event.start_time, row.EndTime, getLocation(row), description);
            } else {
                const eventId = GoogleCalendarManager.createEvent(getCalendarId(row.Group), event.name, event.start_time, row.EndTime, getLocation(row), description);
                row.GoogleEventId = eventId;
            }
        } else {
            GoogleCalendarManager.deleteEvent(getCalendarId(originalGroup), row.GoogleEventId);
            const description = `<a href="${row.RideURL}">${event.name}</a>`;
            const eventId = GoogleCalendarManager.createEvent(getCalendarId(row.Group), event.name, event.start_time, row.EndTime, getLocation(row), description);
            row.GoogleEventId = eventId;
        }
    }

    function processRows_(rows, rwgps, fn) {
        const errors = [];
        rows.forEach(row => {
            try {
                fn(row, rwgps);
            } catch (e) {
                e.message = `Error processing row ${row.rowNum}: ${e.message}`;
                errors.push(e);
            }
        });
        if (errors.length) {
            throw new AggregateError(errors, `Errors processing rows: ${errors.map(e => e.message).join(', ')}`);
        }
    }
    return {
        cancelRows: function (rows, rwgps) {
            processRows_(rows, rwgps, cancelRow_)
        },
        importRows: function (rows, rwgps) {
            processRows_(rows, rwgps, importRow_);
        },
        reinstateRows: function (rows, rwgps) {
            processRows_(rows, rwgps, reinstateRow_);
        },
        scheduleRows: function (rows, rwgps) {
            processRows_(rows, rwgps, schedule_row_);
        },
        unscheduleRows: function (rows, rwgps) {
            try {
                const rideUrlsToBeDeleted = rows.map(row => row.RideURL);
                rwgps.batch_delete_events(rideUrlsToBeDeleted);
            } catch (err) {
                // Ignore the case where the event has already been deleted in rwgps land since we want it to be deleted anyway!
                if (err.message.indexOf('Request failed for https://ridewithgps.com returned code 404. Truncated server response: {"success":0,"message":"Record not found"} (use muteHttpExceptions option to examine full response)') === -1) {
                    throw err;
                }
            }
            rows.forEach(row => {
                row.deleteRideLink();
                const id = getCalendarId(row.Group);
                if (!id) {
                    console.error(`RideManager.unscheduleRows(): No Calendar ID found for ${row.Group} - skipping GoogleCalendarManager.deleteEvent()`)
                } else {
                    GoogleCalendarManager.deleteEvent(getCalendarId(row.Group), row.GoogleEventId);
                }
                row.GoogleEventId = '';
            });
        },
        /**
         * Update the ride counts in the given rows (ignoring rows that arent' scheduled), using the given RWGPS connector
         * @param {Rows![]} rows to be updated
         * @param {RWGPS} rwgps connector
         */
        updateRiderCounts: function (rows, rwgps) {
            // This works on all rows at once as a performance measure. Its more complicated,
            // but helps keep the execution time down.
            console.time('updateRiderCounts');
            const scheduledRows = rows.filter(row => rowCheck.scheduled(row));
            scheduledRows.forEach((row) => reportIfNameIsTruncated_(row.RouteName, row.RideName))
            const scheduledRowURLs = scheduledRows.map(row => row.RideURL);
            const scheduledRowLeaders = scheduledRows.map(row => row.RideLeaders);
            const rwgpsEvents = rwgps.get_events(scheduledRowURLs);
            const scheduledEvents = rwgpsEvents.map(e => e ? EventFactory.fromRwgpsEvent(e) : e);
            scheduledEvents.forEach((event, i) => { if (event) reportIfNameIsTruncated_(scheduledRows[i].RouteName, event.name) })
            const rsvpCounts = rwgps.getRSVPCounts(scheduledRowURLs, scheduledRowLeaders);
            const updatedEvents = scheduledEvents.map((event, i) => event ? event.updateRiderCount(rsvpCounts[i], getGroupNames()) : false);
            const edits = updatedEvents.reduce((p, e, i) => { if (e) { p.push({ row: scheduledRows[i], event: scheduledEvents[i] }) }; return p; }, []);

            rwgps.edit_events(edits.map(({ row, event }) => {
                _log('updateRiderCounts', `Row ${row.rowNum} Updating count for: ${event.name}`);
                return { url: row.RideURL, event };
            }));

            edits.forEach(({ row, event }) => {
                row.setRideLink(event.name, row.RideURL);
            });

            const updatedRows = edits.map(({ row, _ }) => row.rowNum);
            if (updatedRows.length) _log(`UpdateRiderCounts`, `row #s updated: ${updatedRows.join(', ')}`);
            console.timeEnd('updateRiderCounts');
        },
        updateRows: function (rows, rwgps) {
            processRows_(rows, rwgps, updateRow_);
        }
    }
})()

function reportIfNameIsTruncated_(routeName, rideName) {
  if (!rideName.trim().endsWith(routeName.trim())) {
    throw new Error(`Ride Name '${rideName}' doesnt end in route name '${routeName}'`)
  }
}

function testReportIfNameIsTruncated() {
  const  routeName = "AV - Freedom Via Pioneers, Green Vly, Freedom"
  const rideName = "Tue C (8/5 09:30) [7] "
  try {reportIfNameIsTruncated_(routeName, rideName)}
  catch (e) {
    console.error(e.message)
  }
}