const errorFuns = [
    function noStartDate_(row) {
        if (row.StartDate === undefined || row.StartDate.constructor !== Date) {
            return "No Start Date"
        }
    },
    function noStartTime_(row) {
        if (row.StartTime === undefined || row.StartTime.constructor !== Date) {
            return "No Start Time"
        }
    },
    function noGroup_(row) {
        switch (row.Group) {
            case undefined:
            case null:
            case "":
                return "Group column is empty";
                break;
            case "A":
            case "B":
            case "C":
                row.group = row.Group;
                break;
            default:
                return `Unknown group: ${row.Group}`;
        }
    },
    function nonClubRoute_(row) {
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
        switch (response.getResponseCode()) {
            case 200:
                if (JSON.parse(response.getContentText()).user_id !== SCCCC_USER_ID) {
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
    function noLocation_(row) {
        if (row.Location === undefined || row.Location === null || row.Location === "" || row.Location === "#VALUE!" || row.Location === "#N/A") {
            return "No location";
        }
    },
    function noAddress_(row) {
        if (row.Address === undefined || row.Address === null || row.Address === "" || row.Address === "#VALUE!" || row.Location === "#N/A") {
            return "No address";
        }
    }
]

const warningFuns = [
    function rideLeaderCheck_(row, rwgps) {
        if (!row.RideLeader) {
            return `No ride leader given. Defaulting to '${RIDE_LEADER_TBD_NAME}'`;
        } else {
            const unknownRideLeaders = row.RideLeader.split(',').map(rl => rl.trim()).filter(rl => !rwgps.knownRideLeader(rl));
            if (unknownRideLeaders.length > 0) {
                row.highlightRideLeader(true);
                return `Ride Leader${unknownRideLeaders.length > 1 ? 's' : ''} (${unknownRideLeaders.join(', ')}) unknown. Defaulting to '${RIDE_LEADER_TBD_NAME}'`
            } else {
                row.highlightRideLeader(false);
            }
        }
    }
]

function evalRow_(row, rwgps) {
    row.errors = [];
    errorFuns.map(f => f(row, rwgps)).filter(e => e !== undefined).forEach(e => row.errors.push(e));
    row.warnings = []
    warningFuns.map(f => f(row, rwgps)).filter(w => w !== undefined).forEach(w => row.warnings.push(w));;
}
