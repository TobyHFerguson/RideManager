
const rowCheck = {
    unmanagedRide: function (row) {
        if (!Event.managedEventName(row.RideName, getGroupNames())) {
            return "Ride is unmanaged";
        }
    },
    unscheduled: function (row) {
        if (!row.RideURL) {
            return "Ride has not been scheduled";
        }
    },
    noStartDate: function (row) {
        if ((!row.StartDate) || (dates.convert(row.StartDate).toString() === "Invalid Date")) {
            return `Invalid row.StartDate: "${row.StartDate} ${dates.convert(row.StartDate)}"`
        }
    },
    noStartTime: function (row) {
        if ((!row.StartTime) || (dates.convert(row.StartTime).toString() === "Invalid Date")) {
            return `Invalid row.StartTime: "${row.StartTime} ${dates.convert(row.StartTime)}"`
        }
    },
    noGroup: function (row) {
        if (!row.Group) return "Group column is empty";
        const groups = getGroupNames();
        if (!groups.includes(row.Group)) {
            return `Unknown group: '${row.Group}'. Expected one of ${groups.join(', ')}`;
        }
    },
    routeInaccessibleOrOwnedByClub: function (row) {
        const url = row.RouteURL ? row.RouteURL : row.RouteName;
        if (!url) {
            return `No Route URL in row ${row.rowNum}. Are you sure you've selected the right row?`
        }
        try {
            const response = UrlFetchApp.fetch(url + ".json", { muteHttpExceptions: false });

            switch (response.getResponseCode()) {
                case 200:
                    let route = JSON.parse(response.getContentText());
                    if (route.user_id === getGlobals["SCCCC_USER_ID"]) {
                        return 'Route is owned by SCCCC';
                    }
                    break;
                case 403: return 'Route URL does not have public access';
                case 404: return `This route cannot be found on the server`;
                default: return "Unknown issue with Route URL";
            }
        } catch (e) {
            console.error("Route URL error: %s", e)
            return "Unknown issue with Route URL - please check it and try again"
        }
    },
    badRoute: function (row) {
        try {
            getRoute(row.RouteURL);
        }
        catch (e) {
            return e.message
        }
    },
    // Warnings
    noRideLeader: function (row, rwgps) {
        if (!row.RideLeaders || row.RideLeaders.length === 0) {
            return `No ride leader given. Defaulting to '${getGlobals["RIDE_LEADER_TBD_NAME"]}'`;
        } else {
            const rls = row.RideLeaders.reduce((p, rl) => {
                if (rwgps.knownRideLeader(rl)) {
                    p.known.push(rl)
                } else {
                    p.unknown.push(rl)
                };
                return p;
            },
                { known: [], unknown: [] });

            if (rls.unknown.length) {
                row.highlightRideLeader(true);
                const prefix = `${rls.known.length ? "Some" : "All"} Ride Leaders (${rls.unknown.join(', ')}) unknown.`
                const suffix = rls.known.length ? "" : ` Defaulting to ${getGlobals["RIDE_LEADER_TBD_NAME"]}`;
                return prefix + suffix;
            } else {
                row.highlightRideLeader(false);
            }
        }
    },
    notCancelled: function (row) {
        if (!(row.RideName.toLowerCase().startsWith('cancelled'))) {
            return 'Operation not permitted when ride is not cancelled';
        }
    },
    cancelled: function (row) {
        if (row.RideName.toLowerCase().startsWith('cancelled')) {
            return 'Operation not permitted on cancelled ride';
        }
    },
    noLocation: function (row) {
        if (!row.Location || row.Location.startsWith('#')) {
            return "Unknown location";
        }
    },
    noAddress: function (row) {
        if (!row.Address || row.Address.startsWith('#')) {
            return "Unknown address";
        }
    },
    inappropiateGroup: function (row) {
        const nrg = this.noGroup(row);
        if (nrg) return nrg;
        function __inappropriateGroup(groupName, elevation, distance) {
            if (getGroupSpecs()[groupName].MIN_ELEVATION_GAIN && elevation < getGroupSpecs()[groupName].MIN_ELEVATION_GAIN) {
                return `Elevation gain (${elevation}') too low for ${groupName} group (must be at least ${getGroupSpecs()[groupName].MIN_ELEVATION_GAIN}')`
            }
            if (getGroupSpecs()[groupName].MAX_ELEVATION_GAIN && elevation > getGroupSpecs()[groupName].MAX_ELEVATION_GAIN) {
                return `Elevation gain (${elevation}') too great for ${groupName} group (must be no more than ${getGroupSpecs()[groupName].MAX_ELEVATION_GAIN}')`
            }
            if (getGroupSpecs()[groupName].MIN_LENGTH && distance < getGroupSpecs()[groupName].MIN_LENGTH) {
                return `Distance (${distance} miles) too short for ${groupName} group (must be at least ${getGroupSpecs()[groupName].MIN_LENGTH} miles)`
            }
            if (getGroupSpecs()[groupName].MAX_LENGTH && distance > getGroupSpecs()[groupName].MAX_LENGTH) {
                return `Distance (${distance} miles) too long for ${groupName} group (must be no more than ${getGroupSpecs()[groupName].MAX_LENGTH} miles)`
            }
        }

        if (!row.RouteURL) return;
        const response = UrlFetchApp.fetch(row.RouteURL + ".json", { muteHttpExceptions: true });
        const route = JSON.parse(response.getContentText());
        const d = Math.round(route.distance * getGlobals["METERS_TO_MILES"]);
        const e = Math.round(route.elevation_gain * getGlobals["METERS_TO_FEET"]);
        return __inappropriateGroup(row.Group, e, d);
    },
    scheduled: function (row) {
        if (row.RideURL) {
            return "This ride has already been scheduled";
        }
    },
    foreignRoute: function (row) {
        try {
            const route = getRoute(row.RouteURL)
            if (route.user_id !== getGlobals["SCCCC_USER_ID"]) {
                return 'Route is not owned by SCCCC';
            }
        } catch (e) {
            return e.message;
        }
    }
}

const errorFuns = [rowCheck.unmanagedRide, rowCheck.noStartDate, rowCheck.noStartTime, rowCheck.noGroup, rowCheck.badRoute, rowCheck.scheduled]

const warningFuns = [rowCheck.noRideLeader, rowCheck.cancelled, rowCheck.noLocation, rowCheck.noAddress, rowCheck.inappropiateGroup, rowCheck.foreignRoute]

function evalRows(rows, rwgps, efs = errorFuns, wfs = warningFuns) {
    function evalRow_(row, rwgps, efs, wfs) {
        row.errors = [];
        efs.map(f => f.bind(rowCheck)).map(f => f(row, rwgps)).filter(e => e).forEach(e => row.errors.push(e));
        row.warnings = []
        wfs.map(f => f.bind(rowCheck)).map(f => f(row, rwgps)).filter(w => w).forEach(w => row.warnings.push(w));
        return row;
    }

    return rows.map(row => evalRow_(row, rwgps, efs, wfs));
}



