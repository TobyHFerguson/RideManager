const RideManager = (function () {
    function _log(name, msg) {
        console.log(`RideManager.${name}: ${msg}`);
    }
    function _extractEventID(event_url) {
        return event_url.substring(event_url.lastIndexOf('/') +1).split('-')[0]
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
                const route = {
                    url: row.RouteURL ? row.RouteURL : row.RouteName,
                    //TODO use dates as native objects, not strings
                    expiry: dates.MMDDYYYY(dates.add(row.StartDate ? row.StartDate : new Date(), Globals.EXPIRY_DELAY))
                };
                const url = rwgps.importRoute(route);
                row.setRouteLink(url, url);
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
                function get_template_(group) {
                    try {
                        return Globals.groups[group].TEMPLATE
                    } catch {
                        throw new Error(`Unknown group: ${group}. Expected one of ${Object.keys(Globals.groups).join(', ')}`);
                    }
                }

                const new_event_url = rwgps.copy_template_(get_template_(row.Group));
                const event_id = _extractEventID(new_event_url);
                const event = EventFactory.newEvent(row, rwgps.getOrganizers(row.RideLeaders), event_id);
                rwgps.edit_event(new_event_url, event);
                rwgps.setRouteExpiration(row.RouteURL, dates.add(row.StartDate, Globals.EXPIRY_DELAY), true);
                row.setRideLink(event.name, new_event_url);
                rwgps.unTagEvents([new_event_url], ["template"]);
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
            this.updateRows(rows.filter(row => rowCheck.scheduled(row)), rwgps)
            return;
            
        },
        updateRows: function (rows, rwgps) {
            function updateRow(row) {
                let event
                if (!Event.managedEventName(row.RideName, Globals.groups)) {
                    event = EventFactory.fromRwgpsEvent(rwgps.get_event(row.RideURL));
                } else {
                    const event_id = _extractEventID(row.RideURL);
                    event = EventFactory.newEvent(row, rwgps.getOrganizers(row.RideLeaders), event_id);
                    rwgps.setRouteExpiration(row.RouteURL, dates.add(row.StartDate, Globals.EXPIRY_DELAY), true);
                }
                event.updateRiderCount(rwgps.getRSVPCounts([row.RideURL], [row.RideLeaders]));
                row.setRideLink(event.name, row.RideURL);
                rwgps.edit_event(row.RideURL, event);
            }

            rows.forEach(row => updateRow(row));
        }
    }
})()