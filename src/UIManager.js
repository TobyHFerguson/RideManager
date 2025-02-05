const UIManager = {
    processRows: function (rows, errors, warnings, rwgps, fun = () => { }, force = false) {
        evalRows(rows, rwgps, errors, warnings);
        let message = create_message(rows);
        sidebar.create(rows);
        const processableRows = rows.filter(r => r.errors.length === 0);
        if (processableRows.length === 0) {
            inform_of_errors(message);
        } else {
            if (confirm_schedule(message)) {
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
    }


}