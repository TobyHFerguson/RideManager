/**
 * ProcessingManager - Progress tracking for long-running operations
 * 
 * Type definitions for managing modal dialog updates during processing.
 * Uses PropertiesService to store state accessible from sidebar UI.
 */

/**
 * Function that performs processing work
 * @param manager - ProcessingManager instance to report progress/errors
 */
export type ProcessFunction = (manager: ProcessingManager) => void;

/**
 * Manager for long-running operations with progress UI
 * 
 * Displays a modal dialog and tracks progress/errors in PropertiesService
 * so the sidebar can poll for updates.
 */
declare class ProcessingManager {
    /** PropertiesService instance for state storage */
    private props: GoogleAppsScript.Properties.Properties;
    /** Function to execute during processing */
    private processFunction: ProcessFunction;
    /** Whether processing has started (prevents duplicate execution) */
    private started: boolean;

    /**
     * Create a ProcessingManager and start processing immediately
     * @param processFunction - Function to execute, receives this manager as parameter
     * 
     * @example
     * ```javascript
     * new ProcessingManager((manager) => {
     *   manager.addProgress('Step 1 of 3');
     *   // ... do work
     *   manager.addProgress('Step 2 of 3');
     *   // ... do more work
     *   if (error) {
     *     manager.addError('Something went wrong');
     *   }
     *   manager.addProgress('Step 3 of 3');
     * });
     * ```
     */
    constructor(processFunction: ProcessFunction);

    /**
     * Show the modal dialog for progress tracking
     * @static
     */
    static showModalDialog(): void;

    /**
     * Add a progress message
     * @param message - Progress message to display
     */
    addProgress(message: string): void;

    /**
     * Get all progress messages
     * @returns Array of progress messages
     */
    getProgress(): string[];

    /**
     * Clear all progress messages
     */
    clearProgress(): void;

    /**
     * Add an error message
     * @param message - Error message to display
     */
    addError(message: string): void;

    /**
     * Get all error messages
     * @returns Array of error messages
     */
    getErrors(): string[];

    /**
     * Clear all error messages
     */
    clearErrors(): void;

    /**
     * Mark processing as complete
     */
    endProcessing(): void;

    /**
     * Start processing (called automatically by constructor)
     * @private
     */
    startProcessing(): void;

    /**
     * Finalize processing with completion message
     * @private
     */
    finalizeProcessing(): void;

    /**
     * Acknowledge errors and close the dialog
     */
    acknowledgeErrors(): void;
}

/**
 * Global functions for sidebar UI (called from HTML)
 */

/**
 * Get current progress messages
 * Called by sidebar to poll for updates
 * @returns Array of progress messages
 */
declare function getProgress(): string[];

/**
 * Get current error messages  
 * Called by sidebar to poll for updates
 * @returns Array of error messages
 */
declare function getErrors(): string[];

/**
 * Acknowledge errors and clear state
 * Called by sidebar when user dismisses errors
 */
declare function acknowledgeErrors(): void;

export default ProcessingManager;
