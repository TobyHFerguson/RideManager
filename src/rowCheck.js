// @ts-check
/// <reference path="./gas-globals.d.ts" />
if (typeof require !== 'undefined') {
    var dates = require('./common/dates');
}

const rowCheck = {
    /**
     * @param {InstanceType<typeof RowCore>} row
     */
    unmanagedRide: function (row) {
        if (!SCCCCEvent.managedEventName(row.rideName, getGroupNames())) {
            return "Ride is unmanaged";
        }
    },
    /**
     * @param {InstanceType<typeof RowCore>} row
     */
    unscheduled: function (row) {
        if (!row.rideURL) {
            return "Ride has not been scheduled";
        }
    },
    /**
     * @param {InstanceType<typeof RowCore>} row
     */
    noStartDate: function (row) {
        if ((!row.startDate) || (dates.convert(row.startDate).toString() === "Invalid Date")) {
            return `Invalid row.startDate: "${row.startDate} ${dates.convert(row.startDate)}"`
        }
    },
    /**
     * @param {InstanceType<typeof RowCore>} row
     */
    noStartTime: function (row) {
        if ((!row.startTime) || (dates.convert(row.startTime).toString() === "Invalid Date")) {
            return `Invalid row.startTime: "${row.startTime} ${dates.convert(row.startTime)}"`
        }
    },
    /**
     * @param {InstanceType<typeof RowCore>} row
     */
    noGroup: function (row) {
        if (!row.group) return "Group column is empty";
        const groups = getGroupNames();
        if (!groups.includes(row.group)) {
            return `Unknown group: '${row.group}'. Expected one of ${groups.join(', ')}`;
        }
    },
    /**
     * @param {InstanceType<typeof RowCore>} row
     */
    routeInaccessibleOrOwnedByClub: function (row) {
        const url = row.routeURL ? row.routeURL : row.routeName;
        if (!url) {
            return `No Route URL in row ${row.rowNum}. Are you sure you've selected the right row?`
        }
        try {
            const response = UrlFetchApp.fetch(url + ".json", { muteHttpExceptions: false });

            switch (response.getResponseCode()) {
                case 200:
                    let route = JSON.parse(response.getContentText());
                    if (route.user_id === getGlobals().SCCCC_USER_ID) {
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
    /**
     * @param {InstanceType<typeof RowCore>} row
     */
    badRoute: function (row) {
        try {
            getRoute(row.routeURL);
        }
        catch (e) {
            const err = e instanceof Error ? e : new Error(String(e));
            return err.message;
        }
    },
    // Warnings
    /**
     * @param {InstanceType<typeof RowCore>} row
     * @param {any} rwgps
     */
    noRideLeader: function (row, rwgps) {
        if (!row.leaders || row.leaders.length === 0) {
            return `No ride leader given. Defaulting to '${getGlobals().RIDE_LEADER_TBD_NAME}'`;
        } else {
            const rls = row.leaders.reduce((/** @type {{known: any[], unknown: any[]}} */ p, /** @type {any} */ rl) => {
                if (rwgps.knownRideLeader(rl)) {
                    p.known.push(rl)
                } else {
                    p.unknown.push(rl)
                };
                return p;
            },
                { known: [], unknown: [] });

            if (rls.unknown.length) {
                // TODO: Highlighting removed during Row → RowCore refactoring
                // Cell highlighting should be handled separately from validation logic
                // row.highlightRideLeader(true);
                const prefix = `${rls.known.length ? "Some" : "All"} Ride Leaders (${rls.unknown.join(', ')}) unknown.`
                const suffix = rls.known.length ? "" : ` Defaulting to ${getGlobals().RIDE_LEADER_TBD_NAME}`;
                return prefix + suffix;
            } else {
                // TODO: Highlighting removed during Row → RowCore refactoring
                // row.highlightRideLeader(false);
            }
        }
    },
    /**
     * @param {InstanceType<typeof RowCore>} row
     */
    notCancelled: function (row) {
        if (!(row.rideName.toLowerCase().startsWith('cancelled'))) {
            return 'Operation not permitted when ride is not cancelled';
        }
    },
    /**
     * @param {InstanceType<typeof RowCore>} row
     */
    cancelled: function (row) {
        if (row.rideName.toLowerCase().startsWith('cancelled')) {
            return 'Operation not permitted on cancelled ride';
        }
    },
    /**
     * @param {InstanceType<typeof RowCore>} row
     */
    noLocation: function (row) {
        if (!row.location || row.location.startsWith('#')) {
            return "Unknown location";
        }
    },
    /**
     * @param {InstanceType<typeof RowCore>} row
     */
    noAddress: function (row) {
        if (!row.address || row.address.startsWith('#')) {
            return "Unknown address";
        }
    },
    /**
     * @param {InstanceType<typeof RowCore>} row
     */
    inappropiateGroup: function (row) {
        const nrg = this.noGroup(row);
        if (nrg) return nrg;
        /**
         * @param {string} groupName
         * @param {number} elevation
         * @param {number} distance
         */
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

        if (!row.routeURL) return;
        const response = UrlFetchApp.fetch(row.routeURL + ".json", { muteHttpExceptions: true });
        const route = JSON.parse(response.getContentText());
        const d = Math.round(route.distance * getGlobals().METERS_TO_MILES);
        const e = Math.round(route.elevation_gain * getGlobals().METERS_TO_FEET);
        return __inappropriateGroup(row.group, e, d);
    },
    /**
     * @param {InstanceType<typeof RowCore>} row
     */
    scheduled: function (row) {
        if (row.rideURL) {
            return "This ride has already been scheduled";
        }
    },
    /**
     * @param {InstanceType<typeof RowCore>} row
     */
    foreignRoute: function (row) {
        try {
            const route = getRoute(row.routeURL)
            if (route.user_id !== getGlobals().SCCCC_USER_ID) {
                return 'Route is not owned by SCCCC';
            }
        } catch (e) {
            const err = e instanceof Error ? e : new Error(String(e));
            return err.message;
        }
    }
}

const errorFuns = [rowCheck.unmanagedRide, rowCheck.noStartDate, rowCheck.noStartTime, rowCheck.noGroup, rowCheck.badRoute, rowCheck.scheduled]

const warningFuns = [rowCheck.noRideLeader, rowCheck.cancelled, rowCheck.noLocation, rowCheck.noAddress, rowCheck.inappropiateGroup, rowCheck.foreignRoute]

/**
 * Evaluate multiple rows for errors and warnings
 * @param {any} rows - Rows to evaluate
 * @param {any} rwgps - RWGPS API interface
 * @param {any} efs - Error functions to apply
 * @param {any} wfs - Warning functions to apply
 */
function evalRows(rows, rwgps, efs = errorFuns, wfs = warningFuns) {
    /**
     * @param {any} row
     * @param {any} rwgps
     * @param {any} efs
     * @param {any} wfs
     */
    function evalRow_(row, rwgps, efs, wfs) {
        row.errors = [];
        efs.map((/** @type {any} */ f) => f.bind(rowCheck)).map((/** @type {any} */ f) => f(row, rwgps)).filter((/** @type {any} */ e) => e).forEach((/** @type {any} */ e) => row.errors.push(e));
        row.warnings = []
        wfs.map((/** @type {any} */ f) => f.bind(rowCheck)).map((/** @type {any} */ f) => f(row, rwgps)).filter((/** @type {any} */ w) => w).forEach((/** @type {any} */ w) => row.warnings.push(w));
        return row;
    }

    return rows.map((/** @type {InstanceType<typeof RowCore>} */ row) => evalRow_(row, rwgps, efs, wfs));
}



