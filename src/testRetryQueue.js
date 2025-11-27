/**
 * Test RetryQueue system with artificial failures
 * 
 * This file provides comprehensive testing functions for the RetryQueue system.
 * Run these functions from the GAS editor to experience the full retry workflow.
 */

/**
 * Main test orchestrator - runs through the complete retry scenario
 */
function testRetryQueueFullScenario() {
  Logger.log('=== Starting RetryQueue Full Scenario Test ===\n');
  
  // Clean slate
  cleanupRetryQueueTest();
  
  try {
    // 1. Setup test data
    Logger.log('Step 1: Setting up test data...');
    const testRideUrl = setupTestRide();
    Logger.log(`✓ Test ride URL: ${testRideUrl}\n`);
    
    // 2. Test immediate retry (simulated failure)
    Logger.log('Step 2: Testing immediate retry with artificial failure...');
    testImmediateRetryFailure(testRideUrl);
    
    // 3. Check queue status
    Logger.log('\nStep 3: Checking queue status...');
    const queue1 = new RetryQueue();
    const status1 = queue1.getStatus();
    Logger.log(JSON.stringify(status1, null, 2));
    
    // 4. Manually trigger retry (will fail again)
    Logger.log('\nStep 4: Manually triggering retry (expect failure)...');
    const queue2 = new RetryQueue();
    queue2.processQueue();
    
    // 5. Check queue status again
    Logger.log('\nStep 5: Checking queue status after first retry...');
    const queue3 = new RetryQueue();
    const status2 = queue3.getStatus();
    Logger.log(JSON.stringify(status2, null, 2));
    
    // 6. Simulate time passing and retry again
    Logger.log('\nStep 6: Simulating multiple retry attempts...');
    simulateMultipleRetries(testRideUrl);
    
    // 7. Final queue status
    Logger.log('\nStep 7: Final queue status...');
    const queue4 = new RetryQueue();
    const status3 = queue4.getStatus();
    Logger.log(JSON.stringify(status3, null, 2));
    
    Logger.log('\n=== Test Complete ===');
    Logger.log('Check your email for retry failure notifications');
    Logger.log('Queue persisted in PropertiesService - use cleanupRetryQueueTest() to clear');
    
  } catch (error) {
    Logger.log(`ERROR: ${error.message}`);
    Logger.log(error.stack);
  }
}

/**
 * Create a test ride entry in the spreadsheet
 * @returns {string} The RideURL for the test ride
 */
function setupTestRide() {
  const schedule = new ScheduleAdapter();
  const testRow = schedule.loadLastRow();
  
  if (!testRow) {
    throw new Error('No rows in spreadsheet - please add at least one ride entry');
  }
  
  Logger.log(`Using row ${testRow.rowNum}: ${testRow.StartDate} - ${testRow.Group}`);
  
  if (!testRow.RideURL) {
    throw new Error(`Test row has no RideURL - please ensure Ride column has a valid RWGPS URL. Row ${testRow.rowNum}: RideName='${testRow.RideName}', RouteURL='${testRow.RouteURL}'`);
  }
  
  return testRow.RideURL;
}

/**
 * Test immediate retry with artificial failure
 * @param {string} rideUrl - The RideURL to test with
 */
function testImmediateRetryFailure(rideUrl) {
  // Enable test mode to force failures
  PropertiesService.getScriptProperties().setProperty('RETRY_QUEUE_TEST_MODE', 'true');
  PropertiesService.getScriptProperties().setProperty('RETRY_QUEUE_FORCE_FAILURE', 'true');
  
  Logger.log('Test mode enabled - calendar operations will fail artificially');
  
  // Enqueue a fake calendar creation operation
  const operation = {
    type: 'create',
    calendarId: 'test-calendar-id',
    rideUrl: rideUrl,
    params: {
      title: 'Test Ride - Retry Queue Test',
      startTime: new Date(Date.now() + 86400000).getTime(), // Tomorrow
      endTime: new Date(Date.now() + 90000000).getTime(),   // Tomorrow + 1 hour
      location: 'Test Location',
      description: 'This is a test event for RetryQueue validation'
    },
    userEmail: Session.getActiveUser().getEmail()
  };
  
  const queue = new RetryQueue();
  queue.enqueue(operation);
  Logger.log('✓ Operation enqueued with artificial failure');
}

/**
 * Simulate multiple retry attempts by manipulating timestamps
 * @param {string} rideUrl - The RideURL being tested
 */
function simulateMultipleRetries(rideUrl) {
  const retryQueue = new RetryQueue();
  const queue = retryQueue._getQueue();
  const item = queue.find(i => i.rideUrl === rideUrl);
  
  if (!item) {
    Logger.log('⚠ No queue item found for this ride URL');
    return;
  }
  
  Logger.log(`Current attempt count: ${item.attemptCount}`);
  Logger.log(`Next retry scheduled for: ${new Date(item.nextRetryAt)}`);
  
  // Simulate time passing - set nextRetryAt to past
  item.nextRetryAt = Date.now() - 1000; // 1 second ago
  retryQueue._saveQueue(queue);
  
  Logger.log('⏰ Fast-forwarded time - processing retry now...');
  const retryQueue2 = new RetryQueue();
  retryQueue2.processQueue();
  
  // Check updated state
  const retryQueue3 = new RetryQueue();
  const updatedQueue = retryQueue3._getQueue();
  const updatedItem = updatedQueue.find(i => i.rideUrl === rideUrl);
  
  if (updatedItem) {
    Logger.log(`Updated attempt count: ${updatedItem.attemptCount}`);
    Logger.log(`Next retry scheduled for: ${new Date(updatedItem.nextRetryAt)}`);
  } else {
    Logger.log('Item removed from queue (max retries reached or success)');
  }
}

/**
 * Test successful retry (disable failure mode)
 */
function testSuccessfulRetry() {
  Logger.log('=== Testing Successful Retry ===\n');
  
  // Disable forced failures
  PropertiesService.getScriptProperties().deleteProperty('RETRY_QUEUE_FORCE_FAILURE');
  Logger.log('✓ Test mode disabled - retries will attempt real calendar operations');
  
  const queue1 = new RetryQueue();
  const statusBefore = queue1.getStatus();
  Logger.log('Queue before retry:\n' + JSON.stringify(statusBefore, null, 2));
  
  Logger.log('\nProcessing queue...');
  const queue2 = new RetryQueue();
  queue2.processQueue();
  
  const queue3 = new RetryQueue();
  const status2 = queue3.getStatus();
  Logger.log('\nQueue after retry:\n' + JSON.stringify(status2, null, 2));
  
  Logger.log('\n⚠ Note: If you see "Calendar Not Found" errors, that\'s expected');
  Logger.log('The test calendar ID is fake. For real testing, use an actual calendar ID.');
}

/**
 * Test the 48-hour cutoff
 */
function testCutoffBehavior() {
  Logger.log('=== Testing 48-Hour Cutoff ===\n');
  
  const retryQueue = new RetryQueue();
  const queue = retryQueue._getQueue();
  
  if (queue.length === 0) {
    Logger.log('Queue is empty - run testRetryQueueFullScenario() first');
    return;
  }
  
  // Artificially age the oldest item
  const item = queue[0];
  const oldEnqueuedAt = item.enqueuedAt;
  item.enqueuedAt = Date.now() - (49 * 60 * 60 * 1000); // 49 hours ago
  item.nextRetryAt = Date.now() - 1000; // Also make it due for processing NOW
  
  Logger.log(`Aged queue item from ${new Date(oldEnqueuedAt)} to ${new Date(item.enqueuedAt)}`);
  Logger.log(`User email: ${item.userEmail}`);
  Logger.log('Item should be removed on next processQueue() call...\n');
  
  retryQueue._saveQueue(queue);
  const retryQueue2 = new RetryQueue();
  retryQueue2.processQueue();
  
  const retryQueue3 = new RetryQueue();
  const statusAfter = retryQueue3.getStatus();
  Logger.log('Queue after processing aged item:\n' + JSON.stringify(statusAfter, null, 2));
  
  Logger.log(`\n✓ Check email at ${item.userEmail} for "maximum retry period" notification`);
  Logger.log('Note: If no email received, check the Execution log for MailApp errors');
}

/**
 * Test queue with multiple items
 */
function testMultipleQueueItems() {
  Logger.log('=== Testing Multiple Queue Items ===\n');
  
  cleanupRetryQueueTest();
  
  // Enable test mode
  PropertiesService.getScriptProperties().setProperty('RETRY_QUEUE_TEST_MODE', 'true');
  PropertiesService.getScriptProperties().setProperty('RETRY_QUEUE_FORCE_FAILURE', 'true');
  
  // Add 3 different operations
  const queue = new RetryQueue();
  const operations = [
    {
      type: 'create',
      calendarId: 'test-cal-1',
      rideUrl: 'https://ridewithgps.com/events/12345',
      params: {
        title: 'Test Event 1',
        startTime: Date.now() + 86400000,
        endTime: Date.now() + 90000000,
        location: 'Test Location 1',
        description: 'Test Description 1'
      },
      userEmail: Session.getActiveUser().getEmail()
    },
    {
      type: 'create',
      calendarId: 'test-cal-2',
      rideUrl: 'https://ridewithgps.com/events/67890',
      params: {
        title: 'Test Event 2',
        startTime: Date.now() + 86400000,
        endTime: Date.now() + 90000000,
        location: 'Test Location 2',
        description: 'Test Description 2'
      },
      userEmail: Session.getActiveUser().getEmail()
    },
    {
      type: 'create',
      calendarId: 'test-cal-3',
      rideUrl: 'https://ridewithgps.com/events/11111',
      params: {
        title: 'Test Event 3',
        startTime: Date.now() + 86400000,
        endTime: Date.now() + 90000000,
        location: 'Test Location 3',
        description: 'Test Description 3'
      },
      userEmail: Session.getActiveUser().getEmail()
    }
  ];
  
  operations.forEach((op, index) => {
    queue.enqueue(op);
    Logger.log(`✓ Enqueued operation ${index + 1}`);
  });
  
  const queue2 = new RetryQueue();
  const status = queue2.getStatus();
  Logger.log('\n' + JSON.stringify(status, null, 2));
  
  Logger.log('\n✓ Multiple items enqueued - use RetryQueue.processQueue() to retry');
}

/**
 * Inspect queue internals (debugging)
 */
function inspectQueueDetails() {
  Logger.log('=== Queue Details ===\n');
  
  const retryQueue = new RetryQueue();
  const queue = retryQueue._getQueue();
  
  if (queue.length === 0) {
    Logger.log('Queue is empty');
    return;
  }
  
  queue.forEach((item, index) => {
    Logger.log(`Item ${index + 1}:`);
    Logger.log(`  ID: ${item.id}`);
    Logger.log(`  Type: ${item.type}`);
    Logger.log(`  Ride URL: ${item.rideUrl}`);
    Logger.log(`  Enqueued: ${new Date(item.enqueuedAt)}`);
    Logger.log(`  Next Retry: ${new Date(item.nextRetryAt)}`);
    Logger.log(`  Attempt Count: ${item.attemptCount}`);
    Logger.log(`  Last Error: ${item.lastError}`);
    Logger.log(`  Age (hours): ${((Date.now() - item.enqueuedAt) / (60 * 60 * 1000)).toFixed(2)}`);
    Logger.log('');
  });
}

/**
 * Manually process queue (for testing trigger behavior)
 */
function manualProcessQueue() {
  Logger.log('=== Manual Queue Processing ===\n');
  
  const queue1 = new RetryQueue();
  const statusBefore = queue1.getStatus();
  Logger.log('Before:\n' + JSON.stringify(statusBefore, null, 2) + '\n');
  
  const queue2 = new RetryQueue();
  queue2.processQueue();
  
  const queue3 = new RetryQueue();
  const statusAfter = queue3.getStatus();
  Logger.log('After:\n' + JSON.stringify(statusAfter, null, 2));
}

/**
 * Clean up test data
 */
function cleanupRetryQueueTest() {
  Logger.log('=== Cleaning Up Test Data ===\n');
  
  // Clear queue
  PropertiesService.getScriptProperties().deleteProperty('calendarRetryQueue');
  Logger.log('✓ Queue cleared');
  
  // Clear test mode
  PropertiesService.getScriptProperties().deleteProperty('RETRY_QUEUE_TEST_MODE');
  PropertiesService.getScriptProperties().deleteProperty('RETRY_QUEUE_FORCE_FAILURE');
  Logger.log('✓ Test mode disabled');
  
  // Delete trigger if exists
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'retryQueueTrigger') {
      ScriptApp.deleteTrigger(trigger);
      Logger.log('✓ Retry trigger deleted');
    }
  });
  
  Logger.log('\n✓ Cleanup complete');
}

/**
 * Quick menu for common test operations
 */
function showTestMenu() {
  const ui = SpreadsheetApp.getUi();
  const result = ui.alert(
    'RetryQueue Test Menu',
    'Choose a test scenario:\n\n' +
    '1. Full Scenario - Complete retry workflow\n' +
    '2. Multiple Items - Test queue with 3 items\n' +
    '3. Successful Retry - Disable test mode\n' +
    '4. Cutoff Test - Test 48-hour limit\n' +
    '5. Inspect Queue - View queue details\n' +
    '6. Manual Process - Process queue now\n' +
    '7. Cleanup - Clear all test data\n\n' +
    'Check Execution Log (View > Executions) for results',
    ui.ButtonSet.OK
  );
}
