// @ts-check
/// <reference path="./gas-globals.d.ts" />
if (typeof require !== 'undefined') {
    var dates = require('./common/dates');
}

const Commands = (() => {
    return Object.freeze({
        /**
         * @param {Row[]} rows
         * @param {any} rwgps
         * @param {boolean} [force]
         */
        cancelSelectedRidesWithCreds(rows, rwgps, force = false) {
            // Check if any rows have announcements that need special handling
            const rowsWithAnnouncements = rows.filter((/** @type {Row} */ r) => r.Announcement && r.Status);
            
            if (rowsWithAnnouncements.length > 0 && !force) {
                // Handle cancellation with UI for announcements
                UIManager.processCancellationWithAnnouncements(rows, rwgps);
            } else {
                // Standard cancellation flow
                UIManager.processRows(rows, [rowCheck.cancelled, rowCheck.unscheduled], [], rwgps, RideManager.cancelRows, force);
            }
        },
        importSelectedRoutesWithCredentials(rows, rwgps, force = false) {
            UIManager.processRows(rows, [rowCheck.routeInaccessibleOrOwnedByClub], [], rwgps, RideManager.importRows, force);
        },
        reinstateSelectedRidesWithCreds(rows, rwgps, force = false) {
            // Check if any rows have announcements that need special handling
            const rowsWithAnnouncements = rows.filter(r => r.Announcement && r.Status === 'cancelled');
            
            if (rowsWithAnnouncements.length > 0 && !force) {
                // Handle reinstatement with UI for announcements
                UIManager.processReinstatementWithAnnouncements(rows, rwgps);
            } else {
                // Standard reinstatement flow
                UIManager.processRows(rows, [rowCheck.notCancelled], [], rwgps, RideManager.reinstateRows, force);
            }
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
            const logName = "ScheduleAdapter.loadYoungerRows"
            console.time(logName)
            const refDate = dates.add(new Date(), - 1)
            
            // Create adapter and load younger rows
            const adapter = new ScheduleAdapter();
            rows = adapter.loadYoungerRows(refDate);
            
            console.log(`${rows.length} rows found younger than ${refDate}`)
            console.timeEnd(logName)
            RideManager.updateRiderCounts(rows, rwgps);
            
            // Save dirty rows
            adapter.save();
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