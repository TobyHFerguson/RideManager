// @ts-check
/// <reference path="./gas-globals.d.ts" />

if (typeof require !== 'undefined') {
    var dates = require('./common/dates');
    // Note: ValidationCore and UIHelper are NOT imported here because:
    // 1. In GAS runtime, they are available as global classes
    // 2. In tests, they need to be mocked/injected by the test setup
    // 3. Importing them shadows the global and breaks TypeScript resolution
}

/**
 * @typedef {import('./Externals').RWGPS} RWGPS
 * @typedef {InstanceType<typeof RowCore>} RowCoreInstance
 */

/**
 * Helper: Wrap dates.convert to ensure Date return type (throw on NaN)
 * @param {any} date - Date input
 * @returns {Date} Date object
 * @throws {Error} If date cannot be converted
 */
function convertToDate(date) {
    const result = dates.convert(date);
    if (typeof result === 'number') {
        throw new Error(`Invalid date: ${date}`);
    }
    return result;
}

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
                // NOTE: validateForScheduling exists in ValidationCore (see ValidationCore.d.ts:59, test coverage: TBD)
                // TypeScript error is false positive due to namespace export pattern
                const validation = ValidationCore.validateForScheduling(rows, {
                    groupNames: getGroupNames(),
                    getRoute: getRoute,
                    clubUserId: getGlobals().SCCCC_USER_ID,
                    managedEventName: SCCCCEvent.managedEventName,
                    convertDate: convertToDate
                });

                // 2. Get user confirmation
                // NOTE: confirmOperation exists in UIHelper (see UIHelper.d.ts:53, implementation: UIHelper.js:25)
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
                // NOTE: showSuccess exists in UIHelper (see UIHelper.d.ts:69, implementation: UIHelper.js:86)
                UIHelper.showSuccess(`Successfully scheduled ${confirmation.processableRows.length} ride(s).`);

            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                console.error('RideCoordinator.scheduleRides error:', err);
                // NOTE: showError exists in UIHelper (see UIHelper.d.ts:74, implementation: UIHelper.js:90)
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
                // NOTE: validateForCancellation exists in ValidationCore (see ValidationCore.d.ts:68, implementation: ValidationCore.js)
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
                    // NOTE: confirmCancellationWithAnnouncements exists in UIHelper (see UIHelper.d.ts:79, implementation: UIHelper.js:117)
                    confirmation = UIHelper.confirmCancellationWithAnnouncements(
                        rows,
                        validation,
                        rowsWithAnnouncements
                    );

                    if (!confirmation.confirmed) {
                        return;
                    }

                    // Get cancellation reason if sending notices
                    let cancellationReason = '';
                    if (confirmation.sendCancellationNotice) {
                        // NOTE: promptForCancellationReason exists in UIHelper (see UIHelper.d.ts:93, implementation: UIHelper.js:163)
                        const reasonPrompt = UIHelper.promptForCancellationReason();
                        if (reasonPrompt.cancelled) {
                            return; // User cancelled the operation
                        }
                        cancellationReason = reasonPrompt.reason;
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
                                // Cancel with email using the shared reason
                                RideManager.cancelRows([row], rwgps, true, cancellationReason);
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
                    // NOTE: confirmOperation exists in UIHelper (see UIHelper.js, test coverage required)
                    // TypeScript error is false positive due to namespace export pattern
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
                    // NOTE: showSuccess exists in UIHelper (see UIHelper.d.ts:69, implementation: UIHelper.js:86)
                    UIHelper.showSuccess(`Successfully cancelled ${confirmation.processableRows.length} ride(s).`);
                }

            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                console.error('RideCoordinator.cancelRides error:', err);
                // NOTE: showError exists in UIHelper (see UIHelper.d.ts:74, implementation: UIHelper.js:90)
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
                // NOTE: validateForUpdate exists in ValidationCore (see ValidationCore.d.ts:77)
                const validation = ValidationCore.validateForUpdate(rows, {
                    groupNames: getGroupNames(),
                    getRoute: getRoute,
                    clubUserId: getGlobals().SCCCC_USER_ID,
                    managedEventName: SCCCCEvent.managedEventName,
                    convertDate: convertToDate
                });

                // 2. Get user confirmation
                // NOTE: confirmOperation exists in UIHelper (see UIHelper.d.ts:53)
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
                // NOTE: showSuccess exists in UIHelper (see UIHelper.d.ts:69)
                UIHelper.showSuccess(`Successfully updated ${confirmation.processableRows.length} ride(s).`);

            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                console.error('RideCoordinator.updateRides error:', err);
                // NOTE: showError exists in UIHelper (see UIHelper.d.ts:74)
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
                // NOTE: validateForReinstatement exists in ValidationCore (see ValidationCore.d.ts:86)
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
                    // NOTE: confirmReinstatementWithAnnouncements exists in UIHelper (see UIHelper.d.ts:84)
                    confirmation = UIHelper.confirmReinstatementWithAnnouncements(
                        rows,
                        validation,
                        rowsWithAnnouncements
                    );

                    if (!confirmation.confirmed) {
                        return;
                    }

                    // Get reinstatement reason if sending notices
                    let reinstatementReason = '';
                    if (confirmation.sendReinstatementNotice) {
                        // NOTE: promptForReinstatementReason exists in UIHelper (see UIHelper.d.ts:98)
                        const reasonPrompt = UIHelper.promptForReinstatementReason();
                        if (reasonPrompt.cancelled) {
                            return; // User cancelled the operation
                        }
                        reinstatementReason = reasonPrompt.reason;
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
                                // Reinstate with email using the shared reason
                                RideManager.reinstateRows([row], rwgps, true, reinstatementReason);
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
                    // NOTE: confirmOperation exists in UIHelper (see UIHelper.js, test coverage required)
                    // TypeScript error is false positive due to namespace export pattern
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
                    // NOTE: showSuccess exists in UIHelper (see UIHelper.d.ts:69)
                    UIHelper.showSuccess(`Successfully reinstated ${confirmation.processableRows.length} ride(s).`);
                }

            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                console.error('RideCoordinator.reinstateRides error:', err);
                // NOTE: showError exists in UIHelper (see UIHelper.d.ts:74)
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
                // NOTE: validateForUnschedule exists in ValidationCore (see ValidationCore.d.ts:95)
                const validation = ValidationCore.validateForUnschedule(rows, {
                    groupNames: getGroupNames(),
                    managedEventName: SCCCCEvent.managedEventName
                });

                // 2. Get user confirmation
                // NOTE: confirmOperation exists in UIHelper (see UIHelper.d.ts:53)
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
                // NOTE: showSuccess exists in UIHelper (see UIHelper.d.ts:69)
                UIHelper.showSuccess(`Successfully unscheduled ${confirmation.processableRows.length} ride(s).`);

            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                console.error('RideCoordinator.unscheduleRides error:', err);
                // NOTE: showError exists in UIHelper (see UIHelper.d.ts:74)
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
                // NOTE: validateForRouteImport exists in ValidationCore (see ValidationCore.d.ts:104)
                const validation = ValidationCore.validateForRouteImport(rows, {
                    fetchUrl: (/** @type {string} */ url, /** @type {boolean} */ muteHttpExceptions) => {
                        return UrlFetchApp.fetch(url, { muteHttpExceptions: muteHttpExceptions });
                    },
                    clubUserId: getGlobals().SCCCC_USER_ID
                });

                // 2. Get user confirmation
                // NOTE: confirmOperation exists in UIHelper (see UIHelper.d.ts:53)
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
                // NOTE: showSuccess exists in UIHelper (see UIHelper.d.ts:69)
                UIHelper.showSuccess(`Successfully imported ${confirmation.processableRows.length} route(s).`);

            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                console.error('RideCoordinator.importRoutes error:', err);
                // NOTE: showError exists in UIHelper (see UIHelper.d.ts:74)
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
