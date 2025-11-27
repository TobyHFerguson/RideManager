# Calendar Event Retry Queue

## Overview

The Retry Queue system provides automatic background retry for failed Google Calendar operations, ensuring reliability when Google Calendar is temporarily unavailable.

## Problem Solved

Occasionally, Google Calendar API returns "Calendar Not Found" errors even when the calendar exists. These transient errors can cause ride scheduling to fail. The retry queue automatically handles these failures without user intervention.

## How It Works

### Immediate Retry
When creating a calendar event:
1. System attempts immediate creation with 3 retries (exponential backoff)
2. If successful, event ID is returned and stored
3. If all retries fail, operation is queued for background processing

### Background Retry
Failed operations are automatically retried on this schedule:
- **First hour**: Every 5 minutes (12 attempts)
- **Next 47 hours**: Every hour (47 attempts)
- **Total**: Up to 48 hours of retry attempts

### User Notification
- User is notified immediately when operations are queued
- Email sent when background retry succeeds
- Email sent if operation permanently fails after 48 hours

## Architecture

### Components

#### `RetryQueue.js`
Manages the retry queue using PropertiesService for persistence:
- `enqueue(operation)` - Add failed operation to queue
- `processQueue()` - Process due retry operations (called by trigger)
- `getStatus()` - Get current queue status
- `clearQueue()` - Clear all queued operations (admin/debug)

#### `GoogleCalendarManager.js`
Enhanced to support retry queue:
- `createEvent()` - Returns `{ success, eventId?, queued?, error? }`
- Automatically queues failed operations when `rowNum` provided
- Captures user email for failure notifications

#### `RideManager.js`
Updated to handle new return format:
- Checks `result.success` before setting `GoogleEventId`
- Logs when operations are queued
- Handles both immediate success and queued states

#### `UIManager.js`
New notification function:
- `notifyQueuedOperations(count)` - Informs user about queued operations

### Data Storage

Queue stored in PropertiesService with structure:
```javascript
{
  id: "uuid",
  type: "create" | "update" | "delete",
  calendarId: "calendar@group.calendar.google.com",
  rideUrl: "https://ridewithgps.com/events/12345-event-name",  // Stable ride identifier
  params: {
    title: "Event Title",
    startTime: 1234567890000,  // timestamp
    endTime: 1234567891000,
    location: "Start Location",
    description: "Event description"
  },
  userEmail: "user@example.com",
  enqueuedAt: 1234567890000,
  nextRetryAt: 1234567890000,
  attemptCount: 0,
  lastError: null
}
```

**Note on Stable Identifiers**: The queue uses `rideUrl` (the RWGPS event URL) as the stable identifier rather than spreadsheet row numbers. This is critical because row numbers change when rows are inserted, deleted, or moved. The `rideUrl` is unique, stable, and allows the queue to find and update the correct ride when a retry succeeds.

### Time-Based Trigger

Function `processRetryQueue()` called every 5 minutes:
- Processes all due items
- Updates successful operations in spreadsheet
- Schedules next retry for failed operations
- Removes trigger when queue is empty

## Usage

### For Users

#### View Queue Status
1. Menu: **Ride Schedulers → View Retry Queue Status**
2. Shows:
   - Total queued operations
   - Items due for retry
   - Age distribution
   - Individual item details

#### Manual Processing
1. Menu: **Ride Schedulers → Process Retry Queue Now**
2. Immediately processes all due retry operations
3. Shows results summary

### For Developers

#### Queuing an Operation
```javascript
const result = GoogleCalendarManager.createEvent(
    calendarId, 
    title, 
    startTime, 
    endTime, 
    location, 
    description,
    row.RideURL  // Stable ride identifier for retry queue
);

if (result.success) {
    row.GoogleEventId = result.eventId;
} else if (result.queued) {
    console.log(`Operation queued: ${result.queueId}`);
} else {
    console.error(`Operation failed: ${result.error}`);
}
```

#### Checking Queue Status
```javascript
const retryQueue = new RetryQueue();
const status = retryQueue.getStatus();
console.log(`${status.totalItems} items in queue`);
console.log(`${status.dueNow} ready for retry`);
```

#### Manually Processing Queue
```javascript
const retryQueue = new RetryQueue();
const result = retryQueue.processQueue();
// result: { processed, succeeded, failed, remaining }
```

## Testing

### Simulating Failures
To test retry queue:
1. Temporarily break calendar access
2. Attempt to schedule a ride
3. Verify operation queued
4. Check queue status
5. Restore calendar access
6. Manually trigger processing or wait for automatic retry

### Clearing Queue
For testing/debugging:
```javascript
const retryQueue = new RetryQueue();
retryQueue.clearQueue();
```

## Monitoring

### Logs
- All queue operations logged to Apps Script console
- Search for "RetryQueue:" prefix
- Includes enqueue, process, success, and failure events

### Email Notifications
Users receive emails for:
- **Success**: "Calendar Event Created" - Operation succeeded after retry
- **Failure**: "Calendar Event Creation Failed" - Operation failed after 48 hours

## Limitations

- Maximum queue size: PropertiesService limit (~500KB)
- Each queued item ~1KB, supports ~500 concurrent failures
- Retry window: 48 hours maximum
- Trigger frequency: Every 5 minutes minimum (GAS limit)

## Error Handling

### Transient Errors
Automatically retried:
- "Calendar not found"
- Network timeouts
- Temporary API unavailability

### Permanent Errors  
Not retried (removed from queue):
- Invalid calendar ID
- Insufficient permissions
- Malformed event data

### Recovery
If queue processing fails:
- Trigger remains active
- Next scheduled run attempts processing
- Manual processing available via menu
- Worst case: Wait for automatic retry

## Performance Impact

- Queue check: <100ms (PropertiesService read)
- Process queue: <10s per item (includes spreadsheet write)
- Trigger: Only active when queue non-empty
- Storage: Minimal (JSON in PropertiesService)

## Future Enhancements

Potential improvements:
- [ ] Dashboard UI for queue management
- [ ] Configurable retry schedules
- [ ] Bulk operation support
- [ ] Queue size monitoring/alerts
- [ ] Historical retry analytics
- [ ] Manual retry prioritization
