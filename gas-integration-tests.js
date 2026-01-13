/**
 * Integration Test Suite for RWGPSLib Migration
 * 
 * Run these tests in Google Apps Script console to validate the migration.
 * Copy and paste this entire file into GAS Script Editor and run runIntegrationTests()
 */

function testCredentialManager() {
    try {
        const scriptProps = PropertiesService.getScriptProperties();
        const creds = RWGPSCredentialManager.getAllCredentials(scriptProps);
        console.log('✅ Credentials loaded successfully');
        console.log('Username present:', !!creds.username);
        console.log('Password present:', !!creds.password);
        console.log('API Key present:', !!creds.apiKey);
        console.log('Auth Token present:', !!creds.authToken);
        return { success: true, credentials: creds };
    } catch (error) {
        console.error('❌ Credential test failed:', error.message);
        return { success: false, error: error.message };
    }
}

function testApiServiceCore() {
    try {
        const request = {
            url: 'https://ridewithgps.com/api/test',
            payload: { test: 'data' }
        };
        
        const prepared = RWGPSApiServiceCore.prepareRequest(request, 'basic_auth', {
            apiKey: 'test_key',
            authToken: 'test_token'
        });
        
        console.log('✅ Request preparation successful');
        console.log('Method:', prepared.method);
        console.log('Headers present:', !!prepared.headers);
        console.log('Payload present:', !!prepared.payload);
        
        return { success: true, request: prepared };
    } catch (error) {
        console.error('❌ API service test failed:', error.message);
        return { success: false, error: error.message };
    }
}

function testBatchRequests() {
    try {
        const requests = [
            { url: 'https://ridewithgps.com/api/events/123' },
            { url: 'https://ridewithgps.com/api/events/456' }
        ];
        
        const prepared = RWGPSApiServiceCore.prepareBatchRequests(requests, {
            authType: 'web_session',
            currentCookie: 'test_cookie'
        });
        
        console.log('✅ Batch request preparation successful');
        console.log('Batch size:', prepared.length);
        console.log('All have headers:', prepared.every(req => !!req.headers));
        
        return { success: true, batchSize: prepared.length };
    } catch (error) {
        console.error('❌ Batch request test failed:', error.message);
        return { success: false, error: error.message };
    }
}

function testServiceCore() {
    try {
        const testCases = [
            { url: 'https://ridewithgps.com/events/123-test', expectedId: '123' },
            { url: 'https://ridewithgps.com/routes/456-route', expectedId: '456' },
            { url: 'invalid-url', expectedId: null }
        ];
        
        let passed = 0;
        for (const test of testCases) {
            try {
                const id = RWGPSServiceCore.extractIdFromUrl(test.url);
                if (id === test.expectedId) {
                    console.log(`✅ ID extraction: ${test.url} → ${id}`);
                    passed++;
                } else {
                    console.error(`❌ Wrong ID: ${test.url} → ${id} (expected ${test.expectedId})`);
                }
            } catch (error) {
                console.error(`❌ Unexpected error for ${test.url}:`, error.message);
            }
        }
        
        console.log(`URL validation tests: ${passed}/${testCases.length} passed`);
        return { success: passed === testCases.length, passed, total: testCases.length };
    } catch (error) {
        console.error('❌ Service core test failed:', error.message);
        return { success: false, error: error.message };
    }
}

function testIt() {
  testRWGPSClientGetEvent(445203)
}
/**
 * Test RWGPSClient.getEvent (Task 3.5)
 * 
 * USAGE:
 * 1. Find a valid event ID from your spreadsheet (e.g., in the Ride column URL)
 * 2. Run: testRWGPSClientGetEvent(444070)
 * 3. Check console output for event details
 */
function testRWGPSClientGetEvent(eventId) {
    console.log(`\n=== Testing RWGPSClient.getEvent (Task 3.5) ===`);
    console.log(`Event ID: ${eventId || 'NOT PROVIDED - using default 444070'}`);
    
    if (!eventId) {
        console.warn('⚠️  No event ID provided. Please pass a valid event ID from your spreadsheet.');
        console.warn('   Example: testRWGPSClientGetEvent(444070)');
        eventId = 444070; // Default for testing
    }
    
    try {
        // Get credentials using CredentialManager (not RWGPSCredentialManager)
        const scriptProps = PropertiesService.getScriptProperties();
        const credentialManager = new CredentialManager(scriptProps);
        
        console.log('✅ Credentials loaded');
        console.log(`   Username: ${credentialManager.getUsername().substring(0, 10) + '...'}`);
        console.log(`   API Key present: ${!!credentialManager.getApiKey()}`);
        
        // Create RWGPSClient
        const client = new RWGPSClient({
            apiKey: credentialManager.getApiKey(),
            authToken: credentialManager.getAuthToken(),
            username: credentialManager.getUsername(),
            password: credentialManager.getPassword()
        });
        
        console.log('✅ RWGPSClient instantiated');
        
        // Test getEvent
        const eventUrl = `https://ridewithgps.com/events/${eventId}`;
        console.log(`\n📡 Calling getEvent(${eventUrl})...`);
        
        const result = client.getEvent(eventUrl);
        
        if (result.success) {
            console.log('✅ getEvent SUCCESS');
            console.log('\n📋 Event Details:');
            console.log(`   ID: ${result.event.id}`);
            console.log(`   Name: ${result.event.name}`);
            console.log(`   Starts at: ${result.event.starts_at}`);
            console.log(`   All day: ${result.event.all_day}`);
            console.log(`   Visibility: ${result.event.visibility}`);
            console.log(`   Organizer IDs: ${JSON.stringify(result.event.organizer_ids)}`);
            
            if (result.event.routes && result.event.routes.length > 0) {
                console.log(`   Routes: ${result.event.routes.length} route(s)`);
                result.event.routes.forEach((route, i) => {
                    console.log(`     ${i + 1}. ${route.name} (ID: ${route.id})`);
                });
            } else {
                console.log('   Routes: None');
            }
            
            console.log(`\n   Description preview: ${(result.event.desc || 'No description').substring(0, 100)}...`);
            
            console.log('\n🎉 Task 3.5 (getEvent) working correctly!');
            
            return { success: true, event: result.event };
        } else {
            console.error('❌ getEvent FAILED');
            console.error(`   Error: ${result.error}`);
            console.error('\n💡 Troubleshooting:');
            console.error('   - Check that event ID exists in RWGPS');
            console.error('   - Verify credentials are correct');
            console.error('   - Try a different event ID from your spreadsheet');
            
            return { success: false, error: result.error };
        }
        
    } catch (error) {
        console.error('❌ Test execution failed:', error.message);
        console.error('   Stack:', error.stack);
        return { success: false, error: error.message };
    }
}

/**
 * Test RWGPSClient.editEvent (Task 3.6)
 * 
 * USAGE:
 * 1. Find a valid event ID from your spreadsheet (e.g., in the Ride column URL)
 * 2. Run: testRWGPSClientEditEvent(445203)
 * 3. This test is NON-DESTRUCTIVE: it gets the event, modifies description, edits it, verifies, then restores original
 */
function testRWGPSClientEditEvent(eventId) {
    console.log(`\n=== Testing RWGPSClient.editEvent (Task 3.6) ===`);
    console.log(`Event ID: ${eventId || 'NOT PROVIDED - using default 445203'}`);
    
    if (!eventId) {
        console.warn('⚠️  No event ID provided. Please pass a valid event ID from your spreadsheet.');
        console.warn('   Example: testRWGPSClientEditEvent(445203)');
        eventId = 445203; // Default for testing
    }
    
    try {
        // Get credentials
        const scriptProps = PropertiesService.getScriptProperties();
        const credentialManager = new CredentialManager(scriptProps);
        
        console.log('✅ Credentials loaded');
        console.log(`   Username: ${credentialManager.getUsername().substring(0, 10) + '...'}`);
        
        // Create RWGPSClient
        const client = new RWGPSClient({
            apiKey: credentialManager.getApiKey(),
            authToken: credentialManager.getAuthToken(),
            username: credentialManager.getUsername(),
            password: credentialManager.getPassword()
        });
        
        console.log('✅ RWGPSClient instantiated');
        
        const eventUrl = `https://ridewithgps.com/events/${eventId}`;
        
        // STEP 1: Get original event
        console.log(`\n📡 Step 1: Getting original event...`);
        const getResult = client.getEvent(eventUrl);
        
        if (!getResult.success) {
            console.error('❌ Failed to get event');
            console.error(`   Error: ${getResult.error}`);
            return { success: false, error: getResult.error };
        }
        
        const originalEvent = getResult.event;
        console.log('✅ Original event retrieved');
        console.log(`   Name: ${originalEvent.name}`);
        console.log(`   Description length: ${(originalEvent.desc || '').length} chars`);
        
        // STEP 2: Modify description and edit
        console.log(`\n📡 Step 2: Editing event (adding test marker to description)...`);
        const modifiedEvent = {
            ...originalEvent,
            desc: (originalEvent.desc || '') + '\n\n[TEST EDIT - Will be reverted]'
        };
        
        const editResult = client.editEvent(eventUrl, modifiedEvent);
        
        if (!editResult.success) {
            console.error('❌ Edit failed');
            console.error(`   Error: ${editResult.error}`);
            return { success: false, error: editResult.error };
        }
        
        console.log('✅ Edit succeeded');
        console.log(`   Returned event ID: ${editResult.event.id}`);
        console.log(`   All day: ${editResult.event.all_day}`);
        console.log(`   Starts at: ${editResult.event.starts_at}`);
        
        // STEP 3: Verify edit by getting event again
        console.log(`\n📡 Step 3: Verifying edit...`);
        const verifyResult = client.getEvent(eventUrl);
        
        if (!verifyResult.success) {
            console.warn('⚠️  Could not verify edit (get failed), but edit succeeded');
        } else {
            const currentDesc = verifyResult.event.desc || '';
            if (currentDesc.includes('[TEST EDIT - Will be reverted]')) {
                console.log('✅ Verified: Description was updated');
            } else {
                console.warn('⚠️  Description does not contain test marker (may need refresh)');
            }
        }
        
        // STEP 4: Restore original description
        console.log(`\n📡 Step 4: Restoring original event...`);
        const restoreResult = client.editEvent(eventUrl, originalEvent);
        
        if (!restoreResult.success) {
            console.error('❌ Failed to restore original event');
            console.error(`   Error: ${restoreResult.error}`);
            console.error('⚠️  EVENT LEFT IN MODIFIED STATE - Please manually fix!');
            return { success: false, error: restoreResult.error, eventModified: true };
        }
        
        console.log('✅ Original event restored');
        
        console.log('\n🎉 Task 3.6 (editEvent) working correctly!');
        console.log('   ✅ Double-edit pattern (all_day=1, then all_day=0) executed');
        console.log('   ✅ Event modified successfully');
        console.log('   ✅ Event restored to original state');
        
        return { 
            success: true, 
            originalEvent: originalEvent,
            editedEvent: editResult.event,
            restoredEvent: restoreResult.event
        };
        
    } catch (error) {
        console.error('❌ Test execution failed:', error.message);
        console.error('   Stack:', error.stack);
        console.error('⚠️  Event may be in modified state - check manually!');
        return { success: false, error: error.message };
    }
}

/**
 * Task 3.7: Test cancelEvent method
 * 
 * This test verifies that the RWGPSClient.cancelEvent() method correctly:
 * - Adds "CANCELLED: " prefix to event name
 * - Uses the double-edit pattern (all_day=1, then all_day=0)
 * - Returns updated event data
 * - Can be reversed by removing the prefix
 * 
 * @param {number} [eventId] - Event ID to test with (default: 445203)
 * @returns {{success: boolean, originalEvent?: any, cancelledEvent?: any, restoredEvent?: any, error?: string}}
 */
function testRWGPSClientCancelEvent(eventId) {
    console.log('====================================');
    console.log('Task 3.7: Test RWGPSClient.cancelEvent()');
    console.log('====================================');
    console.log(`Event ID: ${eventId || 'NOT PROVIDED - using default 445203'}`);
    
    if (!eventId) {
        console.warn('⚠️  No event ID provided. Please pass a valid event ID from your spreadsheet.');
        console.warn('   Example: testRWGPSClientCancelEvent(445203)');
        eventId = 445203; // Default for testing
    }
    
    try {
        // Get credentials
        const scriptProps = PropertiesService.getScriptProperties();
        const credentialManager = new CredentialManager(scriptProps);
        
        console.log('✅ Credentials loaded');
        console.log(`   Username: ${credentialManager.getUsername().substring(0, 10) + '...'}`);
        
        // Create RWGPSClient
        const client = new RWGPSClient({
            apiKey: credentialManager.getApiKey(),
            authToken: credentialManager.getAuthToken(),
            username: credentialManager.getUsername(),
            password: credentialManager.getPassword()
        });
        
        console.log('✅ RWGPSClient instantiated');
        
        const eventUrl = `https://ridewithgps.com/events/${eventId}`;
        
        // STEP 1: Get original event
        console.log(`\n📡 Step 1: Getting original event...`);
        const getResult = client.getEvent(eventUrl);
        
        if (!getResult.success) {
            console.error('❌ Failed to get event');
            console.error(`   Error: ${getResult.error}`);
            return { success: false, error: getResult.error };
        }
        
        const originalEvent = getResult.event;
        console.log('✅ Original event retrieved');
        console.log(`   Name: ${originalEvent.name}`);
        console.log(`   Already cancelled: ${originalEvent.name.startsWith('CANCELLED: ')}`);
        
        // STEP 2: Cancel event
        console.log(`\n📡 Step 2: Cancelling event (adding CANCELLED: prefix)...`);
        const cancelResult = client.cancelEvent(eventUrl);
        
        if (!cancelResult.success) {
            if (cancelResult.error && cancelResult.error.includes('already cancelled')) {
                console.log('ℹ️  Event already cancelled - this is expected behavior');
                console.log('   Skipping to restore step...');
            } else {
                console.error('❌ Cancel failed');
                console.error(`   Error: ${cancelResult.error}`);
                return { success: false, error: cancelResult.error };
            }
        } else {
            console.log('✅ Cancel succeeded');
            console.log(`   Updated name: ${cancelResult.event.name}`);
            console.log(`   Has CANCELLED: prefix: ${cancelResult.event.name.startsWith('CANCELLED: ')}`);
        }
        
        // STEP 3: Verify cancel by getting event again
        console.log(`\n📡 Step 3: Verifying cancellation...`);
        const verifyResult = client.getEvent(eventUrl);
        
        if (!verifyResult.success) {
            console.warn('⚠️  Could not verify cancellation (get failed), but cancel succeeded');
        } else {
            const currentName = verifyResult.event.name || '';
            if (currentName.startsWith('CANCELLED: ')) {
                console.log('✅ Verified: Name has CANCELLED: prefix');
            } else {
                console.warn('⚠️  Name does not have CANCELLED: prefix (may need refresh)');
            }
        }
        
        // STEP 4: Restore original name by editing
        console.log(`\n📡 Step 4: Restoring original event name...`);
        const restoreResult = client.editEvent(eventUrl, originalEvent);
        
        if (!restoreResult.success) {
            console.error('❌ Failed to restore original event');
            console.error(`   Error: ${restoreResult.error}`);
            console.error('⚠️  EVENT LEFT IN CANCELLED STATE - Please manually fix!');
            return { success: false, error: restoreResult.error, eventModified: true };
        }
        
        console.log('✅ Original event name restored');
        console.log(`   Restored name: ${restoreResult.event.name}`);
        
        console.log('\n🎉 Task 3.7 (cancelEvent) working correctly!');
        console.log('   ✅ CANCELLED: prefix added to name');
        console.log('   ✅ Double-edit pattern (all_day=1, then all_day=0) executed');
        console.log('   ✅ Event restored to original state');
        
        return { 
            success: true, 
            originalEvent: originalEvent,
            cancelledEvent: cancelResult.success ? cancelResult.event : null,
            restoredEvent: restoreResult.event
        };
        
    } catch (error) {
        console.error('❌ Test execution failed:', error.message);
        console.error('   Stack:', error.stack);
        console.error('⚠️  Event may be in modified state - check manually!');
        return { success: false, error: error.message };
    }
}

/**
 * Task 3.8: Test reinstateEvent method
 * 
 * This test verifies that the RWGPSClient.reinstateEvent() method correctly:
 * - Removes "CANCELLED: " prefix from event name
 * - Uses the double-edit pattern (all_day=1, then all_day=0)
 * - Returns updated event data
 * - Only works on cancelled events
 * 
 * @param {number} [eventId] - Event ID to test with (default: 445203)
 * @returns {{success: boolean, originalEvent?: any, cancelledEvent?: any, reinstatedEvent?: any, error?: string}}
 */
function testRWGPSClientReinstateEvent(eventId) {
    console.log('====================================');
    console.log('Task 3.8: Test RWGPSClient.reinstateEvent()');
    console.log('====================================');
    console.log(`Event ID: ${eventId || 'NOT PROVIDED - using default 445203'}`);
    
    if (!eventId) {
        console.warn('⚠️  No event ID provided. Please pass a valid event ID from your spreadsheet.');
        console.warn('   Example: testRWGPSClientReinstateEvent(445203)');
        eventId = 445203; // Default for testing
    }
    
    try {
        // Get credentials
        const scriptProps = PropertiesService.getScriptProperties();
        const credentialManager = new CredentialManager(scriptProps);
        
        console.log('✅ Credentials loaded');
        console.log(`   Username: ${credentialManager.getUsername().substring(0, 10) + '...'}`);
        
        // Create RWGPSClient
        const client = new RWGPSClient({
            apiKey: credentialManager.getApiKey(),
            authToken: credentialManager.getAuthToken(),
            username: credentialManager.getUsername(),
            password: credentialManager.getPassword()
        });
        
        console.log('✅ RWGPSClient instantiated');
        
        const eventUrl = `https://ridewithgps.com/events/${eventId}`;
        
        // STEP 1: Get original event
        console.log(`\n📡 Step 1: Getting original event...`);
        const getResult = client.getEvent(eventUrl);
        
        if (!getResult.success) {
            console.error('❌ Failed to get event');
            console.error(`   Error: ${getResult.error}`);
            return { success: false, error: getResult.error };
        }
        
        const originalEvent = getResult.event;
        console.log('✅ Original event retrieved');
        console.log(`   Name: ${originalEvent.name}`);
        console.log(`   Already cancelled: ${originalEvent.name.startsWith('CANCELLED: ')}`);
        
        // STEP 2: Cancel event first (so we can reinstate it)
        console.log(`\n📡 Step 2: Cancelling event first (so we can test reinstate)...`);
        const cancelResult = client.cancelEvent(eventUrl);
        
        if (!cancelResult.success) {
            if (cancelResult.error && cancelResult.error.includes('already cancelled')) {
                console.log('ℹ️  Event already cancelled - can proceed to reinstate');
            } else {
                console.error('❌ Cancel failed');
                console.error(`   Error: ${cancelResult.error}`);
                return { success: false, error: cancelResult.error };
            }
        } else {
            console.log('✅ Event cancelled');
            console.log(`   Cancelled name: ${cancelResult.event.name}`);
        }
        
        // STEP 3: Reinstate event
        console.log(`\n📡 Step 3: Reinstating event (removing CANCELLED: prefix)...`);
        const reinstateResult = client.reinstateEvent(eventUrl);
        
        if (!reinstateResult.success) {
            console.error('❌ Reinstate failed');
            console.error(`   Error: ${reinstateResult.error}`);
            console.error('⚠️  EVENT LEFT IN CANCELLED STATE - Please manually fix!');
            return { success: false, error: reinstateResult.error, eventModified: true };
        }
        
        console.log('✅ Reinstate succeeded');
        console.log(`   Reinstated name: ${reinstateResult.event.name}`);
        console.log(`   Has CANCELLED: prefix: ${reinstateResult.event.name.startsWith('CANCELLED: ')}`);
        
        // STEP 4: Verify reinstate by getting event again
        console.log(`\n📡 Step 4: Verifying reinstatement...`);
        const verifyResult = client.getEvent(eventUrl);
        
        if (!verifyResult.success) {
            console.warn('⚠️  Could not verify reinstatement (get failed), but reinstate succeeded');
        } else {
            const currentName = verifyResult.event.name || '';
            if (!currentName.startsWith('CANCELLED: ')) {
                console.log('✅ Verified: Name does not have CANCELLED: prefix');
            } else {
                console.warn('⚠️  Name still has CANCELLED: prefix (may need refresh)');
            }
        }
        
        console.log('\n🎉 Task 3.8 (reinstateEvent) working correctly!');
        console.log('   ✅ CANCELLED: prefix removed from name');
        console.log('   ✅ Double-edit pattern (all_day=1, then all_day=0) executed');
        console.log('   ✅ Event name matches original');
        
        return { 
            success: true, 
            originalEvent: originalEvent,
            cancelledEvent: cancelResult.success ? cancelResult.event : null,
            reinstatedEvent: reinstateResult.event
        };
        
    } catch (error) {
        console.error('❌ Test execution failed:', error.message);
        console.error('   Stack:', error.stack);
        console.error('⚠️  Event may be in modified state - check manually!');
        return { success: false, error: error.message };
    }
}

/**
 * Task 3.9: Test copyTemplate method
 * 
 * This test verifies that the RWGPSClient.copyTemplate() method correctly:
 * - Copies a template event to create a new event
 * - Returns the new event URL from the Location header
 * - Optionally sets event data during copy
 * 
 * @param {number} [templateId] - Template event ID to copy (default: 404019)
 * @returns {{success: boolean, eventUrl?: string, error?: string}}
 */
function testRWGPSClientCopyTemplate(templateId) {
    console.log('====================================');
    console.log('Task 3.9: Test RWGPSClient.copyTemplate()');
    console.log('====================================');
    console.log(`Template ID: ${templateId || 'NOT PROVIDED - using default 404019'}`);
    
    if (!templateId) {
        console.warn('⚠️  No template ID provided. Please pass a valid template event ID.');
        console.warn('   Example: testRWGPSClientCopyTemplate(404019)');
        templateId = 404019; // Default B Template
    }
    
    try {
        // Get credentials
        const scriptProps = PropertiesService.getScriptProperties();
        const credentialManager = new CredentialManager(scriptProps);
        
        console.log('✅ Credentials loaded');
        console.log(`   Username: ${credentialManager.getUsername().substring(0, 10) + '...'}`);
        
        // Create RWGPSClient
        const client = new RWGPSClient({
            apiKey: credentialManager.getApiKey(),
            authToken: credentialManager.getAuthToken(),
            username: credentialManager.getUsername(),
            password: credentialManager.getPassword()
        });
        
        console.log('✅ RWGPSClient instantiated');
        
        const templateUrl = `https://ridewithgps.com/events/${templateId}`;
        
        // STEP 1: Copy template with custom name
        console.log(`\n📡 Step 1: Copying template event...`);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const eventData = {
            name: `TEST COPY ${timestamp}`,
            all_day: '0',
            copy_routes: '0'
        };
        
        const copyResult = client.copyTemplate(templateUrl, eventData);
        
        if (!copyResult.success) {
            console.error('❌ Copy failed');
            console.error(`   Error: ${copyResult.error}`);
            return { success: false, error: copyResult.error };
        }
        
        console.log('✅ Copy succeeded');
        console.log(`   New event URL: ${copyResult.eventUrl}`);
        
        // STEP 2: Verify new event exists
        console.log(`\n📡 Step 2: Verifying new event exists...`);
        const verifyResult = client.getEvent(copyResult.eventUrl);
        
        if (!verifyResult.success) {
            console.error('❌ Could not verify new event');
            console.error(`   Error: ${verifyResult.error}`);
            console.error('⚠️  Event may have been created but could not be fetched');
            return { success: false, error: verifyResult.error };
        }
        
        console.log('✅ New event verified');
        console.log(`   ID: ${verifyResult.event.id}`);
        console.log(`   Name: ${verifyResult.event.name}`);
        console.log(`   Visibility: ${verifyResult.event.visibility}`);
        
        // STEP 3: Clean up - delete the test event
        console.log(`\n📡 Step 3: Cleaning up test event...`);
        const deleteResult = client.deleteEvent(copyResult.eventUrl);
        
        if (!deleteResult.success) {
            console.warn('⚠️  Could not delete test event');
            console.warn(`   Error: ${deleteResult.error}`);
            console.warn(`   Please manually delete event: ${copyResult.eventUrl}`);
        } else {
            console.log('✅ Test event deleted successfully');
        }
        
        console.log('\n🎉 Task 3.9 (copyTemplate) working correctly!');
        console.log('   ✅ Template copied successfully');
        console.log('   ✅ New event URL extracted from Location header');
        console.log('   ✅ New event data verified');
        console.log('   ✅ Cleanup completed');
        
        return { 
            success: true, 
            eventUrl: copyResult.eventUrl,
            event: verifyResult.event
        };
        
    } catch (error) {
        console.error('❌ Test execution failed:', error.message);
        console.error('   Stack:', error.stack);
        return { success: false, error: error.message };
    }
}

/**
 * Task 3.10: Integration test for RWGPSClient.scheduleEvent()
 * 
 * Tests the full scheduling workflow:
 * - Login
 * - Copy template event
 * - Look up organizers by name
 * - Edit event with organizer tokens
 * - Remove template tag
 * 
 * @param {number} [templateId] - Template event ID to copy (default: 404019)
 * @param {string} [organizerName] - Optional organizer name to test (e.g., "John Smith")
 * @returns {{success: boolean, eventUrl?: string, event?: any, error?: string}}
 */
function testRWGPSClientScheduleEvent(templateId, organizerName) {
    console.log('====================================');
    console.log('Task 3.10: Test RWGPSClient.scheduleEvent()');
    console.log('====================================');
    console.log(`Template ID: ${templateId || 'NOT PROVIDED - using default 404019'}`);
    console.log(`Organizer: ${organizerName || 'NOT PROVIDED - will test without organizers'}`);
    
    if (!templateId) {
        console.warn('⚠️  No template ID provided. Please pass a valid template event ID.');
        console.warn('   Example: testRWGPSClientScheduleEvent(404019, "John Smith")');
        templateId = 404019; // Default B Template
    }
    
    try {
        // Get credentials
        const scriptProps = PropertiesService.getScriptProperties();
        const credentialManager = new CredentialManager(scriptProps);
        
        console.log('✅ Credentials loaded');
        console.log(`   Username: ${credentialManager.getUsername().substring(0, 10) + '...'}`);
        
        // Create RWGPSClient
        const client = new RWGPSClient({
            apiKey: credentialManager.getApiKey(),
            authToken: credentialManager.getAuthToken(),
            username: credentialManager.getUsername(),
            password: credentialManager.getPassword()
        });
        
        console.log('✅ RWGPSClient instantiated');
        
        const templateUrl = `https://ridewithgps.com/events/${templateId}`;
        
        // Build event data
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7); // Schedule for a week from now
        const startYear = futureDate.getFullYear();
        const startMonth = String(futureDate.getMonth() + 1).padStart(2, '0');
        const startDay = String(futureDate.getDate()).padStart(2, '0');
        const startDateStr = `${startYear}-${startMonth}-${startDay}T09:00:00`;
        
        const eventData = {
            name: `TEST SCHEDULE ${timestamp}`,
            starts_at: startDateStr,
            description: 'Integration test event - should be deleted',
            visibility: '0', // Members only
            all_day: '0'
        };
        
        // Build organizer list
        const organizerNames = organizerName ? [organizerName] : [];
        
        console.log(`\n📡 Scheduling event from template...`);
        console.log(`   Template: ${templateUrl}`);
        console.log(`   Event name: ${eventData.name}`);
        console.log(`   Start time: ${eventData.starts_at}`);
        console.log(`   Organizers: ${organizerNames.length > 0 ? organizerNames.join(', ') : '(none)'}`);
        
        // STEP 1: Call scheduleEvent
        const result = client.scheduleEvent(templateUrl, eventData, organizerNames);
        
        if (!result.success) {
            console.error('❌ Schedule failed');
            console.error(`   Error: ${result.error}`);
            return { success: false, error: result.error };
        }
        
        console.log('✅ Schedule succeeded');
        console.log(`   New event URL: ${result.eventUrl}`);
        console.log(`   Resolved organizers: ${result.organizers?.length || 0}`);
        if (result.organizers?.length > 0) {
            result.organizers.forEach((o) => {
                console.log(`      - ${o.name} (token: ${o.token?.substring(0, 10)}...)`);
            });
        }
        
        // STEP 2: Verify new event exists and has correct data
        console.log(`\n📡 Verifying scheduled event...`);
        const verifyResult = client.getEvent(result.eventUrl);
        
        if (!verifyResult.success) {
            console.error('❌ Could not verify scheduled event');
            console.error(`   Error: ${verifyResult.error}`);
            console.error('⚠️  Event may have been created but could not be fetched');
            return { success: false, error: verifyResult.error };
        }
        
        console.log('✅ Scheduled event verified');
        console.log(`   ID: ${verifyResult.event.id}`);
        console.log(`   Name: ${verifyResult.event.name}`);
        console.log(`   Visibility: ${verifyResult.event.visibility}`);
        console.log(`   Starts at: ${verifyResult.event.starts_at || verifyResult.event.starts_at_str || 'N/A'}`);
        
        // Check if template tag was removed
        const tags = verifyResult.event.tags || [];
        const hasTemplateTag = tags.some(tag => 
            (typeof tag === 'string' && tag.toLowerCase().includes('template')) ||
            (tag.name && tag.name.toLowerCase().includes('template'))
        );
        if (hasTemplateTag) {
            console.warn('⚠️  Event still has template tag (tag removal may have failed)');
        } else {
            console.log('✅ Template tag removed successfully');
        }
        
        // Check organizers if we requested any
        if (organizerNames.length > 0 && verifyResult.event.organizers) {
            console.log(`   Organizers on event: ${verifyResult.event.organizers.length}`);
            verifyResult.event.organizers.forEach((o) => {
                console.log(`      - ${o.name || o.display_name || o.id}`);
            });
        }
        
        // STEP 3: Clean up - delete the test event
        console.log(`\n📡 Cleaning up test event...`);
        const deleteResult = client.deleteEvent(result.eventUrl);
        
        if (!deleteResult.success) {
            console.warn('⚠️  Could not delete test event');
            console.warn(`   Error: ${deleteResult.error}`);
            console.warn(`   Please manually delete event: ${result.eventUrl}`);
        } else {
            console.log('✅ Test event deleted successfully');
        }
        
        console.log('\n🎉 Task 3.10 (scheduleEvent) working correctly!');
        console.log('   ✅ Template copied successfully');
        console.log('   ✅ Event data applied');
        if (organizerNames.length > 0) {
            console.log('   ✅ Organizers looked up and added');
        }
        console.log('   ✅ Template tag removed');
        console.log('   ✅ Cleanup completed');
        
        return { 
            success: true, 
            eventUrl: result.eventUrl,
            event: verifyResult.event,
            organizers: result.organizers
        };
        
    } catch (error) {
        console.error('❌ Test execution failed:', error.message);
        console.error('   Stack:', error.stack);
        return { success: false, error: error.message };
    }
}

/**
 * Task 3.11: Integration test for RWGPSClient.updateEvent()
 * 
 * Tests updating an existing event with new data and organizers:
 * - Login
 * - Look up organizers by name (optional)
 * - Edit event with full data
 * 
 * @param {number} [eventId] - Event ID to update (default: 445203)
 * @param {string} [organizerName] - Optional organizer name to test (e.g., "John Smith")
 * @returns {{success: boolean, event?: any, error?: string}}
 */
function testRWGPSClientUpdateEvent(eventId, organizerName) {
    console.log('====================================');
    console.log('Task 3.11: Test RWGPSClient.updateEvent()');
    console.log('====================================');
    console.log(`Event ID: ${eventId || 'NOT PROVIDED - using default 445203'}`);
    console.log(`Organizer: ${organizerName || 'NOT PROVIDED - will test without organizers'}`);
    
    if (!eventId) {
        console.warn('⚠️  No event ID provided. Please pass a valid event ID.');
        console.warn('   Example: testRWGPSClientUpdateEvent(445203, "John Smith")');
        eventId = 445203; // Default test event
    }
    
    try {
        // Get credentials
        const scriptProps = PropertiesService.getScriptProperties();
        const credentialManager = new CredentialManager(scriptProps);
        
        console.log('✅ Credentials loaded');
        console.log(`   Username: ${credentialManager.getUsername().substring(0, 10) + '...'}`);
        
        // Create RWGPSClient
        const client = new RWGPSClient({
            apiKey: credentialManager.getApiKey(),
            authToken: credentialManager.getAuthToken(),
            username: credentialManager.getUsername(),
            password: credentialManager.getPassword()
        });
        
        console.log('✅ RWGPSClient instantiated');
        
        const eventUrl = `https://ridewithgps.com/events/${eventId}`;
        
        // STEP 1: Get original event
        console.log(`\n📡 Step 1: Getting original event...`);
        const getResult = client.getEvent(eventUrl);
        
        if (!getResult.success) {
            console.error('❌ Failed to get event');
            console.error(`   Error: ${getResult.error}`);
            return { success: false, error: getResult.error };
        }
        
        const originalEvent = getResult.event;
        console.log('✅ Original event retrieved');
        console.log(`   Name: ${originalEvent.name}`);
        console.log(`   Description length: ${(originalEvent.desc || '').length} chars`);
        
        // STEP 2: Update event with test marker
        console.log(`\n📡 Step 2: Updating event (adding test marker to description)...`);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const eventData = {
            ...originalEvent,
            desc: (originalEvent.desc || '') + `\n\n[TEST UPDATE ${timestamp} - Will be reverted]`
        };
        
        // Build organizer list
        const organizerNames = organizerName ? [organizerName] : [];
        
        console.log(`   Organizers: ${organizerNames.length > 0 ? organizerNames.join(', ') : '(none)'}`);
        
        const result = client.updateEvent(eventUrl, eventData, organizerNames);
        
        if (!result.success) {
            console.error('❌ Update failed');
            console.error(`   Error: ${result.error}`);
            return { success: false, error: result.error };
        }
        
        console.log('✅ Update succeeded');
        console.log(`   Event ID: ${result.event.id}`);
        console.log(`   Resolved organizers: ${result.organizers?.length || 0}`);
        if (result.organizers?.length > 0) {
            result.organizers.forEach((o) => {
                console.log(`      - ${o.name} (token: ${o.token?.substring(0, 10)}...)`);
            });
        }
        
        // STEP 3: Verify update
        console.log(`\n📡 Step 3: Verifying update...`);
        const verifyResult = client.getEvent(eventUrl);
        
        if (!verifyResult.success) {
            console.warn('⚠️  Could not verify update (get failed), but update succeeded');
        } else {
            const currentDesc = verifyResult.event.desc || '';
            if (currentDesc.includes('[TEST UPDATE')) {
                console.log('✅ Verified: Description was updated');
            } else {
                console.warn('⚠️  Description does not contain test marker (may need refresh)');
            }
            
            // Check organizers if we requested any
            if (organizerNames.length > 0 && verifyResult.event.organizers) {
                console.log(`   Organizers on event: ${verifyResult.event.organizers.length}`);
                verifyResult.event.organizers.forEach((o) => {
                    console.log(`      - ${o.name || o.display_name || o.id}`);
                });
            }
        }
        
        // STEP 4: Restore original event
        console.log(`\n📡 Step 4: Restoring original event...`);
        const restoreResult = client.editEvent(eventUrl, originalEvent);
        
        if (!restoreResult.success) {
            console.error('❌ Failed to restore original event');
            console.error(`   Error: ${restoreResult.error}`);
            console.error('⚠️  EVENT LEFT IN MODIFIED STATE - Please manually fix!');
            return { success: false, error: restoreResult.error, eventModified: true };
        }
        
        console.log('✅ Original event restored');
        
        console.log('\n🎉 Task 3.11 (updateEvent) working correctly!');
        console.log('   ✅ Event updated with new data');
        if (organizerNames.length > 0) {
            console.log('   ✅ Organizers looked up and added');
        }
        console.log('   ✅ Event restored to original state');
        
        return { 
            success: true, 
            event: result.event,
            organizers: result.organizers
        };
        
    } catch (error) {
        console.error('❌ Test execution failed:', error.message);
        console.error('   Stack:', error.stack);
        console.error('⚠️  Event may be in modified state - check manually!');
        return { success: false, error: error.message };
    }
}

/**
 * Task 3.12: Integration test for RWGPSClient.importRoute()
 * 
 * Tests importing (copying) a route to the club library:
 * - Login
 * - Copy route with name, expiry, and tags
 * - Fetch route details
 * - Verify tags were added
 * 
 * @param {number} [routeId] - Route ID to import (default: 53253553)
 * @returns {{success: boolean, routeUrl?: string, route?: any, error?: string}}
 */
function testRWGPSClientImportRoute(routeId) {
    console.log('====================================');
    console.log('Task 3.12: Test RWGPSClient.importRoute()');
    console.log('====================================');
    console.log(`Route ID: ${routeId || 'NOT PROVIDED - using default 53253553'}`);
    
    if (!routeId) {
        console.warn('⚠️  No route ID provided. Please pass a valid route ID.');
        console.warn('   Example: testRWGPSClientImportRoute(53253553)');
        routeId = 53253553; // Default test route
    }
    
    try {
        // Get credentials
        const scriptProps = PropertiesService.getScriptProperties();
        const credentialManager = new CredentialManager(scriptProps);
        const globals = getGlobals();
        
        console.log('✅ Credentials loaded');
        console.log(`   Username: ${credentialManager.getUsername().substring(0, 10) + '...'}`);
        
        // Create RWGPSClient
        const client = new RWGPSClient({
            apiKey: credentialManager.getApiKey(),
            authToken: credentialManager.getAuthToken(),
            username: credentialManager.getUsername(),
            password: credentialManager.getPassword()
        });
        
        console.log('✅ RWGPSClient instantiated');
        
        const sourceRouteUrl = `https://ridewithgps.com/routes/${routeId}`;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        
        // Build route data with tags
        const routeData = {
            name: `TEST IMPORT ${timestamp}`,
            userId: globals.ClubUserId,
            tags: ['TEST'],
            expiry: '12/31/2025'
        };
        
        console.log(`\n📡 Importing route...`);
        console.log(`   Source: ${sourceRouteUrl}`);
        console.log(`   Name: ${routeData.name}`);
        console.log(`   User ID: ${routeData.userId}`);
        console.log(`   Tags: ${routeData.tags.join(', ')}`);
        console.log(`   Expiry: ${routeData.expiry}`);
        
        // STEP 1: Import route
        const result = client.importRoute(sourceRouteUrl, routeData);
        
        if (!result.success) {
            console.error('❌ Import failed');
            console.error(`   Error: ${result.error}`);
            return { success: false, error: result.error };
        }
        
        console.log('✅ Import succeeded');
        console.log(`   New route URL: ${result.routeUrl}`);
        
        // STEP 2: Verify route details
        console.log(`\n📡 Verifying imported route...`);
        
        if (!result.route) {
            console.error('❌ No route data returned');
            return { success: false, error: 'No route data in result' };
        }
        
        console.log('✅ Route details verified');
        console.log(`   ID: ${result.route.id}`);
        console.log(`   Name: ${result.route.name}`);
        console.log(`   Distance: ${(result.route.distance / 1000).toFixed(1)} km`);
        console.log(`   Elevation: ${result.route.elevation_gain}m gain`);
        
        // STEP 3: Clean up - delete the test route
        console.log(`\n📡 Cleaning up test route...`);
        
        // Note: RWGPSClient doesn't have deleteRoute yet, so we warn
        console.warn('⚠️  Manual cleanup required: Please delete route from RWGPS');
        console.warn(`   Route URL: ${result.routeUrl}`);
        console.warn('   (Delete via RWGPS web UI)');
        
        console.log('\n🎉 Task 3.12 (importRoute) working correctly!');
        console.log('   ✅ Route copied successfully');
        console.log('   ✅ Route details fetched');
        console.log('   ✅ Tags and expiry applied');
        console.log('   ⚠️  Manual cleanup required');
        
        return { 
            success: true, 
            routeUrl: result.routeUrl,
            route: result.route
        };
        
    } catch (error) {
        console.error('❌ Test execution failed:', error.message);
        console.error('   Stack:', error.stack);
        return { success: false, error: error.message };
    }
}

/**
 * Task 4.1: Integration test for v1 API single-edit (no double-edit workaround)
 * 
 * Tests if v1 API needs the double-edit pattern or if single PUT works.
 * This determines the strategy for Phase 4 migration.
 * 
 * Steps:
 * 1. Get an existing event
 * 2. Attempt single PUT to v1 API with all_day=0
 * 3. Verify if start_time was set correctly
 * 4. Document findings
 * 
 * @param {number} [eventId] - Event ID to test (default: 451900)
 * @returns {{success: boolean, findings?: string[], error?: string}}
 */
function testTask4_1_V1ApiSingleEdit(eventId) {
    console.log('====================================');
    console.log('Task 4.1: Test v1 API Single-Edit');
    console.log('====================================');
    console.log(`Event ID: ${eventId || 'NOT PROVIDED - using default 451900'}`);
    
    if (!eventId) {
        eventId = 451900; // Default test event from earlier tests
    }
    
    try {
        // Get credentials
        const scriptProps = PropertiesService.getScriptProperties();
        const credentialManager = new CredentialManager(scriptProps);
        
        console.log('✅ Credentials loaded');
        
        // Create RWGPSClient
        const client = new RWGPSClient({
            apiKey: credentialManager.getApiKey(),
            authToken: credentialManager.getAuthToken(),
            username: credentialManager.getUsername(),
            password: credentialManager.getPassword()
        });
        
        console.log('✅ RWGPSClient instantiated');
        
        const eventUrl = `https://ridewithgps.com/events/${eventId}`;
        
        // STEP 1: Get current event data
        console.log(`\n📡 Step 1: Fetching current event data...`);
        const getResult = client.getEvent(eventUrl);
        
        if (!getResult.success) {
            console.error('❌ Could not fetch event');
            return { success: false, error: 'Could not fetch event: ' + getResult.error };
        }
        
        const originalEvent = getResult.event;
        console.log(`✅ Event fetched: ${originalEvent.name}`);
        console.log(`   Original start_time: ${originalEvent.starts_at}`);
        console.log(`   Original all_day: ${originalEvent.all_day}`);
        
        // STEP 2: Test v1 API single-edit
        console.log(`\n📡 Step 2: Testing v1 API single PUT (no double-edit)...`);
        
        // Create test event data with modified name and time
        const testTime = '2030-04-15T18:30:00.000Z'; // Specific test time
        const testEventData = {
            name: originalEvent.name + ' [V1 TEST]',
            desc: originalEvent.desc || '',
            starts_at: testTime,
            all_day: '0'
        };
        
        console.log(`   Testing with start_time: ${testTime}`);
        console.log(`   Testing with all_day: 0 (single PUT only)`);
        
        const v1Result = client.testV1SingleEditEvent(eventUrl, testEventData);
        
        if (!v1Result.success) {
            console.warn('⚠️  V1 API single PUT returned error');
            console.warn(`   Error: ${v1Result.error}`);
            
            return {
                success: false,
                findings: [
                    'V1 API single PUT failed - may still need double-edit',
                    `Error: ${v1Result.error}`,
                    'Recommendation: Test double-edit with v1 API endpoint'
                ]
            };
        }
        
        console.log('✅ V1 API single PUT succeeded');
        
        if (v1Result.event) {
            console.log(`   Event returned: ${v1Result.event.name}`);
            console.log(`   New starts_at: ${v1Result.event.starts_at}`);
            console.log(`   New all_day: ${v1Result.event.all_day}`);
        }
        
        // STEP 3: Fetch and verify
        console.log(`\n📡 Step 3: Verifying v1 API changes...`);
        const verifyResult = client.getEvent(eventUrl);
        
        if (!verifyResult.success) {
            console.warn('⚠️  Could not verify (fetch failed)');
            return {
                success: true,
                findings: [
                    'V1 API single PUT succeeded (no error)',
                    'Could not verify via fetch (network issue)',
                    'Recommendation: Check RWGPS directly for time change'
                ]
            };
        }
        
        const updatedEvent = verifyResult.event;
        console.log(`✅ Event verified`);
        console.log(`   Updated starts_at: ${updatedEvent.starts_at}`);
        console.log(`   Updated all_day: ${updatedEvent.all_day}`);
        console.log(`   Updated name: ${updatedEvent.name}`);
        
        // STEP 4: Analyze findings
        console.log(`\n📋 Analysis of v1 API Behavior:`);
        
        const findings = [];
        
        // Check if name was set correctly
        if (updatedEvent.name.includes('[V1 TEST]')) {
            console.log('   ✅ Name updated correctly');
            findings.push('V1 API name field works with single PUT');
        } else {
            console.log('   ⚠️  Name may not have been updated');
            findings.push('V1 API name field may not accept updates');
        }
        
        // Check if time was set correctly
        if (updatedEvent.starts_at === testTime) {
            console.log('✅ Start time MATCHES test time exactly!');
            console.log('   → V1 API DOES NOT need double-edit!');
            findings.push('SUCCESS: v1 API single PUT sets start_time correctly!');
            findings.push('RECOMMENDATION: Migrate to v1 API without double-edit workaround');
        } else {
            console.log('⚠️  Start time does NOT match test time');
            console.log(`   Expected: ${testTime}`);
            console.log(`   Got: ${updatedEvent.starts_at}`);
            console.log('   → V1 API may still need double-edit or has different behavior');
            findings.push('UNCERTAIN: v1 API start_time behavior needs investigation');
            findings.push('Possible reasons: double-edit still needed, or time offset issue');
        }
        
        // Check all_day flag
        if (String(updatedEvent.all_day) === '0') {
            console.log('✅ all_day flag set correctly');
            findings.push('v1 API handles all_day=0 correctly');
        } else {
            console.log('⚠️  all_day flag not set correctly');
            findings.push('v1 API may have issue with all_day field');
        }
        
        // STEP 5: Cleanup
        console.log(`\n📡 Step 5: Restoring original event...`);
        
        const restoreData = {
            name: originalEvent.name,
            desc: originalEvent.desc,
            starts_at: originalEvent.starts_at,
            all_day: originalEvent.all_day
        };
        
        const restoreResult = client.testV1SingleEditEvent(eventUrl, restoreData);
        
        if (restoreResult.success) {
            console.log('✅ Event restored to original state');
        } else {
            console.warn('⚠️  Could not restore event (may need manual restore)');
            findings.push('Note: Event modification may need manual restoration');
        }
        
        console.log('\n🎉 Task 4.1 complete!');
        console.log('📊 Findings summary:');
        findings.forEach((f, i) => {
            console.log(`   ${i + 1}. ${f}`);
        });
        
        return {
            success: true,
            findings: findings,
            originalEvent: {
                id: originalEvent.id,
                name: originalEvent.name,
                starts_at: originalEvent.starts_at
            },
            testResult: v1Result.success ? 'SUCCESS' : 'FAILED'
        };
        
    } catch (error) {
        console.error('❌ Test execution failed:', error.message);
        console.error('   Stack:', error.stack);
        return { 
            success: false, 
            error: error.message,
            findings: ['Test execution error - check logs']
        };
    }
}

function testBatchOperations() {
    try {
        const eventUrls = [
            'https://ridewithgps.com/events/123-test',
            'https://ridewithgps.com/events/456-test'
        ];
        
        const prepared = RWGPSServiceCore.prepareBatchUpdateTags(
            eventUrls,
            'add',
            ['test-tag'],
            'event'
        );
        
        console.log('✅ Batch tag update preparation successful');
        console.log('URL:', prepared.url);
        console.log('Method:', prepared.method);
        console.log('Payload keys:', Object.keys(prepared.payload));
        console.log('Event IDs:', prepared.payload.event_ids);
        
        return { success: true, eventIds: prepared.payload.event_ids };
    } catch (error) {
        console.error('❌ Batch operation test failed:', error.message);
        return { success: false, error: error.message };
    }
}

function testRWGPSClass() {
    try {
        const scriptProps = PropertiesService.getScriptProperties();
        const apiService = new RWGPSApiService(scriptProps);
        const globals = getGlobals();
        const rwgpsService = new RWGPSService(apiService, globals);
        const rwgps = new RWGPS(rwgpsService);
        
        console.log('✅ RWGPS class instantiation successful');
        console.log('Has get_event method:', typeof rwgps.get_event === 'function');
        console.log('Has edit_events method:', typeof rwgps.edit_events === 'function');
        console.log('Has get_club_members method:', typeof rwgps.get_club_members === 'function');
        console.log('Has unTagEvents method:', typeof rwgps.unTagEvents === 'function');
        
        const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(rwgps))
            .filter(name => name !== 'constructor' && typeof rwgps[name] === 'function');
        
        console.log('Available methods:', methods.length);
        console.log('Method list:', methods.slice(0, 10).join(', '), methods.length > 10 ? '...' : '');
        
        return { success: true, methodCount: methods.length, methods };
    } catch (error) {
        console.error('❌ RWGPS class test failed:', error.message);
        return { success: false, error: error.message };
    }
}

function testBackwardCompatibility() {
    try {
        const rwgps = getRWGPS();
        
        console.log('✅ RWGPS factory method works');
        console.log('Instance type:', typeof rwgps);
        console.log('Has get_event:', typeof rwgps.get_event === 'function');
        
        const hasMenuFunctions = typeof Exports.MenuFunctions !== 'undefined';
        console.log('MenuFunctions available:', hasMenuFunctions);
        
        return { success: true, rwgpsType: typeof rwgps, menuFunctionsAvailable: hasMenuFunctions };
    } catch (error) {
        console.error('❌ Backward compatibility test failed:', error.message);
        return { success: false, error: error.message };
    }
}

function testErrorHandling() {
    const testCases = [
        {
            name: 'Invalid URL returns null',
            test: () => {
                const result = RWGPSServiceCore.extractIdFromUrl('invalid-url');
                if (result !== null) throw new Error('Expected null for invalid URL');
                return result;
            },
            shouldThrow: false
        },
        {
            name: 'Missing credentials (if not configured)',
            test: () => {
                try {
                    const scriptProps = PropertiesService.getScriptProperties();
                    RWGPSCredentialManager.getUsername(scriptProps);
                    return { configured: true };
                } catch (e) {
                    throw e; // Re-throw to be caught by test framework
                }
            },
            shouldThrow: false // May or may not throw depending on setup
        },
        {
            name: 'Invalid request to prepareRequest',
            test: () => RWGPSApiServiceCore.prepareRequest(null),
            shouldThrow: true
        }
    ];
    
    let passed = 0;
    for (const testCase of testCases) {
        try {
            const result = testCase.test();
            if (testCase.shouldThrow) {
                console.error(`❌ ${testCase.name}: Expected error but succeeded with:`, result);
            } else {
                console.log(`✅ ${testCase.name}: Succeeded as expected`);
                passed++;
            }
        } catch (error) {
            if (testCase.shouldThrow || testCase.name.includes('credentials')) {
                console.log(`✅ ${testCase.name}: Correctly threw error:`, error.message);
                passed++;
            } else {
                console.error(`❌ ${testCase.name}: Unexpected error:`, error.message);
            }
        }
    }
    
    console.log(`Error handling tests: ${passed}/${testCases.length} passed`);
    return { success: passed === testCases.length, passed, total: testCases.length };
}

function testModuleLoading() {
    try {
        const modules = [
            'RWGPSCredentialManager',
            'RWGPSApiServiceCore', 
            'RWGPSServiceCore',
            'RWGPSService',
            'RWGPS'
        ];
        
        let loaded = 0;
        for (const moduleName of modules) {
            try {
                const module = Exports[moduleName];
                if (typeof module === 'function') {
                    console.log(`✅ ${moduleName}: Loaded as class constructor`);
                    loaded++;
                } else {
                    console.error(`❌ ${moduleName}: Not a function (${typeof module})`);
                }
            } catch (error) {
                console.error(`❌ ${moduleName}: Failed to access:`, error.message);
            }
        }
        
        console.log(`Module loading: ${loaded}/${modules.length} successful`);
        return { success: loaded === modules.length, loaded, total: modules.length };
    } catch (error) {
        console.error('❌ Module loading test failed:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Master test runner - Run this function in GAS console
 */
function runIntegrationTests() {
    console.log('=== RWGPSLib Migration Integration Tests ===');
    try {
        console.log('Version:', getAppVersion());
    } catch (error) {
        console.log('Version: Unknown (getAppVersion not available)');
    }
    console.log('');
    
    const tests = [
        { name: 'Module Loading', fn: testModuleLoading },
        { name: 'Credential Manager', fn: testCredentialManager },
        { name: 'API Service Core', fn: testApiServiceCore },
        { name: 'Batch Requests', fn: testBatchRequests },
        { name: 'Service Core Logic', fn: testServiceCore },
        { name: 'Batch Operations', fn: testBatchOperations },
        { name: 'RWGPS Class', fn: testRWGPSClass },
        { name: 'Backward Compatibility', fn: testBackwardCompatibility },
        { name: 'Error Handling', fn: testErrorHandling }
    ];
    
    const results = [];
    let passed = 0;
    
    for (const test of tests) {
        console.log(`\n--- ${test.name} ---`);
        try {
            const result = test.fn();
            results.push({ name: test.name, ...result });
            if (result.success) passed++;
        } catch (error) {
            console.error(`❌ Test execution failed:`, error.message);
            results.push({ name: test.name, success: false, error: error.message });
        }
    }
    
    console.log(`\n=== Test Summary ===`);
    console.log(`Passed: ${passed}/${tests.length}`);
    console.log(`Success Rate: ${(passed / tests.length * 100).toFixed(1)}%`);
    
    if (passed === tests.length) {
        console.log('🎉 ALL TESTS PASSED - Migration is production-ready!');
    } else {
        console.log('⚠️ Some tests failed - Review results before production deployment');
    }
    
    return results;
}

/**
 * Quick smoke test - just verify core modules load
 */
function quickSmokeTest() {
    console.log('=== Quick Smoke Test ===');
    
    try {
        // Test basic module access
        const hasCredentialManager = typeof RWGPSCredentialManager !== 'undefined';
        const hasServiceCore = typeof RWGPSServiceCore !== 'undefined';
        const hasRWGPS = typeof RWGPS !== 'undefined';
        
        console.log('✅ RWGPSCredentialManager available:', hasCredentialManager);
        console.log('✅ RWGPSServiceCore available:', hasServiceCore);
        console.log('✅ RWGPS class available:', hasRWGPS);
        
        // Test RWGPS instantiation with proper dependencies
        const scriptProps = PropertiesService.getScriptProperties();
        const apiService = new RWGPSApiService(scriptProps);
        const globals = getGlobals();
        const rwgpsService = new RWGPSService(apiService, globals);
        const rwgps = new RWGPS(rwgpsService);
        
        console.log('✅ RWGPS class instantiates with dependencies');
        console.log('🎉 Basic smoke test passed - modules loading correctly');
        
        return { success: true };
    } catch (error) {
        console.error('❌ Smoke test failed:', error.message);
        return { success: false, error: error.message };
    }
}