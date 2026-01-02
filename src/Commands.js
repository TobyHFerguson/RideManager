// @ts-check
/// <reference path="./gas-globals.d.ts" />
if (typeof require !== 'undefined') {
    var dates = require('./common/dates');
}

/**
 * @typedef {import('./Externals').RWGPS} RWGPS
 */

const Commands = (() => {
    return Object.freeze({
        /**
         * @param {InstanceType<typeof RowCore>[]} rows
         * @param {RWGPS} rwgps
         * @param {boolean} [force]
         */
        cancelSelectedRidesWithCreds(rows, rwgps, force = false) {
            // Check if any rows have announcements that need special handling
            const rowsWithAnnouncements = rows.filter((/** @type {InstanceType<typeof RowCore>} */ r) => r.announcement && r.status);
            
            if (rowsWithAnnouncements.length > 0 && !force) {
                // Handle cancellation with UI for announcements
                // @ts-expect-error - Method may not exist in all versions
                UIManager.processCancellationWithAnnouncements(rows, rwgps);
            } else {
                // Standard cancellation flow
                UIManager.processRows(rows, [rowCheck.cancelled, rowCheck.unscheduled], [], rwgps, RideManager.cancelRows, force);
            }
        },
        /**
         * @param {InstanceType<typeof RowCore>[]} rows
         * @param {RWGPS} rwgps
         * @param {boolean} force
         */
        importSelectedRoutesWithCredentials(rows, rwgps, force = false) {
            UIManager.processRows(rows, [rowCheck.routeInaccessibleOrOwnedByClub], [], rwgps, RideManager.importRows, force);
        },
        /**
         * @param {InstanceType<typeof RowCore>[]} rows
         * @param {RWGPS} rwgps
         * @param {boolean} [force]
         */
        reinstateSelectedRidesWithCreds(rows, rwgps, force = false) {
            // Check if any rows have announcements that need special handling
            const rowsWithAnnouncements = rows.filter((/** @type {InstanceType<typeof RowCore>} */ r) => r.announcement && r.status === 'cancelled');
            
            if (rowsWithAnnouncements.length > 0 && !force) {
                // Handle reinstatement with UI for announcements
                // @ts-expect-error - Method may not exist in all versions
                UIManager.processReinstatementWithAnnouncements(rows, rwgps);
            } else {
                // Standard reinstatement flow
                UIManager.processRows(rows, [rowCheck.notCancelled], [], rwgps, RideManager.reinstateRows, force);
            }
        },
        /**
         * @param {InstanceType<typeof RowCore>[]} rows
         * @param {RWGPS} rwgps
         * @param {boolean} [force]
         */
        scheduleSelectedRidesWithCredentials(rows, rwgps, force = false) {
            const errorFuns = [rowCheck.unmanagedRide, rowCheck.scheduled, rowCheck.noStartDate, rowCheck.noStartTime, rowCheck.noGroup, rowCheck.badRoute, rowCheck.foreignRoute]
            const warningFuns = [rowCheck.noRideLeader, rowCheck.noLocation, rowCheck.noAddress, rowCheck.inappropiateGroup]
            UIManager.processRows(rows, errorFuns, warningFuns, rwgps, RideManager.scheduleRows, force);
        },
        /**
         * @param {InstanceType<typeof RowCore>[]} rows
         * @param {RWGPS} rwgps
         * @param {boolean} [force]
         */
        unscheduleSelectedRidesWithCreds(rows, rwgps, force = false) {
            UIManager.processRows(rows, [rowCheck.unscheduled, rowCheck.unmanagedRide], [], rwgps, RideManager.unscheduleRows, force);
        },
        /**
         * @param {InstanceType<typeof RowCore>[]} rows
         * @param {RWGPS} rwgps
         * @param {boolean} [force]
         */
        updateSelectedRidesWithCredentials(rows, rwgps, force = false) {
          const errorFuns = 
                [rowCheck.unscheduled, rowCheck.unmanagedRide, rowCheck.noStartDate, rowCheck.noStartTime, rowCheck.noGroup, rowCheck.badRoute, rowCheck.foreignRoute]
          const warningFuns = [rowCheck.noRideLeader, rowCheck.noLocation, rowCheck.noAddress, rowCheck.inappropiateGroup]
            UIManager.processRows(rows, errorFuns, warningFuns, rwgps, RideManager.updateRows, force);
        },
    })
})()

if (typeof module !== 'undefined') {
    module.exports = Commands;
}