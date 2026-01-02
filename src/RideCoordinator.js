// @ts-check
/// <reference path="./gas-globals.d.ts" />

if (typeof require !== 'undefined') {
    var dates = require('./common/dates');
    var ValidationCore = require('./ValidationCore');
    var UIHelper = require('./UIHelper');
}

/**
 * @typedef {import('./Externals').RWGPS} RWGPS
 * @typedef {InstanceType<typeof RowCore>} RowCoreInstance
 */

/**
 * Orchestration layer for ride operations
 * Implements validate → confirm → execute pattern for all operations
 */
var RideCoordinator = (function() {
    const RideCoordinator = {
        /**
         * Schedule rides operation
         * @param {RowCoreInstance[]} rows - Rows to schedule
         * @param {RWGPS} rwgps - RWGPS service
         * @param {InstanceType<typeof ScheduleAdapter>} adapter - Persistence adapter
         * @param {boolean} [force] - Skip user confirmation
         */
        scheduleRides(rows, rwgps, adapter, force = false) {
            try {
                // 1. Validate
                const validation = ValidationCore.validateForScheduling(rows, {
                    groupNames: getGroupNames(),
                    getRoute: getRoute,
                    clubUserId: getGlobals().SCCCC_USER_ID,
                    managedEventName: SCCCCEvent.managedEventName,
                    convertDate: dates.convert
                });

                // 2. Get user confirmation
                const confirmation = UIHelper.confirmOperation({
                    operationName: 'Schedule Rides',
                    rows,
                    validation,
                    force
                });

                if (!confirmation.confirmed) {
                    return;
                }

                // 3. Execute operation
                RideManager.scheduleRows(confirmation.processableRows, rwgps);

                // 4. Save changes (handled by adapter's dirty tracking)
                // adapter.save() is called in finally block of executeCommand

                // 5. Show success
                UIHelper.showSuccess(`Successfully scheduled ${confirmation.processableRows.length} ride(s).`);

            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                console.error('RideCoordinator.scheduleRides error:', err);
                UIHelper.showError('Schedule Failed', err);
                throw err;
            }
        },

        /**
         * Cancel rides operation
         * @param {RowCoreInstance[]} rows - Rows to cancel
         * @param {RWGPS} rwgps - RWGPS service
         * @param {InstanceType<typeof ScheduleAdapter>} adapter - Persistence adapter
         * @param {boolean} [force] - Skip user confirmation
         */
        cancelRides(rows, rwgps, adapter, force = false) {
            try {
                // 1. Validate
                const validation = ValidationCore.validateForCancellation(rows, {
                    groupNames: getGroupNames(),
                    managedEventName: SCCCCEvent.managedEventName
                });

                // 2. Check for rows with announcements
                const rowsWithAnnouncements = rows.filter(r => {
                    const v = validation.get(r);
                    return v && v.errors.length === 0 && r.announcement && r.status;
                });

                // 3. Get user confirmation (with announcement handling if needed)
                let confirmation;
                if (rowsWithAnnouncements.length > 0 && !force) {
                    confirmation = UIHelper.confirmCancellationWithAnnouncements(
                        rows,
                        validation,
                        rowsWithAnnouncements
                    );

                    if (!confirmation.confirmed) {
                        return;
                    }

                    // Process each row with announcement individually
                    let cancelled = 0;
                    /** @type {string[]} */
                    const results = [];

                    for (const row of confirmation.processableRows) {
                        try {
                            if (!row.announcement || !row.status) {
                                // No announcement - simple cancellation
                                RideManager.cancelRows([row], rwgps, false, '');
                                cancelled++;
                                results.push(`Row ${row.rowNum}: Cancelled`);
                            } else if (confirmation.sendCancellationNotice) {
                                // Get cancellation reason
                                const reasonPrompt = UIHelper.promptForCancellationReason(row);
                                if (reasonPrompt.cancelled) {
                                    continue; // User cancelled for this row
                                }

                                // Cancel with email
                                RideManager.cancelRows([row], rwgps, true, reasonPrompt.reason);
                                cancelled++;
                                results.push(`Row ${row.rowNum}: Cancelled (notice sent)`);
                            } else {
                                // Cancel without email
                                RideManager.cancelRows([row], rwgps, false, '');
                                cancelled++;
                                results.push(`Row ${row.rowNum}: Cancelled (no notice)`);
                            }
                        } catch (error) {
                            const err = error instanceof Error ? error : new Error(String(error));
                            results.push(`Row ${row.rowNum}: ERROR - ${err.message}`);
                            console.error(`Error cancelling row ${row.rowNum}:`, error);
                        }
                    }

                    // Show results
                    if (results.length > 0) {
                        const resultMsg = `Cancellation Complete\n\n${cancelled} ride(s) cancelled.\n\n` +
                            `Details:\n${results.join('\n')}`;
                        SpreadsheetApp.getUi().alert('Cancellation Results', resultMsg, SpreadsheetApp.getUi().ButtonSet.OK);
                    }

                } else {
                    // No announcements or force mode - standard flow
                    confirmation = UIHelper.confirmOperation({
                        operationName: 'Cancel Rides',
                        rows,
                        validation,
                        force
                    });

                    if (!confirmation.confirmed) {
                        return;
                    }

                    // Execute operation
                    RideManager.cancelRows(confirmation.processableRows, rwgps, false, '');
                    UIHelper.showSuccess(`Successfully cancelled ${confirmation.processableRows.length} ride(s).`);
                }

            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                console.error('RideCoordinator.cancelRides error:', err);
                UIHelper.showError('Cancellation Failed', err);
                throw err;
            }
        },

        /**
         * Update rides operation
         * @param {RowCoreInstance[]} rows - Rows to update
         * @param {RWGPS} rwgps - RWGPS service
         * @param {InstanceType<typeof ScheduleAdapter>} adapter - Persistence adapter
         * @param {boolean} [force] - Skip user confirmation
         */
        updateRides(rows, rwgps, adapter, force = false) {
            try {
                // 1. Validate
                const validation = ValidationCore.validateForUpdate(rows, {
                    groupNames: getGroupNames(),
                    getRoute: getRoute,
                    clubUserId: getGlobals().SCCCC_USER_ID,
                    managedEventName: SCCCCEvent.managedEventName,
                    convertDate: dates.convert
                });

                // 2. Get user confirmation
                const confirmation = UIHelper.confirmOperation({
                    operationName: 'Update Rides',
                    rows,
                    validation,
                    force
                });

                if (!confirmation.confirmed) {
                    return;
                }

                // 3. Execute operation
                RideManager.updateRows(confirmation.processableRows, rwgps);

                // 4. Show success
                UIHelper.showSuccess(`Successfully updated ${confirmation.processableRows.length} ride(s).`);

            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                console.error('RideCoordinator.updateRides error:', err);
                UIHelper.showError('Update Failed', err);
                throw err;
            }
        },

        /**
         * Reinstate rides operation
         * @param {RowCoreInstance[]} rows - Rows to reinstate
         * @param {RWGPS} rwgps - RWGPS service
         * @param {InstanceType<typeof ScheduleAdapter>} adapter - Persistence adapter
         * @param {boolean} [force] - Skip user confirmation
         */
        reinstateRides(rows, rwgps, adapter, force = false) {
            try {
                // 1. Validate
                const validation = ValidationCore.validateForReinstatement(rows, {
                    groupNames: getGroupNames(),
                    managedEventName: SCCCCEvent.managedEventName
                });

                // 2. Check for rows with announcements
                const rowsWithAnnouncements = rows.filter(r => {
                    const v = validation.get(r);
                    return v && v.errors.length === 0 && r.announcement && r.status === 'cancelled';
                });

                // 3. Get user confirmation (with announcement handling if needed)
                let confirmation;
                if (rowsWithAnnouncements.length > 0 && !force) {
                    confirmation = UIHelper.confirmReinstatementWithAnnouncements(
                        rows,
                        validation,
                        rowsWithAnnouncements
                    );

                    if (!confirmation.confirmed) {
                        return;
                    }

                    // Process each row with announcement individually
                    let reinstated = 0;
                    /** @type {string[]} */
                    const results = [];

                    for (const row of confirmation.processableRows) {
                        try {
                            if (!row.announcement || !row.status || row.status !== 'cancelled') {
                                // No announcement - simple reinstatement
                                RideManager.reinstateRows([row], rwgps, false, '');
                                reinstated++;
                                results.push(`Row ${row.rowNum}: Reinstated`);
                            } else if (confirmation.sendReinstatementNotice) {
                                // Get reinstatement reason
                                const reasonPrompt = UIHelper.promptForReinstatementReason(row);
                                if (reasonPrompt.cancelled) {
                                    continue; // User cancelled for this row
                                }

                                // Reinstate with email
                                RideManager.reinstateRows([row], rwgps, true, reasonPrompt.reason);
                                reinstated++;
                                results.push(`Row ${row.rowNum}: Reinstated (notice sent)`);
                            } else {
                                // Reinstate without email
                                RideManager.reinstateRows([row], rwgps, false, '');
                                reinstated++;
                                results.push(`Row ${row.rowNum}: Reinstated (no notice)`);
                            }
                        } catch (error) {
                            const err = error instanceof Error ? error : new Error(String(error));
                            results.push(`Row ${row.rowNum}: ERROR - ${err.message}`);
                            console.error(`Error reinstating row ${row.rowNum}:`, error);
                        }
                    }

                    // Show results
                    if (results.length > 0) {
                        const resultMsg = `Reinstatement Complete\n\n${reinstated} ride(s) reinstated.\n\n` +
                            `Details:\n${results.join('\n')}`;
                        SpreadsheetApp.getUi().alert('Reinstatement Results', resultMsg, SpreadsheetApp.getUi().ButtonSet.OK);
                    }

                } else {
                    // No announcements or force mode - standard flow
                    confirmation = UIHelper.confirmOperation({
                        operationName: 'Reinstate Rides',
                        rows,
                        validation,
                        force
                    });

                    if (!confirmation.confirmed) {
                        return;
                    }

                    // Execute operation
                    RideManager.reinstateRows(confirmation.processableRows, rwgps, false, '');
                    UIHelper.showSuccess(`Successfully reinstated ${confirmation.processableRows.length} ride(s).`);
                }

            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                console.error('RideCoordinator.reinstateRides error:', err);
                UIHelper.showError('Reinstatement Failed', err);
                throw err;
            }
        },

        /**
         * Unschedule rides operation
         * @param {RowCoreInstance[]} rows - Rows to unschedule
         * @param {RWGPS} rwgps - RWGPS service
         * @param {InstanceType<typeof ScheduleAdapter>} adapter - Persistence adapter
         * @param {boolean} [force] - Skip user confirmation
         */
        unscheduleRides(rows, rwgps, adapter, force = false) {
            try {
                // 1. Validate
                const validation = ValidationCore.validateForUnschedule(rows, {
                    groupNames: getGroupNames(),
                    managedEventName: SCCCCEvent.managedEventName
                });

                // 2. Get user confirmation
                const confirmation = UIHelper.confirmOperation({
                    operationName: 'Unschedule Rides',
                    rows,
                    validation,
                    force
                });

                if (!confirmation.confirmed) {
                    return;
                }

                // 3. Execute operation
                RideManager.unscheduleRows(confirmation.processableRows, rwgps);

                // 4. Show success
                UIHelper.showSuccess(`Successfully unscheduled ${confirmation.processableRows.length} ride(s).`);

            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                console.error('RideCoordinator.unscheduleRides error:', err);
                UIHelper.showError('Unschedule Failed', err);
                throw err;
            }
        },

        /**
         * Import routes operation
         * @param {RowCoreInstance[]} rows - Rows to import
         * @param {RWGPS} rwgps - RWGPS service
         * @param {InstanceType<typeof ScheduleAdapter>} adapter - Persistence adapter
         * @param {boolean} [force] - Skip user confirmation
         */
        importRoutes(rows, rwgps, adapter, force = false) {
            try {
                // 1. Validate
                const validation = ValidationCore.validateForRouteImport(rows, {
                    fetchUrl: (url, muteHttpExceptions) => {
                        return UrlFetchApp.fetch(url, { muteHttpExceptions: muteHttpExceptions });
                    },
                    clubUserId: getGlobals().SCCCC_USER_ID
                });

                // 2. Get user confirmation
                const confirmation = UIHelper.confirmOperation({
                    operationName: 'Import Routes',
                    rows,
                    validation,
                    force
                });

                if (!confirmation.confirmed) {
                    return;
                }

                // 3. Execute operation
                RideManager.importRows(confirmation.processableRows, rwgps);

                // 4. Show success
                UIHelper.showSuccess(`Successfully imported ${confirmation.processableRows.length} route(s).`);

            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                console.error('RideCoordinator.importRoutes error:', err);
                UIHelper.showError('Import Failed', err);
                throw err;
            }
        }
    };

    return RideCoordinator;
})();

if (typeof module !== 'undefined') {
    module.exports = RideCoordinator;
}
