const Commands = (() => {
    return Object.freeze({
        cancelSelectedRidesWithCreds(rows, rwgps, force = false) {
            UIManager.processRows(rows, [rowCheck.cancelled, rowCheck.unscheduled], [], rwgps, RideManager.cancelRows, force);
        },
        importSelectedRoutesWithCredentials(rows, rwgps, force = false) {
            UIManager.processRows(rows, [rowCheck.routeInaccessibleOrOwnedByClub], [], rwgps, RideManager.importRows, force);
        },
        linkSelectedRouteUrlsWithCredentials(rows, rwgps, force = false) {
            const errorFuns = [rowCheck.badRoute]
            const warningFuns = []
            UIManager.processRows(rows, errorFuns, warningFuns, rwgps, undefined, force);
        },
        reinstateSelectedRidesWithCreds(rows, rwgps, force = false) {
            UIManager.processRows(rows, [rowCheck.notCancelled], [], rwgps, RideManager.reinstateRows, force);
        },
        scheduleSelectedRidesWithCredentials(rows, rwgps, force = false) {
            const errorFuns = [rowCheck.unmanagedRide, rowCheck.scheduled, rowCheck.noStartDate, rowCheck.noStartTime, rowCheck.noGroup, rowCheck.badRoute, rowCheck.foreignRoute]
            const warningFuns = [rowCheck.noRideLeader, rowCheck.noLocation, rowCheck.noAddress, rowCheck.inappropiateGroup]
            UIManager.processRows(rows, errorFuns, warningFuns, rwgps, RideManager.scheduleRows, force);
        },
        unscheduleSelectedRidesWithCreds(rows, rwgps, force = false) {
            UIManager.processRows(rows, [rowCheck.unscheduled, rowCheck.unmanagedRide], [], rwgps, RideManager.unscheduleRows, force);
        },
        updateRiderCountWithCreds(rows, rwgps, force = false) {
            const logName = "Schedule.getYoungerRows"
            console.time(logName)
            const refDate = dates.add(new Date(), - 1)
            rows = Schedule.getYoungerRows(refDate);
            console.log(`${rows.length} rows found younger than ${refDate}`)
            console.timeEnd(logName)
            RideManager.updateRiderCounts(rows, rwgps, force);
            Schedule.save();
        },
        updateSelectedRidesWithCredentials(rows, rwgps, force = false) {
          const errorFuns = 
                [rowCheck.cancelled, rowCheck.unscheduled, rowCheck.unmanagedRide, rowCheck.noStartDate, rowCheck.noStartTime, rowCheck.noGroup, rowCheck.badRoute, rowCheck.foreignRoute]
          const warningFuns = [rowCheck.noRideLeader, rowCheck.noLocation, rowCheck.noAddress, rowCheck.inappropiateGroup]
            UIManager.processRows(rows, errorFuns, warningFuns, rwgps, RideManager.updateRows, force);
        },
    })
})()

if (typeof module !== 'undefined') {
    module.exports = Commands;
}