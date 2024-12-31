const Commands = (() => {
    return Object.freeze({
        cancelSelectedRidesWithCreds(rows, rwgps) {
            UIManager.processRows(rows, [rowCheck.cancelled, rowCheck.unscheduled], [], rwgps, RideManager.cancelRows);
        },
        importSelectedRoutesWithCredentials(rows, rwgps) {
            UIManager.processRows(rows, [rowCheck.routeInaccessibleOrOwnedByClub], [], rwgps, RideManager.importRows);
        },
        linkSelectedRouteUrlsWithCredentials(rows, rwgps) {
            const errorFuns = [rowCheck.badRoute]
            const warningFuns = []
            UIManager.processRows(rows, errorFuns, warningFuns, rwgps);
        },
        reinstateSelectedRidesWithCreds(rows, rwgps) {
            UIManager.processRows(rows, [rowCheck.notCancelled], [], rwgps, RideManager.reinstateRows);
        },
        scheduleSelectedRidesWithCredentials(rows, rwgps) {
            const errorFuns = [rowCheck.unmanagedRide, rowCheck.scheduled, rowCheck.noStartDate, rowCheck.noStartTime, rowCheck.noGroup, rowCheck.badRoute]
            const warningFuns = [rowCheck.noRideLeader, rowCheck.noLocation, rowCheck.noAddress, rowCheck.inappropiateGroup]
            UIManager.processRows(rows, errorFuns, warningFuns, rwgps, RideManager.scheduleRows);

        },
        unscheduleSelectedRidesWithCreds(rows, rwgps) {
            UIManager.processRows(rows, [rowCheck.unscheduled, rowCheck.unmanagedRide], [], rwgps, RideManager.unscheduleRows);
        },
        updateRiderCountWithCreds(rows, rwgps) {
            const logName = "Schedule.getYoungerRows"
            console.time(logName)
            const refDate = dates.add(new Date(), - 1)
            rows = Schedule.getYoungerRows(refDate);
            console.log(`${rows.length} rows found younger than ${refDate}`)
            console.timeEnd(logName)
            RideManager.updateRiderCounts(rows, rwgps);
            Schedule.save();

        },
        updateSelectedRidesWithCredentials(rows, rwgps) {
            UIManager.processRows(rows,
                [rowCheck.cancelled, rowCheck.unscheduled, rowCheck.unmanagedRide, rowCheck.noStartDate, rowCheck.noStartTime, rowCheck.noGroup, rowCheck.badRoute],
                [rowCheck.noRideLeader, rowCheck.noLocation, rowCheck.noAddress, rowCheck.inappropiateGroup], rwgps, RideManager.updateRows);
        },
    })
})()

if (typeof module !== 'undefined') {
    module.exports = Commands;
}