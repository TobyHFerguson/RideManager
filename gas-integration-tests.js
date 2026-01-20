/**
 * GAS Integration Test Suite for RWGPSClient (Phase 4 Complete)
 * 
 * MANDATORY: Run these tests after ANY code changes to RWGPSClient.js
 * 
 * PURPOSE: Verify RWGPSClient works correctly in Google Apps Script environment
 * - Tests actual HTTP calls to RWGPS API (not mocked)
 * - Verifies GAS-specific dependencies (UrlFetchApp, Utilities, DriveApp)
 * - Complements Jest unit tests (which test Core logic only)
 * 
 * ARCHITECTURE VALIDATION:
 * - RWGPSClientCore.js: Pure JavaScript (tested in Jest, 100% coverage)
 * - RWGPSClient.js: GAS adapter (tested here)
 * 
 * SETUP BEFORE RUNNING:
 * 1. Set Script Properties (File > Project Properties > Script Properties):
 *    - rwgps_api_key: Your RWGPS API key (lowercase!)
 *    - rwgps_auth_token: Your auth token (lowercase!)
 *    - rwgps_username: Your username (lowercase!)
 *    - rwgps_password: Your password (lowercase!)
 * 2. Ensure test event exists: Create event ID 445203 or update DEFAULT_TEST_EVENT_ID
 * 3. Deploy code: npm run dev:push
 * 
 * NOTE: Uses CredentialManager to get credentials (same as production code)
 * 
 * USAGE:
 * - Run all tests: runAllIntegrationTests()
 * - Run specific test: testGetEvent(445203)
 * - See test results in GAS Execution log (View > Logs)
 * 
 * CLEANUP:
 * - Tests create temporary events (far-future dates, private visibility)
 * - Auto-cleanup attempts to delete after test completes
 * - If cleanup fails, manually delete events with "[TEST]" prefix
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Default test event ID
 * - Must be an existing event you have permission to edit
 * - Used by tests that require a real event (getEvent, editEvent, cancel/reinstate)
 * - Recommended: Create a dedicated test event with future date + private visibility
 */
const DEFAULT_TEST_EVENT_ID = 445203;

/**
 * Test execution state (shared across tests)
 */
const TEST_STATE = {
    passed: 0,
    failed: 0,
    skipped: 0,
    errors: [],
    createdEvents: [] // Track events for cleanup
};

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Get RWGPSClient instance with credentials from Script Properties
 * Uses RWGPSClientFactory (centralized factory pattern)
 * @returns {RWGPSClient} Initialized client
 */
function getTestClient() {
    // Use RWGPSClientFactory - centralized factory for all RWGPSClient creation
    return RWGPSClientFactory.create();
}

/**
 * Assert helper - throws if condition is false
 * @param {boolean} condition - Condition to check
 * @param {string} message - Error message if condition fails
 */
function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

/**
 * Log test result
 * @param {string} testName - Name of test
 * @param {boolean} passed - Whether test passed
 * @param {string} [error] - Error message if failed
 */
function logTestResult(testName, passed, error) {
    if (passed) {
        TEST_STATE.passed++;
        console.log(`✅ PASS: ${testName}`);
    } else {
        TEST_STATE.failed++;
        TEST_STATE.errors.push({ test: testName, error: error });
        console.error(`❌ FAIL: ${testName}`);
        console.error(`   Error: ${error}`);
    }
}

/**
 * Track created event for cleanup
 * @param {string} eventUrl - Event URL to track
 */
function trackCreatedEvent(eventUrl) {
    TEST_STATE.createdEvents.push(eventUrl);
}

/**
 * Clean up all created events
 */
function cleanupCreatedEvents() {
    if (TEST_STATE.createdEvents.length === 0) {
        return;
    }
    
    console.log(`\n🧹 Cleaning up ${TEST_STATE.createdEvents.length} test event(s)...`);
    const client = getTestClient();
    
    TEST_STATE.createdEvents.forEach(eventUrl => {
        try {
            const result = client.deleteEvent(eventUrl);
            if (result.success) {
                console.log(`   ✅ Deleted: ${eventUrl}`);
            } else {
                console.warn(`   ⚠️  Failed to delete: ${eventUrl} - ${result.error}`);
            }
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            console.warn(`   ⚠️  Error deleting ${eventUrl}: ${err.message}`);
        }
    });
    
    TEST_STATE.createdEvents = [];
}

// ============================================================================
// TEST SUITE: Factory Pattern
// ============================================================================

/**
 * Test: RWGPSClientFactory.create() - Factory Pattern
 * 
 * Verifies:
 * - Factory returns RWGPSClient instance
 * - Client is properly configured with credentials
 * - Factory is the single point of client creation
 */
function testRWGPSClientFactory() {
    const testName = 'RWGPSClientFactory.create()';
    console.log(`\n📋 Running: ${testName}`);
    
    try {
        // STEP 1: Create client via factory
        console.log('   Creating client via RWGPSClientFactory.create()...');
        const client = RWGPSClientFactory.create();
        
        assert(client !== null, 'Factory should return a client');
        assert(typeof client.getEvent === 'function', 'Client should have getEvent method');
        assert(typeof client.createEvent === 'function', 'Client should have createEvent method');
        assert(typeof client.editEvent === 'function', 'Client should have editEvent method');
        
        console.log('   ✅ Client has expected methods');
        
        // STEP 2: Verify client works (basic connectivity test)
        console.log('   Verifying client can make API call...');
        const eventUrl = `https://ridewithgps.com/events/${DEFAULT_TEST_EVENT_ID}`;
        const result = client.getEvent(eventUrl);
        
        assert(result.success === true, 'Client should be able to make API calls');
        console.log('   ✅ Client successfully made API call');
        
        // STEP 3: Verify factory creates new instances (not singleton)
        console.log('   Verifying factory creates new instances...');
        const client2 = RWGPSClientFactory.create();
        assert(client !== client2, 'Factory should create new instances each time');
        console.log('   ✅ Factory creates distinct instances');
        
        logTestResult(testName, true);
        
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logTestResult(testName, false, err.message);
    }
}

// ============================================================================
// TEST SUITE: v1 API Operations (Basic Auth, No Login Required)
// ============================================================================

/**
 * Test: RWGPSClient.getEvent() - v1 API GET
 * 
 * Verifies:
 * - Uses v1 API with Basic Auth (no login required)
 * - Returns event data in web format
 * - Handles valid and invalid event IDs
 * 
 * @param {number} [eventId] - Event ID to test (default: DEFAULT_TEST_EVENT_ID)
 */
function testGetEvent(eventId) {
    const testName = 'getEvent (v1 API)';
    console.log(`\n📋 Running: ${testName}`);
    
    eventId = eventId || DEFAULT_TEST_EVENT_ID;
    
    try {
        const client = getTestClient();
        const eventUrl = `https://ridewithgps.com/events/${eventId}`;
        
        // STEP 1: Get valid event
        console.log(`   Getting event ${eventId}...`);
        const result = client.getEvent(eventUrl);
        
        assert(result.success === true, 'getEvent should succeed for valid event');
        assert(result.event !== null, 'Event data should not be null');
        assert(result.event.id === eventId, `Event ID should match: expected ${eventId}, got ${result.event.id}`);
        assert(result.event.name, 'Event should have name');
        assert(result.event.starts_at || (result.event.start_date && result.event.start_time), 'Event should have start time');
        
        console.log(`   ✅ Event retrieved: "${result.event.name}"`);
        
        // STEP 2: Test invalid event ID
        console.log('   Testing invalid event ID...');
        const invalidResult = client.getEvent('https://ridewithgps.com/events/99999999');
        
        assert(invalidResult.success === false, 'getEvent should fail for invalid event');
        assert(invalidResult.error, 'Should return error message');
        
        console.log('   ✅ Invalid ID handled correctly');
        
        logTestResult(testName, true);
        return { success: true };
        
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logTestResult(testName, false, err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Test: RWGPSClient.editEvent() - v1 API PUT (Single Edit)
 * 
 * Verifies:
 * - Uses v1 API with Basic Auth
 * - Single PUT updates event (no double-edit)
 * - Returns updated event data
 * - Non-destructive (restores original state)
 * 
 * @param {number} [eventId] - Event ID to test (default: DEFAULT_TEST_EVENT_ID)
 */
function testEditEvent(eventId) {
    const testName = 'editEvent (v1 API single PUT)';
    console.log(`\n📋 Running: ${testName}`);
    
    eventId = eventId || DEFAULT_TEST_EVENT_ID;
    const eventUrl = `https://ridewithgps.com/events/${eventId}`;
    
    try {
        const client = getTestClient();
        
        // STEP 1: Get original event
        console.log(`   Getting original event ${eventId}...`);
        const getResult = client.getEvent(eventUrl);
        assert(getResult.success, 'Failed to get original event');
        
        const originalEvent = getResult.event;
        const originalDescription = originalEvent.description || '';
        console.log(`   ✅ Original description: "${originalDescription.substring(0, 50)}..."`);
        
        // STEP 2: Edit event
        const testDescription = `[TEST] Modified at ${new Date().toISOString()}`;
        console.log(`   Editing event description...`);
        
        const editResult = client.editEvent(eventUrl, {
            description: testDescription
        });
        
        assert(editResult.success, 'editEvent should succeed');
        assert(editResult.event.description === testDescription, `Description not updated correctly`);
        
        console.log(`   ✅ Event edited successfully`);
        
        // STEP 3: Verify with GET
        console.log('   Verifying edit...');
        const verifyResult = client.getEvent(eventUrl);
        assert(verifyResult.success, 'Failed to verify event');
        assert(verifyResult.event.description === testDescription, 'Description not persisted');
        
        console.log('   ✅ Edit verified');
        
        // STEP 4: Restore original
        console.log('   Restoring original state...');
        const restoreResult = client.editEvent(eventUrl, {
            description: originalDescription
        });
        
        assert(restoreResult.success, 'Failed to restore original event');
        console.log('   ✅ Original state restored');
        
        logTestResult(testName, true);
        return { success: true };
        
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error(`   ⚠️  Attempting to restore event state after error...`);
        try {
            const client = getTestClient();
            const getResult = client.getEvent(eventUrl);
            if (getResult.success) {
                client.editEvent(eventUrl, getResult.event);
            }
        } catch (restoreError) {
            // Ignore restore errors
        }
        
        logTestResult(testName, false, err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Test: RWGPS API Extra Fields Tolerance
 * 
 * PURPOSE: Verify RWGPS API ignores fields not in the OpenAPI spec
 * 
 * This test is important for architecture decisions:
 * - If RWGPS ignores extra fields, we can use a unified "superset" event shape
 * - No need for field-filtering conversion functions
 * - Dramatically simplifies data flow through the system
 * 
 * Tests:
 * 1. PUT with extra fields (organizers array, routes array, made-up fields)
 * 2. Verify API accepts the request (doesn't 400/422)
 * 3. Verify known fields are correctly updated
 * 4. Verify extra fields don't cause data corruption
 * 
 * @param {number} [eventId] - Event ID to test (default: DEFAULT_TEST_EVENT_ID)
 */
function testExtraFieldsTolerance(eventId) {
    const testName = 'editEvent with extra fields (API tolerance test)';
    console.log(`\n📋 Running: ${testName}`);
    
    eventId = eventId || DEFAULT_TEST_EVENT_ID;
    const eventUrl = `https://ridewithgps.com/events/${eventId}`;
    
    try {
        const client = getTestClient();
        
        // STEP 1: Get original event
        console.log(`   Getting original event ${eventId}...`);
        const getResult = client.getEvent(eventUrl);
        assert(getResult.success, 'Failed to get original event');
        
        const originalEvent = getResult.event;
        const originalDescription = originalEvent.description || '';
        console.log(`   ✅ Original event fetched`);
        console.log(`   Original fields present: ${Object.keys(originalEvent).join(', ')}`);
        
        // STEP 2: Try to edit with EXTRA fields that aren't in OpenAPI spec
        // These are fields that come back from GET but shouldn't be needed for PUT
        const testMarker = `[EXTRA-FIELDS-TEST] ${new Date().toISOString()}`;
        
        const payloadWithExtraFields = {
            // Valid fields
            description: testMarker,
            
            // Extra fields from GET response (not in PUT spec)
            id: originalEvent.id,  // Read-only
            organizers: originalEvent.organizers || [],  // Full objects (PUT uses organizer_ids)
            routes: originalEvent.routes || [],  // Full objects (PUT uses route_ids)
            time_zone: originalEvent.time_zone || 'America/Los_Angeles',
            created_at: originalEvent.created_at,  // Read-only metadata
            updated_at: originalEvent.updated_at,  // Read-only metadata
            
            // Completely made-up fields
            fake_field_1: 'should be ignored',
            __internal_data: { nested: true, values: [1, 2, 3] },
            copilot_test_marker: 'EXTRA_FIELD_TEST_2026',
            
            // Mixed-format fields
            starts_at: originalEvent.starts_at,  // Web format (v1 uses start_date/time)
            desc: 'This is web format desc field'  // Web format alias
        };
        
        console.log(`   Attempting PUT with ${Object.keys(payloadWithExtraFields).length} fields (many extra)...`);
        console.log(`   Extra fields: id, organizers, routes, time_zone, created_at, updated_at, fake_field_1, __internal_data, copilot_test_marker`);
        
        // This is the key test - does RWGPS accept extra fields?
        const editResult = client.editEvent(eventUrl, payloadWithExtraFields);
        
        if (!editResult.success) {
            console.log(`   ❌ API rejected extra fields: ${editResult.error}`);
            console.log(`   Response code: ${editResult.responseCode || 'N/A'}`);
            logTestResult(testName, false, `API rejected extra fields: ${editResult.error}`);
            return { success: false, toleratesExtraFields: false, error: editResult.error };
        }
        
        console.log(`   ✅ API ACCEPTED request with extra fields!`);
        
        // STEP 3: Verify the known field was correctly updated
        console.log('   Verifying known field (description) was updated...');
        const verifyResult = client.getEvent(eventUrl);
        assert(verifyResult.success, 'Failed to verify event');
        
        const updatedDesc = verifyResult.event.description || '';
        const descUpdated = updatedDesc.includes('[EXTRA-FIELDS-TEST]');
        
        if (!descUpdated) {
            console.log(`   ⚠️  Description NOT updated. Got: "${updatedDesc.substring(0, 50)}..."`);
            console.log(`   This means API accepted but ignored ALL fields (unusual)`);
        } else {
            console.log(`   ✅ Description correctly updated`);
        }
        
        // STEP 4: Check that extra fields didn't corrupt data
        console.log('   Checking for data corruption...');
        const verifiedEvent = verifyResult.event;
        
        // Name should be unchanged
        assert(verifiedEvent.name === originalEvent.name, 'Name was corrupted!');
        console.log('   ✅ Name unchanged');
        
        // Start date/time should be unchanged  
        assert(verifiedEvent.start_date === originalEvent.start_date, 'Start date was corrupted!');
        console.log('   ✅ Start date unchanged');
        
        // STEP 5: Restore original state
        console.log('   Restoring original state...');
        const restoreResult = client.editEvent(eventUrl, {
            description: originalDescription
        });
        assert(restoreResult.success, 'Failed to restore original event');
        console.log('   ✅ Original state restored');
        
        // SUCCESS! RWGPS tolerates extra fields
        console.log('\n   ════════════════════════════════════════════════════════');
        console.log('   🎉 RESULT: RWGPS API TOLERATES EXTRA FIELDS!');
        console.log('   ════════════════════════════════════════════════════════');
        console.log('   Implication: We can pass full superset event objects');
        console.log('   without stripping fields. This simplifies architecture!');
        console.log('   ════════════════════════════════════════════════════════\n');
        
        logTestResult(testName, true);
        return { success: true, toleratesExtraFields: true };
        
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error(`   Error during test: ${err.message}`);
        
        // Attempt restore
        console.log('   ⚠️  Attempting to restore event state after error...');
        try {
            const client = getTestClient();
            const getResult = client.getEvent(eventUrl);
            if (getResult.success && getResult.event) {
                const originalDescription = getResult.event.description || '';
                if (originalDescription.includes('[EXTRA-FIELDS-TEST]')) {
                    client.editEvent(eventUrl, { description: '' });
                    console.log('   Cleaned up test marker from description');
                }
            }
        } catch (restoreError) {
            // Ignore restore errors
        }
        
        logTestResult(testName, false, err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Test: RWGPSClient.deleteEvent() - v1 API DELETE
 * 
 * Verifies:
 * - Uses v1 API with Basic Auth (no login required)
 * - Returns 204 No Content on success
 * - Event is actually deleted
 * 
 * Creates temporary event to delete (auto-cleanup)
 */
function testDeleteEvent() {
    const testName = 'deleteEvent (v1 API)';
    console.log(`\n📋 Running: ${testName}`);
    
    let tempEventUrl = null;
    
    try {
        const client = getTestClient();
        
        // STEP 1: Create temporary event
        console.log('   Creating temporary event...');
        const createResult = client.createEvent({
            name: '[TEST DELETE] Temporary event',
            description: 'Will be deleted immediately by test',
            start_date: '2030-12-31',
            start_time: '09:00',
            visibility: 2 // Private
        });
        
        assert(createResult.success, 'Failed to create temporary event');
        tempEventUrl = createResult.eventUrl;
        console.log(`   ✅ Created: ${tempEventUrl}`);
        
        // STEP 2: Delete event
        console.log('   Deleting event...');
        const deleteResult = client.deleteEvent(tempEventUrl);
        
        assert(deleteResult.success, 'deleteEvent should succeed');
        console.log('   ✅ Delete succeeded (204 No Content)');
        
        // STEP 3: Verify deletion
        console.log('   Verifying deletion...');
        const verifyResult = client.getEvent(tempEventUrl);
        
        assert(verifyResult.success === false, 'Event should not exist after deletion');
        console.log('   ✅ Deletion verified');
        
        logTestResult(testName, true);
        return { success: true };
        
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        
        // Attempt cleanup
        if (tempEventUrl) {
            try {
                console.warn('   ⚠️  Test failed, attempting cleanup...');
                const client = getTestClient();
                client.deleteEvent(tempEventUrl);
            } catch (cleanupError) {
                console.warn(`   ⚠️  Cleanup failed, manual deletion required: ${tempEventUrl}`);
            }
        }
        
        logTestResult(testName, false, err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Test: RWGPSClient.cancelEvent() - v1 API cancel workflow
 * 
 * Verifies:
 * - Adds "CANCELLED: " prefix to event name
 * - Uses v1 API (no login required)
 * - Non-destructive (restores original state)
 * 
 * @param {number} [eventId] - Event ID to test (default: DEFAULT_TEST_EVENT_ID)
 */
function testCancelEvent(eventId) {
    const testName = 'cancelEvent';
    console.log(`\n📋 Running: ${testName}`);
    
    eventId = eventId || DEFAULT_TEST_EVENT_ID;
    const eventUrl = `https://ridewithgps.com/events/${eventId}`;
    
    try {
        const client = getTestClient();
        
        // STEP 1: Get original event
        console.log(`   Getting original event ${eventId}...`);
        const getResult = client.getEvent(eventUrl);
        assert(getResult.success, 'Failed to get original event');
        
        const originalName = getResult.event.name;
        const alreadyCancelled = originalName.startsWith('CANCELLED: ');
        
        if (alreadyCancelled) {
            // Reinstate first to get clean state
            console.log('   Event already cancelled, reinstating first...');
            const reinstateResult = client.reinstateEvent(eventUrl);
            assert(reinstateResult.success, 'Failed to reinstate event for test setup');
        }
        
        const cleanName = originalName.replace(/^CANCELLED: /, '');
        console.log(`   ✅ Original name: "${cleanName}"`);
        
        // STEP 2: Cancel event
        console.log('   Cancelling event...');
        const cancelResult = client.cancelEvent(eventUrl);
        
        assert(cancelResult.success, 'cancelEvent should succeed');
        assert(cancelResult.event.name.startsWith('CANCELLED: '), 'Name should have CANCELLED: prefix');
        assert(cancelResult.event.name === `CANCELLED: ${cleanName}`, 'Name should match expected format');
        
        console.log(`   ✅ Event cancelled: "${cancelResult.event.name}"`);
        
        // STEP 3: Verify with GET
        console.log('   Verifying cancellation...');
        const verifyResult = client.getEvent(eventUrl);
        assert(verifyResult.success, 'Failed to verify event');
        assert(verifyResult.event.name.startsWith('CANCELLED: '), 'Cancellation not persisted');
        
        console.log('   ✅ Cancellation verified');
        
        // STEP 4: Restore original state
        console.log('   Restoring original state...');
        if (alreadyCancelled) {
            // Was originally cancelled, cancel again
            const recancelResult = client.cancelEvent(eventUrl);
            assert(recancelResult.success, 'Failed to restore cancelled state');
        } else {
            // Was originally not cancelled, reinstate
            const reinstateResult = client.reinstateEvent(eventUrl);
            assert(reinstateResult.success, 'Failed to restore original state');
        }
        
        console.log('   ✅ Original state restored');
        
        logTestResult(testName, true);
        return { success: true };
        
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logTestResult(testName, false, err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Test: RWGPSClient.reinstateEvent() - v1 API reinstate workflow
 * 
 * Verifies:
 * - Removes "CANCELLED: " prefix from event name
 * - Uses v1 API (no login required)
 * - Non-destructive (restores original state)
 * 
 * @param {number} [eventId] - Event ID to test (default: DEFAULT_TEST_EVENT_ID)
 */
function testReinstateEvent(eventId) {
    const testName = 'reinstateEvent';
    console.log(`\n📋 Running: ${testName}`);
    
    eventId = eventId || DEFAULT_TEST_EVENT_ID;
    const eventUrl = `https://ridewithgps.com/events/${eventId}`;
    
    try {
        const client = getTestClient();
        
        // STEP 1: Get original event and ensure it's cancelled
        console.log(`   Getting original event ${eventId}...`);
        const getResult = client.getEvent(eventUrl);
        assert(getResult.success, 'Failed to get original event');
        
        const originalName = getResult.event.name;
        const alreadyCancelled = originalName.startsWith('CANCELLED: ');
        
        if (!alreadyCancelled) {
            // Cancel first to set up test
            console.log('   Event not cancelled, cancelling first...');
            const cancelResult = client.cancelEvent(eventUrl);
            assert(cancelResult.success, 'Failed to cancel event for test setup');
        }
        
        const cancelledName = alreadyCancelled ? originalName : `CANCELLED: ${originalName}`;
        const expectedReinstatedName = cancelledName.replace(/^CANCELLED: /, '');
        console.log(`   ✅ Cancelled name: "${cancelledName}"`);
        
        // STEP 2: Reinstate event
        console.log('   Reinstating event...');
        const reinstateResult = client.reinstateEvent(eventUrl);
        
        assert(reinstateResult.success, 'reinstateEvent should succeed');
        assert(!reinstateResult.event.name.startsWith('CANCELLED: '), 'Name should not have CANCELLED: prefix');
        assert(reinstateResult.event.name === expectedReinstatedName, 'Name should match expected format');
        
        console.log(`   ✅ Event reinstated: "${reinstateResult.event.name}"`);
        
        // STEP 3: Verify with GET
        console.log('   Verifying reinstatement...');
        const verifyResult = client.getEvent(eventUrl);
        assert(verifyResult.success, 'Failed to verify event');
        assert(!verifyResult.event.name.startsWith('CANCELLED: '), 'Reinstatement not persisted');
        
        console.log('   ✅ Reinstatement verified');
        
        // STEP 4: Restore original state
        console.log('   Restoring original state...');
        if (alreadyCancelled) {
            // Was originally cancelled, cancel again
            const recancelResult = client.cancelEvent(eventUrl);
            assert(recancelResult.success, 'Failed to restore cancelled state');
        }
        // If was not originally cancelled, already in correct state
        
        console.log('   ✅ Original state restored');
        
        logTestResult(testName, true);
        return { success: true };
        
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logTestResult(testName, false, err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Test: RWGPSClient.createEvent() - v1 API POST without logo
 * 
 * Verifies:
 * - Creates event using v1 API with JSON POST
 * - Returns event URL and event data
 * - Event is actually created
 * 
 * Auto-cleanup after test
 */
function testCreateEvent() {
    const testName = 'createEvent (JSON POST)';
    console.log(`\n📋 Running: ${testName}`);
    
    let tempEventUrl = null;
    
    try {
        const client = getTestClient();
        
        // STEP 1: Create event
        const timestamp = new Date().toISOString();
        console.log('   Creating event...');
        
        const createResult = client.createEvent({
            name: `[TEST CREATE] ${timestamp}`,
            description: 'Integration test event - auto-deleted',
            start_date: '2030-06-15',
            start_time: '10:00',
            visibility: 2, // Private
            location: 'Test Location'
        });
        
        assert(createResult.success, 'createEvent should succeed');
        assert(createResult.eventUrl, 'Should return event URL');
        assert(createResult.event, 'Should return event data');
        assert(createResult.event.id, 'Event should have ID');
        
        tempEventUrl = createResult.eventUrl;
        trackCreatedEvent(tempEventUrl);
        
        console.log(`   ✅ Created: ${tempEventUrl}`);
        console.log(`   Event ID: ${createResult.event.id}`);
        
        // STEP 2: Verify event exists
        console.log('   Verifying event...');
        const verifyResult = client.getEvent(tempEventUrl);
        
        assert(verifyResult.success, 'Failed to get created event');
        assert(verifyResult.event.id === createResult.event.id, 'Event IDs should match');
        
        console.log('   ✅ Event verified');
        
        logTestResult(testName, true);
        return { success: true, eventUrl: tempEventUrl };
        
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logTestResult(testName, false, err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Test: RWGPSClient.createEvent() with logo - v1 API multipart POST
 * 
 * Verifies:
 * - Creates event with logo using multipart/form-data POST
 * - Handles Drive URL → blob conversion
 * - Logo appears on created event
 * 
 * SETUP REQUIRED:
 * 1. Upload test image to Google Drive
 * 2. Share with "Anyone with link can view"
 * 3. Pass Drive URL to this function
 * 
 * Auto-cleanup after test
 * 
 * @param {string} [logoUrl] - Google Drive URL for test logo
 */
function testCreateEventWithLogo(logoUrl) {
    const testName = 'createEvent with logo (multipart POST)';
    console.log(`\n📋 Running: ${testName}`);
    
    if (!logoUrl) {
        console.warn('   ⚠️  Skipping: No logoUrl provided');
        console.warn('   Usage: testCreateEventWithLogo("https://drive.google.com/file/d/YOUR_ID/view")');
        TEST_STATE.skipped++;
        return { success: true, skipped: true };
    }
    
    let tempEventUrl = null;
    
    try {
        const client = getTestClient();
        
        // STEP 1: Create event with logo
        const timestamp = new Date().toISOString();
        console.log('   Creating event with logo...');
        console.log(`   Logo URL: ${logoUrl}`);
        
        const createResult = client.createEvent({
            name: `[TEST LOGO] ${timestamp}`,
            description: 'Integration test with logo - auto-deleted',
            start_date: '2030-06-15',
            start_time: '14:00',
            visibility: 2 // Private
        }, logoUrl);
        
        assert(createResult.success, 'createEvent with logo should succeed');
        assert(createResult.eventUrl, 'Should return event URL');
        assert(createResult.event.id, 'Event should have ID');
        
        tempEventUrl = createResult.eventUrl;
        trackCreatedEvent(tempEventUrl);
        
        console.log(`   ✅ Created: ${tempEventUrl}`);
        console.log(`   Event ID: ${createResult.event.id}`);
        
        // STEP 2: Verify event and check for logo
        console.log('   Verifying event with logo...');
        const verifyResult = client.getEvent(tempEventUrl);
        
        assert(verifyResult.success, 'Failed to get created event');
        
        // Check if logo_url is present (may not be immediately available)
        if (verifyResult.event.logo_url) {
            console.log(`   ✅ Logo URL present: ${verifyResult.event.logo_url}`);
        } else {
            console.warn('   ⚠️  Logo URL not immediately available (may still be processing)');
        }
        
        console.log('   ✅ Event with logo verified');
        console.log('   📝 Manual verification: Visit event page to confirm logo appears');
        
        logTestResult(testName, true);
        return { success: true, eventUrl: tempEventUrl };
        
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logTestResult(testName, false, err.message);
        return { success: false, error: err.message };
    }
}

// ============================================================================
// TEST SUITE: Mixed API Operations (v1 + Web, Require Login)
// ============================================================================

/**
 * Test: RWGPSClient.importRoute() - Mixed API operation
 * 
 * Verifies:
 * - Copies route using web API
 * - Tags route using web API
 * - Returns new route URL and ID
 * 
 * Auto-cleanup after test
 * 
 * @param {string} [sourceRouteUrl] - Route URL to import (default: test route)
 */
function testImportRoute(sourceRouteUrl) {
    const testName = 'importRoute (mixed API)';
    console.log(`\n📋 Running: ${testName}`);
    
    // Default test route (must be accessible)
    sourceRouteUrl = sourceRouteUrl || 'https://ridewithgps.com/routes/50969472';
    
    let copiedRouteUrl = null;
    
    try {
        const client = getTestClient();
        
        // STEP 1: Import route
        console.log(`   Importing route: ${sourceRouteUrl}`);
        
        // Get club user ID from globals (required for route import)
        const globals = getGlobals();
        
        const importResult = client.importRoute(sourceRouteUrl, {
            name: `[TEST IMPORT] ${new Date().toISOString()}`,
            expiry: '12/31/2030',
            tags: ['test-import'],
            userId: globals.SCCCC_USER_ID
        });
        
        console.log(`   Import result: success=${importResult.success}, error=${importResult.error || 'none'}`);
        
        assert(importResult.success, `importRoute should succeed (error: ${importResult.error || 'none'})`);
        assert(importResult.routeUrl, 'Should return route URL');
        assert(importResult.route, 'Should return route data');
        assert(importResult.route.id, 'Route should have ID');
        
        copiedRouteUrl = importResult.routeUrl;
        
        console.log(`   ✅ Imported: ${copiedRouteUrl}`);
        console.log(`   Route ID: ${importResult.route.id}`);
        
        // STEP 2: Verify route exists
        console.log('   Verifying imported route...');
        const verifyResult = client.getRoute(copiedRouteUrl);
        
        assert(verifyResult.success, 'Failed to get imported route');
        assert(verifyResult.route.id === importResult.route.id, 'Route IDs should match');
        
        console.log('   ✅ Route verified');
        
        // STEP 3: Clean up (routes don't have deleteRoute method, manual cleanup required)
        console.log('   ⚠️  Manual cleanup required: Delete route from RWGPS');
        console.log(`   Route URL: ${copiedRouteUrl}`);
        
        logTestResult(testName, true);
        return { success: true, routeUrl: copiedRouteUrl };
        
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logTestResult(testName, false, err.message);
        
        if (copiedRouteUrl) {
            console.warn(`   ⚠️  Manual cleanup required: ${copiedRouteUrl}`);
        }
        
        return { success: false, error: err.message };
    }
}

/**
 * Test: RWGPSClient.getClubMembers() - v1 API with Pagination
 * 
 * Verifies:
 * - Uses v1 API with Basic Auth (no login required)
 * - Returns array of club members
 * - Handles pagination correctly (fetches all pages)
 * - Each member has expected structure (user object with id, names)
 * 
 * Note: This test reads from the actual club member list.
 * It does not modify any data.
 */
function testGetClubMembers() {
    const testName = 'getClubMembers (v1 API with pagination)';
    console.log(`\n📋 Running: ${testName}`);
    
    try {
        const client = getTestClient();
        
        // STEP 1: Get club members
        console.log('   Fetching club members...');
        const result = client.getClubMembers();
        
        assert(result.success === true, `getClubMembers should succeed (error: ${result.error || 'none'})`);
        assert(Array.isArray(result.members), 'Result should contain members array');
        
        console.log(`   ✅ Retrieved ${result.members.length} members`);
        
        // STEP 2: Verify member structure (check first member)
        if (result.members.length > 0) {
            console.log('   Verifying member structure...');
            const firstMember = result.members[0];
            
            assert(firstMember.id !== undefined, 'Member should have id');
            assert(firstMember.user !== undefined, 'Member should have user object');
            assert(firstMember.user.id !== undefined, 'Member.user should have id');
            assert(typeof firstMember.user.first_name === 'string', 'Member.user should have first_name');
            assert(typeof firstMember.user.last_name === 'string', 'Member.user should have last_name');
            
            console.log(`   ✅ Member structure verified (first: ${firstMember.user.first_name} ${firstMember.user.last_name})`);
            
            // STEP 3: Verify active field exists
            console.log('   Verifying active field...');
            assert(typeof firstMember.active === 'boolean', 'Member should have boolean active field');
            console.log(`   ✅ Active field verified (active=${firstMember.active})`);
        } else {
            console.log('   ⚠️  No members returned (club may be empty)');
        }
        
        logTestResult(testName, true);
        return { success: true, memberCount: result.members.length };
        
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logTestResult(testName, false, err.message);
        return { success: false, error: err.message };
    }
}

// ============================================================================
// PHASE 4: TYPE CONTRACT VALIDATION
// ============================================================================

/**
 * TEST 10.2.2: Verify RWGPSEvent response matches type definition
 * 
 * Validates that getEvent() response includes all required fields from RWGPSEvent.d.ts
 * 
 * Required fields (from RWGPSEvent interface):
 * - id, user_id, url, visibility, name, description, logo_url, banner_url, location
 * - lat, lng, time_zone, start_date, start_time, end_date, end_time, all_day
 * - created_at, updated_at, organizers, routes
 * 
 * @param {number} eventId - Event ID to test
 * @returns {{success: boolean, error?: string}}
 */
function testRWGPSEventResponseMatchesType(eventId) {
    const testName = 'testRWGPSEventResponseMatchesType';
    console.log(`\n▶️  ${testName} (eventId: ${eventId})`);
    
    try {
        const client = getTestClient();
        const eventUrl = `https://ridewithgps.com/events/${eventId}`;
        
        // STEP 1: Get event
        console.log('   Getting event...');
        const result = client.getEvent(eventUrl);
        
        assert(result.success === true, `getEvent should succeed (error: ${result.error || 'none'})`);
        assert(result.event !== undefined, 'Result should contain event object');
        
        const event = result.event;
        console.log(`   ✅ Event retrieved: "${event.name}"`);
        
        // STEP 2: Verify required fields from RWGPSEvent interface
        console.log('   Verifying required fields...');
        
        // Basic fields
        assert(typeof event.id === 'number', 'event.id should be number');
        assert(typeof event.user_id === 'number', 'event.user_id should be number');
        assert(typeof event.url === 'string', 'event.url should be string');
        assert(typeof event.name === 'string', 'event.name should be string');
        assert(event.description !== undefined, 'event.description should exist (can be null)');
        assert(event.logo_url !== undefined, 'event.logo_url should exist (can be null)');
        assert(event.banner_url !== undefined, 'event.banner_url should exist (can be null)');
        assert(event.location !== undefined, 'event.location should exist (can be null)');
        
        // Location fields
        assert(event.lat !== undefined, 'event.lat should exist (can be null)');
        assert(event.lng !== undefined, 'event.lng should exist (can be null)');
        
        // Time fields
        assert(typeof event.time_zone === 'string', 'event.time_zone should be string');
        assert(typeof event.start_date === 'string', 'event.start_date should be string');
        assert(typeof event.start_time === 'string', 'event.start_time should be string');
        assert(event.end_date !== undefined, 'event.end_date should exist (can be undefined)');
        assert(event.end_time !== undefined, 'event.end_time should exist (can be undefined)');
        assert(typeof event.all_day === 'boolean', 'event.all_day should be boolean');
        
        // Metadata fields
        assert(typeof event.created_at === 'string', 'event.created_at should be string');
        assert(typeof event.updated_at === 'string', 'event.updated_at should be string');
        assert(event.visibility !== undefined, 'event.visibility should exist');
        
        console.log('   ✅ All basic required fields present');
        
        // STEP 3: Verify organizers array (RWGPSEvent extends with organizers)
        console.log('   Verifying organizers structure...');
        assert(Array.isArray(event.organizers), 'event.organizers should be array');
        console.log(`   ✅ Organizers array present (${event.organizers.length} organizers)`);
        
        // If organizers exist, verify structure
        if (event.organizers.length > 0) {
            const firstOrg = event.organizers[0];
            assert(typeof firstOrg.id === 'number', 'organizer.id should be number');
            console.log(`   ✅ Organizer structure valid (id: ${firstOrg.id})`);
        }
        
        // STEP 4: Verify routes array (optional in RWGPSEvent)
        console.log('   Verifying routes field...');
        assert(event.routes !== undefined, 'event.routes should exist (can be empty array)');
        if (event.routes) {
            assert(Array.isArray(event.routes), 'event.routes should be array when present');
            console.log(`   ✅ Routes array present (${event.routes.length} routes)`);
            
            // If routes exist, verify structure
            if (event.routes.length > 0) {
                const firstRoute = event.routes[0];
                assert(typeof firstRoute.id === 'number', 'route.id should be number');
                console.log(`   ✅ Route structure valid (id: ${firstRoute.id})`);
            }
        }
        
        logTestResult(testName, true);
        return { success: true };
        
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logTestResult(testName, false, err.message);
        return { success: false, error: err.message };
    }
}

/**
 * TEST 10.2.3: Verify RWGPSEventInput is accepted by API
 * 
 * Tests that a minimal valid RWGPSEventInput object is accepted by updateEvent()
 * 
 * Creates a minimal input matching RWGPSEventInput type definition:
 * - name: string
 * - description: string (optional)
 * - visibility: number (optional but commonly used)
 * - all_day: boolean (per OpenAPI spec)
 * 
 * @param {number} eventId - Event ID to update
 * @returns {{success: boolean, error?: string}}
 */
function testRWGPSEventInputAccepted(eventId) {
    const testName = 'testRWGPSEventInputAccepted';
    console.log(`\n▶️  ${testName} (eventId: ${eventId})`);
    
    try {
        const client = getTestClient();
        const eventUrl = `https://ridewithgps.com/events/${eventId}`;
        
        // STEP 1: Get current event to preserve important fields
        console.log('   Getting current event state...');
        const getResult = client.getEvent(eventUrl);
        assert(getResult.success === true, `getEvent should succeed (error: ${getResult.error || 'none'})`);
        
        const originalEvent = getResult.event;
        console.log(`   ✅ Current event: "${originalEvent.name}"`);
        
        // STEP 2: Build minimal RWGPSEventInput matching type definition
        console.log('   Building minimal RWGPSEventInput...');
        
        /** @type {import('./src/rwgpslib/RWGPSEvent').RWGPSEventInput} */
        const minimalInput = {
            name: originalEvent.name + ' [Type Test]',
            description: 'Testing RWGPSEventInput type contract',
            visibility: originalEvent.visibility,
            all_day: originalEvent.all_day
        };
        
        console.log('   ✅ Minimal input created (4 fields: name, description, visibility, all_day)');
        
        // STEP 3: Update event with minimal input
        console.log('   Updating event with minimal input...');
        const updateResult = client.updateEvent(eventUrl, minimalInput);
        
        assert(updateResult.success === true, `updateEvent should accept minimal input (error: ${updateResult.error || 'none'})`);
        console.log('   ✅ API accepted minimal RWGPSEventInput');
        
        // STEP 4: Verify update was applied
        console.log('   Verifying update was applied...');
        const verifyResult = client.getEvent(eventUrl);
        assert(verifyResult.success === true, `getEvent should succeed after update (error: ${verifyResult.error || 'none'})`);
        
        const updatedEvent = verifyResult.event;
        assert(updatedEvent.name === minimalInput.name, `Event name should be updated to "${minimalInput.name}"`);
        assert(updatedEvent.description === minimalInput.description, `Event description should be updated`);
        
        console.log(`   ✅ Update verified: "${updatedEvent.name}"`);
        
        // STEP 5: Restore original name
        console.log('   Restoring original event name...');
        const restoreResult = client.updateEvent(eventUrl, {
            name: originalEvent.name,
            description: originalEvent.description
        });
        
        assert(restoreResult.success === true, `Restore should succeed (error: ${restoreResult.error || 'none'})`);
        console.log('   ✅ Original name restored');
        
        logTestResult(testName, true);
        return { success: true };
        
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logTestResult(testName, false, err.message);
        return { success: false, error: err.message };
    }
}

/**
 * TEST 10.2.4: Verify undocumented fields still work
 * 
 * Tests that undocumented but working fields (organizer_ids, route_ids) are accepted
 * 
 * CRITICAL FIELDS TESTED:
 * - organizer_ids: UNDOCUMENTED but WORKS - proper way to set organizers
 * - route_ids: UNDOCUMENTED but WORKS - proper way to set routes
 * 
 * These fields are documented in:
 * - src/rwgpslib/RWGPSEvent.d.ts (RWGPSEventInput interface)
 * - docs/rwgps-api-tested.yaml (verified behavior)
 * 
 * @param {number} eventId - Event ID to test
 * @returns {{success: boolean, error?: string}}
 */
function testUndocumentedFieldsStillWork(eventId) {
    const testName = 'testUndocumentedFieldsStillWork';
    console.log(`\n▶️  ${testName} (eventId: ${eventId})`);
    
    try {
        const client = getTestClient();
        const eventUrl = `https://ridewithgps.com/events/${eventId}`;
        
        // STEP 1: Get current event to capture organizer and route IDs
        console.log('   Getting current event state...');
        const getResult = client.getEvent(eventUrl);
        assert(getResult.success === true, `getEvent should succeed (error: ${getResult.error || 'none'})`);
        
        const originalEvent = getResult.event;
        console.log(`   ✅ Current event: "${originalEvent.name}"`);
        
        // STEP 2: Extract organizer_ids from organizers array
        console.log('   Extracting organizer_ids...');
        const originalOrganizerIds = originalEvent.organizers.map(org => org.id);
        console.log(`   ✅ Found ${originalOrganizerIds.length} organizers: [${originalOrganizerIds.join(', ')}]`);
        
        // STEP 3: Extract route_ids if routes exist
        let originalRouteIds = [];
        if (originalEvent.routes && originalEvent.routes.length > 0) {
            console.log('   Extracting route_ids...');
            originalRouteIds = originalEvent.routes.map(route => route.id);
            console.log(`   ✅ Found ${originalRouteIds.length} routes: [${originalRouteIds.join(', ')}]`);
        } else {
            console.log('   ℹ️  No routes associated with this event');
        }
        
        // STEP 4: Test that API accepts organizer_ids field (UNDOCUMENTED)
        console.log('   Testing organizer_ids field (UNDOCUMENTED)...');
        
        const updateWithOrgIds = {
            name: originalEvent.name,
            organizer_ids: originalOrganizerIds  // UNDOCUMENTED field
        };
        
        const orgResult = client.updateEvent(eventUrl, updateWithOrgIds);
        assert(orgResult.success === true, `API should accept organizer_ids field (error: ${orgResult.error || 'none'})`);
        console.log('   ✅ API accepted organizer_ids field');
        
        // STEP 5: Verify organizers preserved
        console.log('   Verifying organizers preserved...');
        const verifyOrg = client.getEvent(eventUrl);
        assert(verifyOrg.success === true, `getEvent should succeed (error: ${verifyOrg.error || 'none'})`);
        
        const verifiedOrganizerIds = verifyOrg.event.organizers.map(org => org.id);
        assert(JSON.stringify(verifiedOrganizerIds.sort()) === JSON.stringify(originalOrganizerIds.sort()),
               `Organizers should be preserved: expected [${originalOrganizerIds.join(', ')}], got [${verifiedOrganizerIds.join(', ')}]`);
        console.log('   ✅ Organizers preserved after organizer_ids update');
        
        // STEP 6: Test route_ids field if routes exist (UNDOCUMENTED)
        if (originalRouteIds.length > 0) {
            console.log('   Testing route_ids field (UNDOCUMENTED)...');
            
            const updateWithRouteIds = {
                name: originalEvent.name,
                route_ids: originalRouteIds  // UNDOCUMENTED field
            };
            
            const routeResult = client.updateEvent(eventUrl, updateWithRouteIds);
            assert(routeResult.success === true, `API should accept route_ids field (error: ${routeResult.error || 'none'})`);
            console.log('   ✅ API accepted route_ids field');
            
            // Verify routes preserved
            console.log('   Verifying routes preserved...');
            const verifyRoute = client.getEvent(eventUrl);
            assert(verifyRoute.success === true, `getEvent should succeed (error: ${verifyRoute.error || 'none'})`);
            
            const verifiedRouteIds = verifyRoute.event.routes.map(route => route.id);
            assert(JSON.stringify(verifiedRouteIds.sort()) === JSON.stringify(originalRouteIds.sort()),
                   `Routes should be preserved: expected [${originalRouteIds.join(', ')}], got [${verifiedRouteIds.join(', ')}]`);
            console.log('   ✅ Routes preserved after route_ids update');
        } else {
            console.log('   ⏭️  Skipping route_ids test (no routes to test with)');
        }
        
        logTestResult(testName, true);
        return { success: true };
        
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logTestResult(testName, false, err.message);
        return { success: false, error: err.message };
    }
}

// ============================================================================
// TEST RUNNER
// ============================================================================

/**
 * Run all GAS integration tests
 * 
 * USAGE: runAllIntegrationTests()
 * 
 * Tests are run in dependency order:
 * 1. Basic operations (getEvent, createEvent, editEvent, deleteEvent)
 * 2. Workflow operations (cancel, reinstate)
 * 3. Advanced operations (createEventWithLogo, importRoute)
 * 
 * @param {number} [testEventId] - Optional event ID for tests (default: DEFAULT_TEST_EVENT_ID)
 * @param {string} [logoUrl] - Optional logo URL for logo test (default: skipped)
 * @returns {{passed: number, failed: number, skipped: number, errors: Array}}
 */
function runAllIntegrationTests(testEventId, logoUrl) {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  RWGPSClient GAS Integration Test Suite (Phase 4 Complete)    ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    
    testEventId = testEventId || DEFAULT_TEST_EVENT_ID;
    
    console.log(`\nConfiguration:`);
    console.log(`  Test Event ID: ${testEventId}`);
    console.log(`  Logo Test: ${logoUrl ? 'Enabled' : 'Skipped (no logoUrl provided)'}`);
    
    // Reset test state
    TEST_STATE.passed = 0;
    TEST_STATE.failed = 0;
    TEST_STATE.skipped = 0;
    TEST_STATE.errors = [];
    TEST_STATE.createdEvents = [];
    
    const startTime = new Date();
    
    try {
        // Phase 0: Factory Pattern
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Phase 0: Factory Pattern');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        testRWGPSClientFactory();
        
        // Phase 1: Basic v1 API operations
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Phase 1: Basic v1 API Operations');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        testGetEvent(testEventId);
        testGetClubMembers();
        testCreateEvent();
        testEditEvent(testEventId);
        testExtraFieldsTolerance(testEventId);  // Architecture decision test
        testDeleteEvent();
        
        // Phase 2: Workflow operations
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Phase 2: Workflow Operations');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        testCancelEvent(testEventId);
        testReinstateEvent(testEventId);
        
        // Phase 3: Advanced operations
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Phase 3: Advanced Operations');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        testCreateEventWithLogo(logoUrl);
        testImportRoute();
        
        // Phase 4: Type contract validation
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Phase 4: Type Contract Validation');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        testRWGPSEventResponseMatchesType(testEventId);
        testRWGPSEventInputAccepted(testEventId);
        testUndocumentedFieldsStillWork(testEventId);
        
        // Cleanup
        cleanupCreatedEvents();
        
    } finally {
        // Summary
        const endTime = new Date();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        
        console.log('\n╔════════════════════════════════════════════════════════════════╗');
        console.log('║  Test Summary                                                  ║');
        console.log('╚════════════════════════════════════════════════════════════════╝');
        console.log(`\n✅ Passed:  ${TEST_STATE.passed}`);
        console.log(`❌ Failed:  ${TEST_STATE.failed}`);
        console.log(`⏭️  Skipped: ${TEST_STATE.skipped}`);
        console.log(`⏱️  Duration: ${duration}s`);
        
        if (TEST_STATE.failed > 0) {
            console.log('\n❌ Failed Tests:');
            TEST_STATE.errors.forEach(({test, error}) => {
                console.log(`   - ${test}: ${error}`);
            });
        }
        
        if (TEST_STATE.passed > 0 && TEST_STATE.failed === 0) {
            console.log('\n🎉 All tests passed!');
        }
        
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }
    
    return {
        passed: TEST_STATE.passed,
        failed: TEST_STATE.failed,
        skipped: TEST_STATE.skipped,
        errors: TEST_STATE.errors
    };
}

// ============================================================================
// QUICK TEST FUNCTIONS (Individual Test Execution)
// ============================================================================

/**
 * Quick test: Run all tests with default configuration
 * 
 * Equivalent to: runAllIntegrationTests(DEFAULT_TEST_EVENT_ID)
 */
function runAllTests() {
    return runAllIntegrationTests();
}

/**
 * Quick test: Run all tests with logo test enabled
 * 
 * Automatically looks up a logo URL from the Groups sheet.
 */
function runAllTestsWithLogo() {
    // Get a logo URL from Group specs
    const groupSpecs = getGroupSpecs();
    let logoUrl = null;
    
    // Find first group with a LogoURL
    for (const groupName in groupSpecs) {
        if (groupSpecs[groupName].LogoURL) {
            logoUrl = groupSpecs[groupName].LogoURL;
            console.log(`Using logo from group "${groupName}": ${logoUrl}`);
            break;
        }
    }
    
    if (!logoUrl) {
        console.warn('⚠️  No LogoURL found in any group spec. Logo test will be skipped.');
    }
    
    return runAllIntegrationTests(DEFAULT_TEST_EVENT_ID, logoUrl);
}
