# Calendar Retry Queue Migration Guide

## Overview

The Google Calendar Calendar Retry Queue has been refactored from an internal PropertiesService-based system to a visible Google Spreadsheet. This provides operators with real-time visibility into queued retry operations.

## What Changed

### Before (PropertiesService)
- Queue items stored as JSON string in PropertiesService
- No visibility for operators
- Difficult to monitor or debug failures
- No audit trail

### After (Google Spreadsheet)
- Queue items stored in "Calendar Retry Queue" spreadsheet
- Full visibility for operators
- Easy filtering, sorting, and searching
- Complete audit trail of retry attempts
- Real-time status updates

## Architecture

The new implementation follows the repository's standard GAS/JavaScript separation pattern:

1. **RetryQueueAdapterCore.js** - Pure JavaScript business logic
   - Row conversion (item ↔ row)
   - Field mapping and validation
   - Statistics calculation
   - 100% Jest test coverage

2. **RetryQueueSpreadsheetAdapter.js** - GAS wrapper
   - Uses bmPreFiddler/Fiddler for spreadsheet I/O
   - Thin adapter around RetryQueueAdapterCore
   - Handles sheet creation and formatting

3. **RetryQueue.js** - Main retry queue manager
   - Now uses RetryQueueSpreadsheetAdapter instead of PropertiesService
   - All other functionality unchanged

## Spreadsheet Structure

The "Calendar Retry Queue" spreadsheet contains these columns:

| Column | Description |
|--------|-------------|
| **ID** | Unique identifier (UUID) |
| **Type** | Operation type: create, update, or delete |
| **Calendar ID** | Target Google Calendar ID |
| **Ride URL** | Stable identifier for the ride (RWGPS URL) |
| **Ride Title** | Human-readable ride name |
| **Row Num** | Source row in Consolidated Rides sheet |
| **User Email** | User who initiated the operation |
| **Enqueued At** | locale DateTime when added to queue |
| **Next Retry At** | locale DateTime for next retry attempt |
| **Attempt Count** | Number of retry attempts so far |
| **Last Error** | Most recent error message |
| **Status** | Current status: pending, retrying, or failed |
| **Params** | JSON string of operation-specific parameters |

## Migration

### For Existing Systems

If you have an existing retry queue in PropertiesService, follow these steps:

1. **Run Migration Function**
   ```javascript
   // In Google Apps Script editor
   migrateRetryQueueToSpreadsheet()
   ```
   
   This will:
   - Read existing queue from PropertiesService
   - Create "Calendar Retry Queue" spreadsheet if needed
   - Copy all items to spreadsheet
   - Create a backup in PropertiesService

2. **Verify Migration**
   ```javascript
   checkRetryQueueMigration()
   ```
   
   Check the execution log to confirm:
   - Item counts match
   - Spreadsheet is accessible
   - All expected items are present

3. **Test Operations**
   - Enqueue a test operation
   - Verify it appears in the spreadsheet
   - Process the queue
   - Verify status updates in spreadsheet

4. **Clean Up (Optional)**
   
   After verifying migration was successful:
   ```javascript
   clearOldPropertiesServiceQueue()  // Clear old queue
   deleteAllBackups()                 // Delete backups
   ```

### For New Systems

No migration needed! The "Calendar Retry Queue" spreadsheet will be created automatically on first use.

## Operator Usage

### Viewing Queue Status

1. Open your spreadsheet
2. Navigate to the "Calendar Retry Queue" sheet
3. Use spreadsheet features to:
   - Sort by status, next retry time, or attempt count
   - Filter by ride name or error message
   - Search for specific operations

### Understanding Statuses

- **pending**: First attempt not yet made (just enqueued)
- **retrying**: Failed at least once, will retry
- **failed**: Max retries exceeded (48 hours), removed from active queue

### Monitoring

**Key metrics to watch:**
- Number of items with status "retrying"
- Items with high attempt counts
- Common error messages
- Items approaching 48-hour limit

**Red flags:**
- Same error repeating across multiple items
- Items stuck in retry for many hours
- Sudden spike in failed operations

### Manual Intervention

If you notice a systematic issue (e.g., calendar permissions problem):

1. **Identify the issue** - Look at error messages
2. **Fix the root cause** - Update calendar permissions, etc.
3. **Clear failed items** - Delete rows from spreadsheet
4. **Re-enqueue if needed** - Operations can be manually recreated

## Testing

### Test Functions Available

The following test functions work with the new spreadsheet-based queue:

1. **testRetryQueueFullScenario()** - Complete end-to-end test
2. **cleanupRetryQueueTest()** - Clear test data
3. **manualProcessQueue()** - Manually trigger retry processing
4. **testSuccessfulRetry()** - Test success path
5. **testCutoffBehavior()** - Test 48-hour expiration
6. **testMultipleQueueItems()** - Test multiple operations
7. **inspectQueueDetails()** - View queue internals

### Running Tests

```javascript
// In Google Apps Script editor
testRetryQueueFullScenario()  // Run comprehensive test

// Check execution log for results
// Check "Calendar Retry Queue" spreadsheet for visual confirmation

cleanupRetryQueueTest()  // Clean up when done
```

## Retry Strategy

The retry strategy remains unchanged:

- **First hour**: Retry every 5 minutes (up to 12 attempts)
- **After first hour**: Retry every hour (up to 47 more attempts)
- **Maximum duration**: 48 hours from initial enqueue
- **After 48 hours**: Operation is marked as failed and removed from queue
- **Email notification**: Sent to user when max retries exceeded

## Troubleshooting

### Spreadsheet Not Created

**Symptom**: Error about missing "Calendar Retry Queue" sheet

**Solution**: Sheet is auto-created on first use. Try:
```javascript
const adapter = new RetryQueueSpreadsheetAdapter('Calendar Retry Queue');
adapter.save([]);  // Force sheet creation
```

### Migration Failed

**Symptom**: Error during `migrateRetryQueueToSpreadsheet()`

**Solution**: 
- Check execution log for specific error
- Old queue is preserved in PropertiesService
- Safe to retry migration

### Items Not Appearing

**Symptom**: Operations enqueued but don't appear in spreadsheet

**Solution**:
- Check spreadsheet name is exactly "Calendar Retry Queue"
- Verify bmPreFiddler library is available
- Check execution permissions

### Status Not Updating

**Symptom**: Items processed but status unchanged in spreadsheet

**Solution**:
- Refresh spreadsheet (F5)
- Check triggers are installed (Ride Schedulers → Install Triggers)
- Verify `dailyRetryCheck` trigger exists in Apps Script → Triggers
- Verify no errors in execution log

## Performance

The spreadsheet-based queue is optimized for performance:

- **Caching**: Data loaded once per operation
- **Batch operations**: All updates in single save
- **Fiddler**: Efficient bulk read/write operations

Typical queue size (< 100 items) has negligible performance impact.

## Security

**Access Control**: The "Calendar Retry Queue" spreadsheet inherits permissions from the parent spreadsheet. Only users with appropriate access can view queue items.

**Sensitive Data**: Queue items contain:
- Ride URLs and titles
- User email addresses
- Calendar IDs
- Error messages

Ensure appropriate access controls on the spreadsheet.

## Future Enhancements

Possible future improvements:

- Email alerts for systematic failures
- Dashboard with queue statistics
- Manual retry triggers from spreadsheet
- Historical archive of completed operations
- Queue priority management

## Support

For issues or questions:
1. Check execution logs (View > Executions)
2. Run diagnostic functions (`inspectQueueDetails()`, `checkRetryQueueMigration()`)
3. Check "Calendar Retry Queue" spreadsheet for operation status
4. Review error messages in Last Error column
