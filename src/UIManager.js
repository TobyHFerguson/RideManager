// @ts-check
/// <reference path="./gas-globals.d.ts" />
const UIManager = {
    processRows: function (rows, errors, warnings, rwgps, fun = () => { }, force = false) {
        evalRows(rows, rwgps, errors, warnings);
        let message = create_message(rows);
        const processableRows = rows.filter(r => r.errors.length === 0);
        if (processableRows.length === 0) {
            inform_of_errors(message);
        } else {
            if (confirm_schedule(message)) {
                const rowNumbers = rows.map(row => row.rowNum).join(", ");
                UserLogger.log(fun.name, `Rows: ${rowNumbers}`, message);
                fun(processableRows, rwgps);
            }
        }

        function create_message(rows) {
            function create_error_message(rows) {
                let message = "";
                let error_rows = rows.filter(row => row.errors.length > 0);
                if (error_rows.length > 0) {
                    message += "These rides had errors and will not be processed:\n";
                    let errors = error_rows.flatMap(row => row.errors.map(error => `Row ${row.rowNum}: ${error}`));
                    message += errors.join("\n");
                    message += "\n\n";
                }
                if (message) console.error(message);
                return message;
            }

            function create_warning_message(rows) {
                let message = "";
                let warning_rows = rows.filter((row) => row.errors.length === 0 && row.warnings.length > 0);
                if (warning_rows.length > 0) {
                    message += "These rides had warnings but can be processed:\n"
                    let warnings = warning_rows.flatMap(row => row.warnings.map(warning => `Row ${row.rowNum}: ${warning}`));
                    message += warnings.join("\n");
                    message += "\n\n";
                }
                if (message) console.warn(message);
                return message;
            }

            /**
             * Create a message for all the rides that have neither errors nor warnings
             */
            function create_schedule_message(rows) {
                let message = "";
                let clean_rows = rows.filter((row) => row.errors.length === 0 && row.warnings.length === 0);
                if (clean_rows.length > 0) {
                    message += "These rides had neither errors nor warnings and can be processed:\n"
                    message += clean_rows.map(row => `Row ${row.rowNum}`).join("\n");
                    message += "\n\n";
                }
                return message;
            }

            let message = "";
            message += create_error_message(rows);
            message += create_warning_message(rows)
            message += create_schedule_message(rows);
            return message;
        }

        function confirm_schedule(message) {
            if (force) return true;
            message += `Do you want to continue to process all processable rides?`;
            let ui = SpreadsheetApp.getUi();
            let result = ui.alert(message, ui.ButtonSet.YES_NO);
            return result == ui.Button.YES
        }

        function inform_of_errors(message) {
            message += "All selected rides are unprocessable and need to have their errors fixed.";
            SpreadsheetApp.getUi().alert(message);
        }
    },


    /**
     * Process cancellation with announcement handling
     * @param {Row[]} rows - Rows to cancel
     * @param {Object} rwgps - RWGPS connector
     */
    processCancellationWithAnnouncements: function(rows, rwgps) {
        const ui = SpreadsheetApp.getUi();
        
        // Validate rows first
        evalRows(rows, rwgps, [rowCheck.cancelled, rowCheck.unscheduled], []);
        const processableRows = rows.filter(r => r.errors.length === 0);
        
        if (processableRows.length === 0) {
            const message = create_error_message(rows) + "All selected rides are unprocessable and need to have their errors fixed.";
            ui.alert(message);
            return;
        }
        
        // Process each row individually
        const results = [];
        let cancelled = 0;
        
        for (const row of processableRows) {
            try {
                // Check if row has announcement
                if (!row.Announcement || !row.Status) {
                    // No announcement - simple cancellation, no user prompt needed
                    RideManager.cancelRows([row], rwgps, false, '');
                    cancelled++;
                    results.push(`Row ${row.rowNum}: Cancelled (no announcement)`);
                    continue;
                }
                
                // Has announcement - ask user if they want to send cancellation email
                const confirmMsg = `Row ${row.rowNum}: ${row.rideName}\n\n` +
                    `This ride has an announcement.\n` +
                    `Do you want to send a cancellation email to all riders?`;
                
                const response = ui.alert('Send Cancellation Email?', confirmMsg, ui.ButtonSet.YES_NO_CANCEL);
                
                if (response === ui.Button.CANCEL) {
                    // User cancelled the operation
                    continue;
                }
                
                const sendEmail = (response === ui.Button.YES);
                let reason = '';
                
                if (sendEmail) {
                    // Get reason from user
                    const promptMsg = `Row ${row.rowNum}: ${row.rideName}\n\n` +
                        `Please provide a brief reason for the cancellation:`;
                    
                    const reasonResponse = ui.prompt('Cancellation Reason', promptMsg, ui.ButtonSet.OK_CANCEL);
                    
                    if (reasonResponse.getSelectedButton() === ui.Button.CANCEL) {
                        // User cancelled
                        continue;
                    }
                    
                    reason = reasonResponse.getResponseText();
                }
                
                // Perform cancellation
                RideManager.cancelRows([row], rwgps, sendEmail, reason);
                cancelled++;
                
                if (sendEmail) {
                    results.push(`Row ${row.rowNum}: Cancelled - cancellation email sent`);
                } else {
                    results.push(`Row ${row.rowNum}: Cancelled (no email sent)`);
                }
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                results.push(`Row ${row.rowNum}: ERROR - ${err.message}`);
                console.error(`Error cancelling row ${row.rowNum}:`, error);
            }
        }
        
        // Show final results
        if (results.length > 0) {
            const resultMsg = `Cancellation Complete\n\n${cancelled} ride(s) cancelled.\n\n` +
                `Details:\n${results.join('\n')}`;
            ui.alert('Cancellation Results', resultMsg, ui.ButtonSet.OK);
        }
        
        // Helper function for error messages
        function create_error_message(rows) {
            let message = "";
            let error_rows = rows.filter(row => row.errors.length > 0);
            if (error_rows.length > 0) {
                message += "These rides had errors and will not be processed:\n";
                let errors = error_rows.flatMap(row => row.errors.map(error => `Row ${row.rowNum}: ${error}`));
                message += errors.join("\n");
                message += "\n\n";
            }
            return message;
        }
    },

    /**
     * Process reinstatement with announcement handling
     * @param {Array} rows - Rows to reinstate
     * @param {Object} rwgps - RWGPS connector
     */
    processReinstatementWithAnnouncements: function(rows, rwgps) {
        const ui = SpreadsheetApp.getUi();
        
        // Validate rows first
        evalRows(rows, rwgps, [rowCheck.notCancelled], []);
        const processableRows = rows.filter(r => r.errors.length === 0);
        
        if (processableRows.length === 0) {
            const message = create_error_message(rows) + "All selected rides are unprocessable and need to have their errors fixed.";
            ui.alert(message);
            return;
        }
        
        // Process each row individually
        const results = [];
        let reinstated = 0;
        
        for (const row of processableRows) {
            try {
                // Check if row has announcement
                if (!row.Announcement || !row.Status || row.Status !== 'cancelled') {
                    // No announcement or not cancelled - simple reinstatement, no user prompt needed
                    RideManager.reinstateRows([row], rwgps, false, '');
                    reinstated++;
                    results.push(`Row ${row.rowNum}: Reinstated (no announcement)`);
                    continue;
                }
                
                // Has announcement - ask user if they want to send reinstatement email
                const confirmMsg = `Row ${row.rowNum}: ${row.rideName}\n\n` +
                    `This ride has an announcement.\n` +
                    `Do you want to send a reinstatement email to all riders?`;
                
                const response = ui.alert('Send Reinstatement Email?', confirmMsg, ui.ButtonSet.YES_NO_CANCEL);
                
                if (response === ui.Button.CANCEL) {
                    // User cancelled the operation
                    continue;
                }
                
                const sendEmail = (response === ui.Button.YES);
                let reason = '';
                
                if (sendEmail) {
                    // Get reason from user
                    const promptMsg = `Row ${row.rowNum}: ${row.rideName}\n\n` +
                        `Please provide a brief reason for the reinstatement:`;
                    
                    const reasonResponse = ui.prompt('Reinstatement Reason', promptMsg, ui.ButtonSet.OK_CANCEL);
                    
                    if (reasonResponse.getSelectedButton() === ui.Button.CANCEL) {
                        // User cancelled
                        continue;
                    }
                    
                    reason = reasonResponse.getResponseText();
                }
                
                // Perform reinstatement
                RideManager.reinstateRows([row], rwgps, sendEmail, reason);
                reinstated++;
                
                if (sendEmail) {
                    results.push(`Row ${row.rowNum}: Reinstated - reinstatement email sent`);
                } else {
                    results.push(`Row ${row.rowNum}: Reinstated (no email sent)`);
                }
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                results.push(`Row ${row.rowNum}: ERROR - ${err.message}`);
                console.error(`Error reinstating row ${row.rowNum}:`, error);
            }
        }
        
        // Show final results
        if (results.length > 0) {
            const resultMsg = `Reinstatement Complete\n\n${reinstated} ride(s) reinstated.\n\n` +
                `Details:\n${results.join('\n')}`;
            ui.alert('Reinstatement Results', resultMsg, ui.ButtonSet.OK);
        }
        
        // Helper function for error messages
        function create_error_message(rows) {
            let message = "";
            let error_rows = rows.filter(row => row.errors.length > 0);
            if (error_rows.length > 0) {
                message += "These rides had errors and will not be processed:\n";
                let errors = error_rows.flatMap(row => row.errors.map(error => `Row ${row.rowNum}: ${error}`));
                message += errors.join("\n");
                message += "\n\n";
            }
            return message;
        }
    }


}