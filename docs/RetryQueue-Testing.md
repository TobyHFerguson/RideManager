# RetryQueue Testing Guide

This guide explains how to test the RetryQueue system in Google Apps Script with artificial failures to experience the complete retry workflow.

## Setup

1. **Install Triggers (Owner-Only)**
   - Open spreadsheet as the owner
   - Run **Ride Schedulers → Install Triggers** from menu
   - Verify all 4 triggers installed successfully
   - Check User Activity Log for installation confirmation

2. **Deploy Code to GAS**
   - Push all files to GAS using clasp: `clasp push`
   - Open the project in GAS editor: `clasp open`

2. **Prepare Test Data**
   - Ensure you have at least one ride entry in the "Consolidated Rides" spreadsheet
   - The entry must have a valid RideURL in the Ride column (RWGPS event URL)

## Test Scenarios

### Scenario 1: Full Retry Workflow (Recommended First Test)

**Purpose**: Experience the complete retry cycle from initial failure through multiple retry attempts.

**Steps**:
1. In GAS editor, open `testRetryQueue.js`
2. Run function: `testRetryQueueFullScenario()`
3. View Execution Log (View > Executions)

**What Happens**:
- ✓ Enables test mode with forced failures
- ✓ Enqueues a calendar operation that will fail
- ✓ Shows queue status with retry schedule
- ✓ Manually triggers retry (fails again)
- ✓ Simulates time passing and processes multiple retries
- ✓ Shows final queue state

**Expected Output** (in execution log):
```
=== Starting RetryQueue Full Scenario Test ===

Step 1: Setting up test data...
✓ Test ride URL: https://ridewithgps.com/events/12345

Step 2: Testing immediate retry with artificial failure...
Test mode enabled - calendar operations will fail artificially
✓ Operation enqueued with artificial failure

Step 3: Checking queue status...
Queue Status: 1 item(s)

Item 1:
  Enqueued: [timestamp]
  Next Retry: [timestamp] (in 5 minutes)
  Attempts: 0
  Last Error: Calendar Not Found - Test Failure
  Ride URL: https://ridewithgps.com/events/12345

...
```

**Verify**:
- Check your email for retry notification
- Queue persists in PropertiesService
- Background trigger is created

### Scenario 2: Multiple Queue Items

**Purpose**: Test queue behavior with multiple concurrent failed operations.

**Steps**:
1. Run function: `testMultipleQueueItems()`
2. View execution log

**What Happens**:
- Creates 3 different operations
- Each gets different retry schedule
- Queue status shows all items

**Expected Output**:
```
=== Testing Multiple Queue Items ===

✓ Enqueued operation 1
✓ Enqueued operation 2
✓ Enqueued operation 3

Queue Status: 3 item(s)
[Details for each item]
```

### Scenario 3: Successful Retry

**Purpose**: Test what happens when retry succeeds.

**Steps**:
1. First run `testRetryQueueFullScenario()` to populate queue
2. Then run `testSuccessfulRetry()`

**What Happens**:
- Disables forced failures
- Attempts real calendar operations
- **Note**: Will still fail because test calendar ID is fake
- For real success test, modify operation with actual calendar ID

**To Test Real Success**:
```javascript
// In GAS editor console
const queue = RetryQueue._getQueue();
queue[0].calendarId = 'your-actual-calendar-id@group.calendar.google.com';
RetryQueue._setQueue(queue);
RetryQueue.processQueue();
```

### Scenario 4: 48-Hour Cutoff

**Purpose**: Test that items older than 48 hours are removed with notification.

**Steps**:
1. Run function: `testCutoffBehavior()`
2. Check your email

**What Happens**:
- Artificially ages a queue item to 49 hours old
- Processes queue
- Item is removed
- Email notification sent about max retry period

**Expected Email**:
Subject: "Calendar Operation Failed - Maximum Retry Period Exceeded"

### Scenario 5: Manual Queue Processing

**Purpose**: Test manual trigger execution (like what the time-based trigger does).

**Steps**:
1. Run function: `manualProcessQueue()`
2. View before/after queue status

**What Happens**:
- Shows queue status before processing
- Processes all due items
- Shows queue status after processing

### Scenario 6: Inspect Queue Internals

**Purpose**: Debug queue state and see detailed item information.

**Steps**:
1. Run function: `inspectQueueDetails()`

**Expected Output**:
```
=== Queue Details ===

Item 1:
  ID: abc-123-def
  Type: create
  Ride URL: https://ridewithgps.com/events/12345
  Enqueued: [timestamp]
  Next Retry: [timestamp]
  Attempt Count: 3
  Last Error: Calendar Not Found
  Age (hours): 2.50
```

## Test Mode Properties

Test mode uses PropertiesService to control behavior:

| Property | Values | Effect |
|----------|--------|--------|
| `RETRY_QUEUE_TEST_MODE` | `"true"` / absent | Enables test logging |
| `RETRY_QUEUE_FORCE_FAILURE` | `"true"` / absent | Forces all calendar operations to fail |

**View Properties**:
```javascript
PropertiesService.getScriptProperties().getProperties()
```

**Manually Set**:
```javascript
PropertiesService.getScriptProperties().setProperty('RETRY_QUEUE_FORCE_FAILURE', 'true');
```

**Clear**:
```javascript
PropertiesService.getScriptProperties().deleteProperty('RETRY_QUEUE_FORCE_FAILURE');
```

## Cleanup

**After testing**, clean up test data:

```javascript
cleanupRetryQueueTest()
```

This will:
- Clear the queue
- Disable test mode
- Delete the retry trigger

## Manual Queue Manipulation

For advanced testing, you can manually manipulate the queue:

### View Queue
```javascript
const queue = RetryQueue._getQueue();
Logger.log(JSON.stringify(queue, null, 2));
```

### Modify Queue Item
```javascript
const queue = RetryQueue._getQueue();
queue[0].nextRetry = Date.now() - 1000; // Due for retry now
queue[0].attemptCount = 5; // Increase attempt count
RetryQueue._setQueue(queue);
```

### Add Custom Item
```javascript
const operation = {
  type: 'create',
  calendarId: 'your-cal-id@group.calendar.google.com',
  rideUrl: 'https://ridewithgps.com/events/99999',
  params: {
    title: 'Custom Test Event',
    startTime: new Date().getTime() + 86400000,
    endTime: new Date().getTime() + 90000000,
    location: 'Test Location',
    description: 'Custom test'
  },
  userEmail: Session.getActiveUser().getEmail()
};

RetryQueue.enqueue(operation);
```

## Expected Retry Schedule

Based on item age:

| Item Age | Retry Interval | Example |
|----------|---------------|---------|
| < 1 hour | 5 minutes | Enqueued at 2:00pm → retry at 2:05pm, 2:10pm, 2:15pm... |
| 1-48 hours | 1 hour | Enqueued at 2:00pm → retry at 3:00pm, 4:00pm, 5:00pm... |
| > 48 hours | Removed | Item deleted, user notified |

## Verification Checklist

After running tests, verify:

- [ ] Queue items are created correctly
- [ ] Retry schedule follows age-based intervals
- [ ] Email notifications sent on failure
- [ ] Items are removed after 48 hours
- [ ] Successful retries remove items from queue
- [ ] Background trigger is created/deleted appropriately
- [ ] Queue persists across script executions
- [ ] Multiple items can coexist in queue
- [ ] Cell-level spreadsheet writes preserve version history

## Troubleshooting

### "Queue is empty"
Run a test scenario that populates the queue first (e.g., `testRetryQueueFullScenario()`).

### "No rows in spreadsheet"
Add at least one ride entry to the "Consolidated Rides" sheet with a valid RideURL.

### "Calendar Not Found" errors persist
This is expected in test mode! To test real calendar operations:
1. Disable forced failures: `PropertiesService.getScriptProperties().deleteProperty('RETRY_QUEUE_FORCE_FAILURE')`
2. Use a real calendar ID in the operation

### No email notifications
Check your script's email quota (100 emails/day for free accounts). Also check spam folder.

### Trigger not executing
Check Apps Script Triggers dashboard:
1. Click clock icon in GAS editor
2. Verify `dailyRetryCheck` exists (daily backstop at 2 AM)
3. Check for `retryQueueTrigger` (dynamic, created when items pending)
4. Verify triggers installed by **owner only** (not other users)
5. Check execution history for errors
6. If missing, owner must reinstall via **Ride Schedulers → Install Triggers** menu

## Real-World Testing

To test with actual calendar operations:

1. **Setup**: Get a real Google Calendar ID
   - Go to Google Calendar
   - Click settings for a test calendar
   - Copy "Calendar ID"

2. **Create Real Operation**:
   ```javascript
   const operation = {
     type: 'create',
     calendarId: 'your-real-calendar-id@group.calendar.google.com',
     rideUrl: 'https://ridewithgps.com/events/12345',
     params: {
       title: 'Real Test Ride',
       startTime: new Date('2025-12-01T09:00:00').getTime(),
       endTime: new Date('2025-12-01T12:00:00').getTime(),
       location: 'Test Start Location',
       description: 'Testing retry queue with real calendar'
     },
     userEmail: Session.getActiveUser().getEmail()
   };
   
   // Disable test mode
   PropertiesService.getScriptProperties().deleteProperty('RETRY_QUEUE_FORCE_FAILURE');
   
   // Enqueue and process
   RetryQueue.enqueue(operation);
   RetryQueue.processQueue();
   ```

3. **Verify**:
   - Check Google Calendar for event creation
   - Check queue is empty after success
   - Verify spreadsheet row is updated with event ID

## Next Steps

After successful testing:
1. Integrate RetryQueue into RideManager for production use
2. Remove or comment out test mode code for production
3. Monitor execution logs for real failures
4. Set up alerts for persistent retry failures
