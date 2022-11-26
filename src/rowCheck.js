if (typeof require !== 'undefined') {
    Globals = require('./Globals.js');
  }

const rowCheck = {
    unmanagedRide: function(row) {
        if (!Event.managedEventName(row.RideName)) {
            return "Ride is unmanaged";
        }
    },
    unscheduled: function(row) {
        if (!row.RideURL) {
            return "Ride has not been scheduled";
        }
    },
    noStartDate_: function (row) {
        if (row.StartDate === undefined || row.StartDate.constructor !== Date) {
            return "No Start Date"
        }
    },
    noStartTime_: function (row) {
        if (row.StartTime === undefined || row.StartTime.constructor !== Date) {
            return "No Start Time"
        }
    },
    noGroup_: function (row) {
        switch (row.Group) {
            case undefined:
            case null:
            case "":
                return "Group column is empty";
                break;
            case "A":
            case "B":
            case "C":
                row.Group = row.Group;
                break;
            default:
                return `Unknown group: ${row.Group}`;
        }
    },
    routeInaccessibleOrOwnedByClub: function(row) {
        const response = UrlFetchApp.fetch(row.RouteURL + ".json", { muteHttpExceptions: true });
        let route = JSON.parse(response.getContentText());
        switch (response.getResponseCode()) {
            case 200: if (route.user_id === Globals.SCCCC_USER_ID) {
                return 'Route is owned by SCCCC';
            }
            break;
            case 403: return 'Route URL does not have public access';
            case 404: return `This route cannot be found on the server`;
            default: return "Unknown issue with Route URL";
        }
    },
    badRoute_: function (row) {
        if (row.RouteURL === undefined || row.RouteURL === null) {
            return "No route url"
        }
        let re = /(https:\/\/ridewithgps.com\/routes\/(\d+))/
        let url = row.RouteURL.match(re);
        if (url === null) {
            return "Route URL doesn't match the pattern 'https://ridewithgps.com/routes/DIGITS"
        }
        url = url[1];
        const response = UrlFetchApp.fetch(url + ".json", { muteHttpExceptions: true });
        let route = JSON.parse(response.getContentText());
        switch (response.getResponseCode()) {
            case 200:
                if (route.user_id !== Globals.SCCCC_USER_ID) {
                    return 'Route is not owned by SCCCC';
                }
                break;
            case 403:
                return 'Route URL does not have public access';
                break;
            case 404:
                return `This route cannot be found on the server`;
                break;
            default:
                return "Unknown issue with Route URL";
        }
    },
    // Warnings
    noRideLeader_: function (row, rwgps) {
        if (!row.RideLeaders || row.RideLeaders.length === 0) {
            return `No ride leader given. Defaulting to '${Globals.RIDE_LEADER_TBD_NAME}'`;
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
                const suffix = rls.known.length ? "" : ` Defaulting to ${Globals.RIDE_LEADER_TBD_NAME}`;
                return prefix + suffix;
            } else {
                row.highlightRideLeader(false);
            }
        }
    },
    cancelled_: function (row) {
        if (row.RideName.toLowerCase().startsWith('cancelled')) {
            return 'Cancelled';
        }
    },
    notCancelled: function (row) {
        if (!(row.RideName.toLowerCase().startsWith('cancelled'))) {
            return 'Not cancelled';
        }
    },
    noLocation_: function (row) {
        if (!row.Location || row.Location.startsWith('#')) {
            return "Unknown location";
        }
    },
    noAddress_: function (row) {
        if (!row.Address || row.Address.startsWith('#')) {
            return "Unknown address";
        }
    },
    _inappropiateGroup: function (row) {
        function __inappropriateGroup(group, elevation, distance) {
            switch (group) {
                case 'A':
                    if (elevation < Globals.A_RIDE_MIN_ELEVATION_GAIN) {
                        return `Elevation gain (${elevation}') too low for A group (>= ${Globals.A_RIDE_MIN_ELEVATION_GAIN}')`
                    }
                    if (distance < Globals.A_RIDE_MIN_LENGTH) {
                        return `Distance (${distance} miles) too short for A group (>= ${Globals.A_RIDE_MIN_LENGTH} miles)`
                    }
                    if (distance > Globals.A_RIDE_MAX_LENGTH) {
                        return `Distance (${distance} miles) too long for A group (<= ${Globals.A_RIDE_MAX_LENGTH} miles)`
                    }
                    break;
                case 'B':
                    if (elevation > Globals.B_RIDE_MAX_ELEVATION_GAIN) {
                        return `Elevation gain (${elevation}') too great for B group (<= ${Globals.B_RIDE_MAX_ELEVATION_GAIN}')`
                    }
                    if (distance > Globals.B_RIDE_MAX_LENGTH) {
                        return `Distance (${distance} miles) too long for B group (<= ${Globals.B_RIDE_MAX_LENGTH} miles)`
                    }
                    break;
                case 'C':
                    if (elevation > Globals.C_RIDE_MAX_ELEVATION_GAIN) {
                        return `Elevation gain (${elevation}') too great for C group (<= ${Globals.C_RIDE_MAX_ELEVATION_GAIN}')`
                    }
                    if (distance > Globals.C_RIDE_MAX_LENGTH) {
                        return `Distance (${distance} miles) too long for C group (<= ${Globals.C_RIDE_MAX_LENGTH} miles)`
                    }
                    break;
                default:
                    throw Error(`Unknown group: ${group}. Expected one of 'A', 'B', or 'C'`);
            }
        }
        if (!row.RouteURL) return;
        const response = UrlFetchApp.fetch(row.RouteURL + ".json", { muteHttpExceptions: true });
        const route = JSON.parse(response.getContentText());
        const d = Math.round(route.distance * Globals.METERS_TO_MILES);
        const e = Math.round(route.elevation_gain * Globals.METERS_TO_FEET);
        return __inappropriateGroup(row.Group, e, d);
    },
    alreadyScheduled: function (row) {
        if (row.RideURL !== null) {
            return "This ride has already been scheduled";
        }
    }
}

const errorFuns = [rowCheck.unmanagedRide, rowCheck.noStartDate_, rowCheck.noStartTime_, rowCheck.noGroup_, rowCheck.badRoute_]

const warningFuns = [rowCheck.noRideLeader_, rowCheck.cancelled_, rowCheck.noLocation_, rowCheck.noAddress_, rowCheck._inappropiateGroup]

function evalRow_(row, rwgps, efs = errorFuns, wfs = warningFuns) {
    row.errors = [];
    efs.map(f => f(row, rwgps)).filter(e => e).forEach(e => row.errors.push(e));
    row.warnings = []
    wfs.map(f => f(row, rwgps)).filter(w => w).forEach(w => row.warnings.push(w));
    return row;
}
