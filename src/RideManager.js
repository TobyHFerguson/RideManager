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
        try {
            return getGroupSpecs()[groupName].CALENDAR_ID;
        } catch {
            throw new Error(`Unknown group: ${groupName}. Expected one of ${getGroupnames().join(', ')}`);
        }
    }
    return {
        cancelRows: function (rows, rwgps) {
            function cancel(row, rwgps) {
                const event = EventFactory.fromRwgpsEvent(rwgps.get_event(row.RideURL));
                event.cancel();
                row.setRideLink(event.name, row.RideURL);
                rwgps.edit_event(row.RideURL, event)
            }

            rows.forEach(row => cancel(row, rwgps));
        },
        importRows: function (rows, rwgps) {
            function importRow(row, rwgps) {
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

            rows.forEach(row => importRow(row, rwgps));
        },
        reinstateRows: function (rows, rwgps) {
            function reinstate(row, rwgps) {
                const event = EventFactory.fromRwgpsEvent(rwgps.get_event(row.RideURL));
                event.reinstate();
                row.setRideLink(event.name, row.RideURL);
                rwgps.edit_event(row.RideURL, event)
            }

            rows.forEach(row => reinstate(row, rwgps));
        },
        scheduleRows: function (rows, rwgps) {
            function schedule_row(row, rwgps) {
                function get_template_(groupName) {
                    try {
                        return getGroupSpecs()[groupName].TEMPLATE
                    } catch {
                        throw new Error(`Unknown group: ${groupName}. Expected one of ${getGroupnames().join(', ')}`);
                    }
                }

                const new_event_url = rwgps.copy_template_(get_template_(row.Group));
                const event_id = _extractEventID(new_event_url);
                const event = EventFactory.newEvent(row, rwgps.getOrganizers(row.RideLeaders), event_id);
                rwgps.edit_event(new_event_url, event);
                rwgps.setRouteExpiration(row.RouteURL, dates.add(row.StartDate, getGlobals().EXPIRY_DELAY), true);
                row.setRideLink(event.name, new_event_url);
                rwgps.unTagEvents([new_event_url], ["template"]);
                const endTime = dates.addMinutes(row.StartTime, 480);
                const eventLink = `<a href="${new_event_url}">${event.name}</a>`;
                GoogleCalendarManager.createEvent(getCalendarId(row.Group), event.name, event.start_time, endTime, eventLink);
            }

            rows.map(row => schedule_row(row, rwgps));
        },
        unscheduleRows: function (rows, rwgps) {
            try {
                rwgps.batch_delete_events(rows.map(row => { let url = row.RideURL; row.deleteRideLink(); return url; }));
            } catch (err) {
                // Ignore the case where the event has already been deleted in rwgps land since we want it to be deleted anyway!
                if (err.message.indexOf('Request failed for https://ridewithgps.com returned code 404. Truncated server response: {"success":0,"message":"Record not found"} (use muteHttpExceptions option to examine full response)') === -1) {
                    throw err;
                }
            }
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
            const scheduledRowURLs = scheduledRows.map(row => row.RideURL);
            const scheduledRowLeaders = scheduledRows.map(row => row.RideLeaders);
            const rwgpsEvents = rwgps.get_events(scheduledRowURLs);
            const scheduledEvents = rwgpsEvents.map(e => e ? EventFactory.fromRwgpsEvent(e) : e);
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
            function updateRow(row) {
                let event
                if (!Event.managedEventName(row.RideName, getGroupNames())) {
                    event = EventFactory.fromRwgpsEvent(rwgps.get_event(row.RideURL));
                } else {
                    const event_id = _extractEventID(row.RideURL);
                    event = EventFactory.newEvent(row, rwgps.getOrganizers(row.RideLeaders), event_id);
                    rwgps.setRouteExpiration(row.RouteURL, dates.add(row.StartDate, getGlobals().EXPIRY_DELAY), true);
                }
                event.updateRiderCount(rwgps.getRSVPCounts([row.RideURL], [row.RideLeaders]), getGroupNames());
                row.setRideLink(event.name, row.RideURL);
                rwgps.edit_event(row.RideURL, event);
            }

            rows.forEach(row => updateRow(row));
        }
    }
})()