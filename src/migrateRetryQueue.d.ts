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
 */
declare function clearOldPropertiesServiceQueue(): void;

/**
 * Delete all backup queues from PropertiesService
 */
declare function deleteAllBackups(): void;
