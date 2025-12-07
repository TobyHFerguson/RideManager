/**
 * Migration utility for transitioning retry queue from PropertiesService to Spreadsheet
 * 
 * This file contains functions to:
 * 1. Migrate existing queue items from PropertiesService to Retry Queue spreadsheet
 * 2. Check migration status
 * 3. Backup old PropertiesService data
 * 
 * USAGE:
 * 1. Run migrateRetryQueueToSpreadsheet() once to migrate existing items
 * 2. Verify with checkRetryQueueMigration()
 * 3. After confirming success, old PropertiesService data can be cleared
 */

/**
 * Migrate retry queue from PropertiesService to Spreadsheet
 * This is a one-time migration function
 */
function migrateRetryQueueToSpreadsheet() {
    Logger.log('=== Starting Retry Queue Migration ===\n');
    
    try {
        const props = PropertiesService.getScriptProperties();
        const QUEUE_KEY = 'calendarRetryQueue';
        
        // Get existing queue from PropertiesService
        const queueJson = props.getProperty(QUEUE_KEY);
        
        if (!queueJson) {
            Logger.log('No existing queue found in PropertiesService');
            Logger.log('Migration not needed - starting fresh with spreadsheet');
            return {
                success: true,
                migrated: 0,
                message: 'No existing queue to migrate'
            };
        }
        
        const oldQueue = JSON.parse(queueJson);
        Logger.log(`Found ${oldQueue.length} items in PropertiesService queue`);
        
        if (oldQueue.length === 0) {
            Logger.log('Queue is empty - no items to migrate');
            return {
                success: true,
                migrated: 0,
                message: 'Queue was empty'
            };
        }
        
        // Create spreadsheet adapter
        const adapter = new RetryQueueSpreadsheetAdapter('Retry Queue');
        
        // Check if spreadsheet already has items
        const existingItems = adapter.loadAll();
        if (existingItems.length > 0) {
            Logger.log(`⚠ WARNING: Spreadsheet already contains ${existingItems.length} items`);
            Logger.log('Appending migrated items to existing queue');
        }
        
        // Migrate each item
        Logger.log('\nMigrating items:');
        oldQueue.forEach((item, index) => {
            Logger.log(`  ${index + 1}. ID: ${item.id}, Ride: ${item.rideTitle || item.rideUrl}`);
            adapter.enqueue(item);
        });
        
        // Verify migration
        const migratedItems = adapter.loadAll();
        Logger.log(`\n✓ Migration complete: ${oldQueue.length} items migrated`);
        Logger.log(`Total items in spreadsheet: ${migratedItems.length}`);
        
        // Create backup of old queue
        const backupKey = QUEUE_KEY + '_backup_' + new Date().getTime();
        props.setProperty(backupKey, queueJson);
        Logger.log(`\n✓ Backup created: ${backupKey}`);
        Logger.log('Old PropertiesService queue preserved for safety');
        Logger.log('You can manually delete the backup after verifying migration');
        
        return {
            success: true,
            migrated: oldQueue.length,
            total: migratedItems.length,
            backupKey: backupKey,
            message: 'Migration successful'
        };
        
    } catch (error) {
        Logger.log(`\n✗ ERROR during migration: ${error.message}`);
        Logger.log(error.stack);
        return {
            success: false,
            error: error.message,
            message: 'Migration failed - old queue preserved'
        };
    }
}

/**
 * Check migration status and compare PropertiesService vs Spreadsheet
 */
function checkRetryQueueMigration() {
    Logger.log('=== Retry Queue Migration Status ===\n');
    
    const props = PropertiesService.getScriptProperties();
    const QUEUE_KEY = 'calendarRetryQueue';
    
    // Check PropertiesService
    const queueJson = props.getProperty(QUEUE_KEY);
    const oldQueue = queueJson ? JSON.parse(queueJson) : [];
    Logger.log(`PropertiesService queue: ${oldQueue.length} items`);
    
    // Check for backups
    const allProps = props.getProperties();
    const backupKeys = Object.keys(allProps).filter(key => key.startsWith(QUEUE_KEY + '_backup_'));
    if (backupKeys.length > 0) {
        Logger.log(`Found ${backupKeys.length} backup(s):`);
        backupKeys.forEach(key => {
            const timestamp = key.split('_').pop();
            const date = new Date(parseInt(timestamp));
            Logger.log(`  - ${key} (${date.toLocaleString()})`);
        });
    }
    
    // Check Spreadsheet
    try {
        const adapter = new RetryQueueSpreadsheetAdapter('Retry Queue');
        const spreadsheetItems = adapter.loadAll();
        Logger.log(`\nSpreadsheet queue: ${spreadsheetItems.length} items`);
        
        if (spreadsheetItems.length > 0) {
            Logger.log('\nSpreadsheet items:');
            const stats = adapter.getStatistics();
            Logger.log(`  Pending: ${stats.pending}`);
            Logger.log(`  Retrying: ${stats.retrying}`);
            Logger.log(`  Failed: ${stats.failed}`);
            Logger.log(`  By type: create=${stats.byType.create}, update=${stats.byType.update}, delete=${stats.byType.delete}`);
        }
        
    } catch (error) {
        Logger.log(`\n✗ ERROR accessing spreadsheet: ${error.message}`);
    }
    
    Logger.log('\n=== Status Check Complete ===');
}

/**
 * Clear old PropertiesService queue (ONLY after verifying migration)
 */
function clearOldPropertiesServiceQueue() {
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
        'Clear Old Queue',
        'This will delete the retry queue from PropertiesService.\n\n' +
        'Make sure you have:\n' +
        '1. Run migrateRetryQueueToSpreadsheet()\n' +
        '2. Verified items in Retry Queue spreadsheet\n\n' +
        'Continue?',
        ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) {
        Logger.log('Cancelled by user');
        return;
    }
    
    const props = PropertiesService.getScriptProperties();
    const QUEUE_KEY = 'calendarRetryQueue';
    
    props.deleteProperty(QUEUE_KEY);
    Logger.log('✓ Old PropertiesService queue cleared');
    Logger.log('Backups preserved (if any) - can be manually deleted if needed');
}

/**
 * Delete all backup queues from PropertiesService
 */
function deleteAllBackups() {
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
        'Delete Backups',
        'This will permanently delete all backup queues.\n\n' +
        'Only do this after confirming migration was successful.\n\n' +
        'Continue?',
        ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) {
        Logger.log('Cancelled by user');
        return;
    }
    
    const props = PropertiesService.getScriptProperties();
    const QUEUE_KEY = 'calendarRetryQueue';
    const allProps = props.getProperties();
    const backupKeys = Object.keys(allProps).filter(key => key.startsWith(QUEUE_KEY + '_backup_'));
    
    backupKeys.forEach(key => {
        props.deleteProperty(key);
        Logger.log(`✓ Deleted ${key}`);
    });
    
    Logger.log(`\nDeleted ${backupKeys.length} backup(s)`);
}
