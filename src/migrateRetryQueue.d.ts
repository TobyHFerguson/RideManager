/**
 * Migration utility for transitioning retry queue from PropertiesService to Spreadsheet
 */

/**
 * Migrate retry queue from PropertiesService to Spreadsheet
 */
declare function migrateRetryQueueToSpreadsheet(): {
    success: boolean;
    migrated?: number;
    total?: number;
    backupKey?: string;
    message: string;
    error?: string;
};

/**
 * Check migration status and compare PropertiesService vs Spreadsheet
 */
declare function checkRetryQueueMigration(): void;

/**
 * Clear old PropertiesService queue (ONLY after verifying migration)
 * @param skipConfirmation - If true, skip UI confirmation (for automated scripts)
 */
declare function clearOldPropertiesServiceQueue(skipConfirmation?: boolean): void;

/**
 * Delete all backup queues from PropertiesService
 * @param skipConfirmation - If true, skip UI confirmation (for automated scripts)
 */
declare function deleteAllBackups(skipConfirmation?: boolean): void;
