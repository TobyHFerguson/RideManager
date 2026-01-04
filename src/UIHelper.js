// @ts-check
/// <reference path="./gas-globals.d.ts" />

/**
 * @typedef {import('./ValidationCore').ValidationResult} ValidationResult
 * @typedef {InstanceType<typeof RowCore>} RowCoreInstance
 */

/**
 * Simple UI utilities for Google Apps Script
 * Handles user interaction dialogs and messages
 */
class UIHelper {
    /**
     * Confirm operation with user
     * @param {{operationName: string, rows: RowCoreInstance[], validation: Map<RowCoreInstance, ValidationResult>, force?: boolean}} options - Confirmation options
     * @param {string} options.operationName - Name of the operation (e.g., "Schedule Rides")
     * @param {RowCoreInstance[]} options.rows - Rows to process
     * @param {Map<RowCoreInstance, ValidationResult>} options.validation - Validation results
     * @param {boolean} [options.force] - Skip user confirmation if true
     * @returns {{confirmed: boolean, processableRows: RowCoreInstance[]}}
     */
    static confirmOperation({ operationName, rows, validation, force = false }) {
            const processableRows = rows.filter(r => {
                const v = validation.get(r);
                return v && v.errors.length === 0;
            });

            if (force) {
                return { confirmed: true, processableRows };
            }

            const message = this.buildValidationMessage(operationName, rows, validation);

            if (processableRows.length === 0) {
                SpreadsheetApp.getUi().alert(
                    'No Processable Rides',
                    message + '\n\nAll selected rides have errors and cannot be processed.',
                    SpreadsheetApp.getUi().ButtonSet.OK
                );
                return { confirmed: false, processableRows: [] };
            }

            const ui = SpreadsheetApp.getUi();
            const result = ui.alert(
                operationName,
                message + `\n\nProcess ${processableRows.length} ride(s)?`,
                ui.ButtonSet.YES_NO
            );

            return {
                confirmed: result === ui.Button.YES,
                processableRows
            };
    }

    /**
     * Build validation message for display
     * @param {string} operationName - Name of the operation
     * @param {RowCoreInstance[]} rows - Rows being validated
     * @param {Map<RowCoreInstance, ValidationResult>} validation - Validation results
     * @returns {string}
     */
    static buildValidationMessage(operationName, rows, validation) {
            /** @type {string[]} */
            const sections = [];

            // Error section
            const errorRows = rows.filter(r => {
                const v = validation.get(r);
                return v && v.errors.length > 0;
            });

            if (errorRows.length > 0) {
                sections.push('❌ ERRORS (will not be processed):');
                errorRows.forEach(row => {
                    const v = validation.get(row);
                    if (v) {
                        sections.push(`  Row ${row.rowNum}: ${v.errors.join(', ')}`);
                    }
                });
            }

            // Warning section
            const warningRows = rows.filter(r => {
                const v = validation.get(r);
                return v && v.errors.length === 0 && v.warnings.length > 0;
            });

            if (warningRows.length > 0) {
                sections.push('\n⚠️  WARNINGS (can be processed):');
                warningRows.forEach(row => {
                    const v = validation.get(row);
                    if (v) {
                        sections.push(`  Row ${row.rowNum}: ${v.warnings.join(', ')}`);
                    }
                });
            }

            // Clean section
            const cleanRows = rows.filter(r => {
                const v = validation.get(r);
                return v && v.errors.length === 0 && v.warnings.length === 0;
            });

            if (cleanRows.length > 0) {
                sections.push('\n✅ READY (no issues):');
                sections.push(`  Rows: ${cleanRows.map(r => r.rowNum).join(', ')}`);
            }

            return sections.join('\n');
    }

    /**
     * Show success message
     * @param {string} message - Success message to display
     */
    static showSuccess(message) {
            SpreadsheetApp.getUi().alert(
                'Success',
                message,
                SpreadsheetApp.getUi().ButtonSet.OK
            );
    }

    /**
     * Show error message
     * @param {string} title - Error title
     * @param {Error|string} error - Error object or message
     */
    static showError(title, error) {
            const err = error instanceof Error ? error : new Error(String(error));
            SpreadsheetApp.getUi().alert(
                title,
                `${err.message}\n\nCheck Logs for details.`,
                SpreadsheetApp.getUi().ButtonSet.OK
            );
    }

    /**
     * Confirm cancellation with announcement handling
     * @param {RowCoreInstance[]} rows - Rows to cancel
     * @param {Map<RowCoreInstance, ValidationResult>} validation - Validation results
     * @param {RowCoreInstance[]} rowsWithAnnouncements - Rows that have announcements
     * @returns {{confirmed: boolean, sendCancellationNotice: boolean, processableRows: RowCoreInstance[]}}
     */
    static confirmCancellationWithAnnouncements(rows, validation, rowsWithAnnouncements) {
            const processableRows = rows.filter(r => {
                const v = validation.get(r);
                return v && v.errors.length === 0;
            });

            const message = this.buildValidationMessage('Cancel Rides', rows, validation);

            if (processableRows.length === 0) {
                SpreadsheetApp.getUi().alert(
                    'No Processable Rides',
                    message + '\n\nAll selected rides have errors and cannot be processed.',
                    SpreadsheetApp.getUi().ButtonSet.OK
                );
                return { confirmed: false, sendCancellationNotice: false, processableRows: [] };
            }

            const ui = SpreadsheetApp.getUi();
            const announcementInfo = rowsWithAnnouncements.length > 0
                ? `\n\n⚠️  ${rowsWithAnnouncements.length} ride(s) have announcements.\nSelect YES to send cancellation notices, NO to skip notices, CANCEL to abort.`
                : '';

            const result = ui.alert(
                'Cancel Rides',
                message + announcementInfo + `\n\nSend cancellation notices for ${processableRows.length} ride(s)?`,
                ui.ButtonSet.YES_NO_CANCEL
            );

            return {
                confirmed: result !== ui.Button.CANCEL,
                sendCancellationNotice: result === ui.Button.YES,
                processableRows
            };
    }

    /**
     * Confirm reinstatement with announcement handling
     * @param {RowCoreInstance[]} rows - Rows to reinstate
     * @param {Map<RowCoreInstance, ValidationResult>} validation - Validation results
     * @param {RowCoreInstance[]} rowsWithAnnouncements - Rows that have announcements
     * @returns {{confirmed: boolean, sendReinstatementNotice: boolean, processableRows: RowCoreInstance[]}}
     */
    static confirmReinstatementWithAnnouncements(rows, validation, rowsWithAnnouncements) {
            const processableRows = rows.filter(r => {
                const v = validation.get(r);
                return v && v.errors.length === 0;
            });

            const message = this.buildValidationMessage('Reinstate Rides', rows, validation);

            if (processableRows.length === 0) {
                SpreadsheetApp.getUi().alert(
                    'No Processable Rides',
                    message + '\n\nAll selected rides have errors and cannot be processed.',
                    SpreadsheetApp.getUi().ButtonSet.OK
                );
                return { confirmed: false, sendReinstatementNotice: false, processableRows: [] };
            }

            const ui = SpreadsheetApp.getUi();
            const announcementInfo = rowsWithAnnouncements.length > 0
                ? `\n\n⚠️  ${rowsWithAnnouncements.length} ride(s) have announcements.\nSelect YES to send reinstatement notices, NO to skip notices, CANCEL to abort.`
                : '';

            const result = ui.alert(
                'Reinstate Rides',
                message + announcementInfo + `\n\nSend reinstatement notices for ${processableRows.length} ride(s)?`,
                ui.ButtonSet.YES_NO_CANCEL
            );

            return {
                confirmed: result !== ui.Button.CANCEL,
                sendReinstatementNotice: result === ui.Button.YES,
                processableRows
            };
    }

    /**
     * Prompt user for cancellation reason
     * @param {RowCoreInstance} row - Row being cancelled
     * @returns {{cancelled: boolean, reason: string}}
     */
    static promptForCancellationReason(row) {
            const ui = SpreadsheetApp.getUi();
            const promptMsg = row 
                ? `Row ${row.rowNum}: ${row.rideName}\n\nPlease provide a brief reason for the cancellation:`
                : 'Please provide a brief reason for the cancellation of the selected rides:';

            const response = ui.prompt('Cancellation Reason', promptMsg, ui.ButtonSet.OK_CANCEL);

            return {
                cancelled: response.getSelectedButton() === ui.Button.CANCEL,
                reason: response.getResponseText()
            };
    }

    /**
     * Prompt user for reinstatement reason
     * @param {RowCoreInstance} row - Row being reinstated
     * @returns {{cancelled: boolean, reason: string}}
     */
    static promptForReinstatementReason(row) {
            const ui = SpreadsheetApp.getUi();
            const promptMsg = row
                ? `Row ${row.rowNum}: ${row.rideName}\n\nPlease provide a brief reason for the reinstatement:`
                : 'Please provide a brief reason for the reinstatement of the selected rides:';

            const response = ui.prompt('Reinstatement Reason', promptMsg, ui.ButtonSet.OK_CANCEL);

            return {
                cancelled: response.getSelectedButton() === ui.Button.CANCEL,
                reason: response.getResponseText()
            };
    }
}

if (typeof module !== 'undefined') {
    module.exports = UIHelper;
}
