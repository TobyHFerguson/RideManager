/**
 * UIManager provides utility functions for processing rows and managing UI interactions
 * in the ride scheduling application.
 */
declare namespace UIManager {
    /**
     * Processes rows with error and warning functions, then executes a command.
     * @param {Row[]} rows - Array of Row objects to process.
     * @param {Array<Function>} errorFuns - Array of functions to check for errors.
     * @param {Array<Function>} warningFuns - Array of functions to check for warnings.
     * @param {any} rwgps - RWGPS connector/service.
     * @param {Function | undefined} command - The command function to execute on the rows.
     * @param {boolean} [force] - Whether to force execution despite warnings/errors.
     */
    function processRows(
        rows: Row[],
        errorFuns: Array<Function>,
        warningFuns: Array<Function>,
        rwgps: any,
        command?: Function,
        force?: boolean
    ): void;
}

declare const UIManager: {
    processRows: (
        rows: Row[],
        errorFuns: Array<Function>,
        warningFuns: Array<Function>,
        rwgps: any,
        command?: Function,
        force?: boolean
    ) => void;
};
