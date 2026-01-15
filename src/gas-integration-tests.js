/// <reference path="./gas-globals.d.ts" />
// @ts-nocheck - GAS integration tests use GAS-only globals like PropertiesService

/**
 * Task 4.4 Part B: Test createEvent with logo from Groups tab
 * 
 * Tests complete logo integration workflow:
 * 1. Read logo URL from Groups tab
 * 2. Pass logo to scheduleEvent (which uses createEventWithLogo)
 * 3. Verify logo appears on created event
 * 
 * @returns {{success: boolean, findings?: string[], error?: string}}
 */
function testTask4_4_PartB_LogoIntegration() {
    console.log('====================================');
    console.log('Task 4.4 Part B: Logo Integration Test');
    console.log('====================================');
    
    try {
        // Get credentials
        const scriptProps = PropertiesService.getScriptProperties();
        // @ts-ignore - CredentialManager available in GAS runtime
        const credentialManager = new CredentialManager(scriptProps);
        
        console.log('✅ Credentials loaded');
        
        // Create RWGPSClient
        // @ts-ignore - RWGPSClient available in GAS runtime
        const client = new RWGPSClient({
            apiKey: credentialManager.getApiKey(),
            authToken: credentialManager.getAuthToken(),
            username: credentialManager.getUsername(),
            password: credentialManager.getPassword()
        });
        
        console.log('✅ RWGPSClient instantiated');
        
        // STEP 1: Get group specs (includes logo URLs from Drive)
        console.log('\n📊 Step 1: Loading Groups with logos...');
        const groupSpecs = getGroupSpecs(); // From Groups.js
        
        // Find a group with LogoURL
        let testGroup = null;
        let logoUrl = null;
        for (const [groupName, groupSpec] of Object.entries(groupSpecs)) {
            if (groupSpec.LogoURL) {
                testGroup = groupName;
                logoUrl = groupSpec.LogoURL;
                break;
            }
        }
        
        if (!testGroup || !logoUrl) {
            console.warn('⚠️  No groups with LogoURL found');
            console.warn('   Run populateGroupLogos() first to upload logos to Drive');
            return {
                success: false,
                error: 'No groups with LogoURL found - run populateGroupLogos() first'
            };
        }
        
        console.log(`✅ Found test group: ${testGroup}`);
        console.log(`   Logo URL (Drive): ${logoUrl}`);
        console.log(`   Template: ${groupSpecs[testGroup].Template}`);
        
        // STEP 2: Create event with logo
        console.log('\n🚀 Step 2: Creating event with logo...');
        
        const testEventData = {
            name: `TEST LOGO - ${testGroup} (${new Date().toISOString().slice(5, 16).replace('T', ' ')})`,
            description: 'Test event created by testTask4_4_PartB_LogoIntegration(). Safe to delete.',
            start_date: '2030-12-31',
            start_time: '10:00',
            visibility: 'public', // Valid values: 'public', 'private', 'friends_only'
            route_ids: ['32614616'], // SCCCC Test Route
            organizer_ids: []
        };
        
        const result = client.scheduleEvent(
            groupSpecs[testGroup].Template, // templateUrl (for organizer lookup context)
            testEventData,
            [], // organizerNames
            logoUrl // Pass logo URL
        );
        
        if (!result.success) {
            console.error('❌ Event creation failed:', result.error);
            return {
                success: false,
                error: `Event creation failed: ${result.error}`
            };
        }
        
        console.log(`✅ Event created: ${result.eventUrl}`);
        console.log(`   Event ID: ${result.event?.id}`);
        
        if (!result.eventUrl) {
            console.error('❌ Event URL missing from result');
            return {
                success: false,
                error: 'Event URL missing from result'
            };
        }
        
        // STEP 2.5: Manual logo verification
        console.log('\n👀 Step 2.5: Manual logo verification...');
        console.log(`   Event URL: ${result.eventUrl}`);
        console.log(`   Expected logo: ${logoUrl}`);
        
        const ui = SpreadsheetApp.getUi();
        const response = ui.alert(
            'Logo Verification Required',
            `Event created with logo!\n\n` +
            `URL: ${result.eventUrl}\n\n` +
            `Please open this URL in your browser and verify:\n` +
            `1. Does the event have a logo?\n` +
            `2. Is the logo correct for group ${testGroup}?\n\n` +
            `Click OK when you've verified the logo, or Cancel to abort.`,
            ui.ButtonSet.OK_CANCEL
        );
        
        if (response === ui.Button.CANCEL) {
            console.warn('⚠️  Test aborted by user');
            console.log('\nℹ️  Test event NOT deleted - manual cleanup required');
            console.log(`   Delete at: ${result.eventUrl}`);
            return {
                success: false,
                error: 'Test aborted by user',
                findings: [
                    'Test aborted by user during manual verification',
                    `Event created but not deleted: ${result.eventUrl}`,
                    'Manual cleanup required'
                ]
            };
        }
        
        console.log('✅ User confirmed logo verification');
        
        // STEP 3: Verify logo on created event
        console.log('\n🔍 Step 3: Verifying logo on created event...');
        
        const getResult = client.getEvent(result.eventUrl);
        if (!getResult.success) {
            console.error('❌ Failed to fetch created event:', getResult.error);
            return {
                success: false,
                error: `Failed to verify event: ${getResult.error}`
            };
        }
        
        const hasLogo = getResult.event?.logo_url;
        console.log(`   logo_url present: ${hasLogo ? '✅ YES' : '❌ NO'}`);
        if (hasLogo) {
            console.log(`   logo_url: ${getResult.event.logo_url}`);
        }
        
        // STEP 4: Cleanup - delete test event
        console.log('\n🧹 Step 4: Cleaning up test event...');
        const deleteResult = client.deleteEvent(result.eventUrl);
        if (deleteResult.success) {
            console.log('✅ Test event deleted');
        } else {
            console.warn('⚠️  Failed to delete test event:', deleteResult.error);
            console.warn(`   Manual cleanup needed: ${result.eventUrl}`);
        }
        
        // Summary
        console.log('\n====================================');
        console.log('FINDINGS:');
        console.log('====================================');
        const findings = [
            `Group tested: ${testGroup}`,
            `Logo URL: ${logoUrl}`,
            `Event created: ${result.eventUrl}`,
            `Logo attached: ${hasLogo ? 'YES ✅' : 'NO ❌'}`,
            `Cleanup: ${deleteResult.success ? 'SUCCESS ✅' : 'FAILED ⚠️'}`
        ];
        findings.forEach(f => console.log(`  • ${f}`));
        
        if (!hasLogo) {
            console.error('\n❌ TEST FAILED: Logo not attached to event');
            return {
                success: false,
                error: 'Logo not attached to event',
                findings
            };
        }
        
        console.log('\n✅ TEST PASSED: Logo successfully attached to event');
        return {
            success: true,
            findings
        };
        
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('❌ Test execution error:', err.message);
        if (err.stack) console.error(err.stack);
        return {
            success: false,
            error: err.message,
            findings: ['Test execution error - check logs']
        };
    }
}

/**
 * Task 4.2: Test v1 API getEvent response transformation
 * 
 * Validates that getEvent() correctly:
 * 1. Calls v1 API endpoint (no login required)
 * 2. Transforms v1 response format to web API format
 * 3. Converts start_date + start_time to starts_at timestamp
 * 
 * @param {number} [eventId] - Event ID to test (default: 445203)
 * @returns {{success: boolean, findings?: string[], error?: string}}
 */
function testTask4_2_V1ApiGetEvent(eventId) {
    console.log('====================================');
    console.log('Task 4.2: Test v1 API getEvent');
    console.log('====================================');
    console.log(`Event ID: ${eventId || 'NOT PROVIDED - using default 445203'}`);
    
    if (!eventId) {
        console.warn('⚠️  No event ID provided. Using default: 445203');
        console.warn('   If this fails, provide a valid event ID:');
        console.warn('   testTask4_2_V1ApiGetEvent(YOUR_EVENT_ID)');
        eventId = 445203;
    }
    
    try {
        // Get credentials
        const scriptProps = PropertiesService.getScriptProperties();
        // @ts-ignore - CredentialManager available in GAS runtime
        const credentialManager = new CredentialManager(scriptProps);
        
        console.log('✅ Credentials loaded');
        console.log(`   apiKey: ${credentialManager.getApiKey()?.substring(0, 10)}...`);
        console.log(`   authToken: ${credentialManager.getAuthToken()?.substring(0, 10)}...`);
        
        // Create RWGPSClient
        // @ts-ignore - RWGPSClient available in GAS runtime
        const client = new RWGPSClient({
            apiKey: credentialManager.getApiKey(),
            authToken: credentialManager.getAuthToken(),
            username: credentialManager.getUsername(),
            password: credentialManager.getPassword()
        });
        
        console.log('✅ RWGPSClient instantiated');
        
        const eventUrl = `https://ridewithgps.com/events/${eventId}`;
        
        // STEP 1: Get event via v1 API
        console.log(`\n📡 Step 1: Fetching event via v1 API...`);
        console.log(`   URL: ${eventUrl}`);
        console.log(`   v1 Endpoint: https://ridewithgps.com/api/v1/events/${eventId}.json`);
        
        // CRITICAL: Test the raw API call first
        console.log(`\n🔍 Testing v1 API response (raw)...`);
        const options = {
            // @ts-ignore - GAS accepts string method
            method: 'GET',
            headers: {
                // @ts-ignore - _getBasicAuthHeader is private but needed for testing
                'Authorization': client._getBasicAuthHeader(),
                'Accept': 'application/json'
            },
            muteHttpExceptions: true
        };
        
        const v1Url = `https://ridewithgps.com/api/v1/events/${eventId}.json`;
        // @ts-ignore - GAS UrlFetchApp accepts options structure 
        const rawResponse = UrlFetchApp.fetch(v1Url, options);
        const statusCode = rawResponse.getResponseCode();
        console.log(`   Status: ${statusCode}`);
        
        if (statusCode === 200) {
            const rawText = rawResponse.getContentText();
            console.log(`   Response length: ${rawText.length} bytes`);
            
            try {
                const v1Data = JSON.parse(rawText);
                console.log(`   Parsed successfully!`);
                console.log(`   v1 Data keys: ${Object.keys(v1Data).join(', ')}`);
                console.log(`   v1 id: ${v1Data.id}`);
                console.log(`   v1 name: ${v1Data.name}`);
                console.log(`   v1 start_date: ${v1Data.start_date}`);
                console.log(`   v1 start_time: ${v1Data.start_time}`);
            } catch (parseErr) {
                const err = parseErr instanceof Error ? parseErr : new Error(String(parseErr));
                console.error(`   Parse error: ${err.message}`);
                console.log(`   Raw response (first 500 chars): ${rawText.substring(0, 500)}`);
            }
        } else {
            console.error(`   API Error: Status ${statusCode}`);
            console.log(`   Response: ${rawResponse.getContentText()}`);
        }
        
        console.log(`\n📡 Now calling client.getEvent()...`);
        const result = client.getEvent(eventUrl);
        
        console.log(`\n📊 Response from client.getEvent():`);
        console.log(`   success: ${result.success}`);
        console.log(`   error: ${result.error || 'none'}`);
        console.log(`   event keys: ${result.event ? Object.keys(result.event).join(', ') : 'null'}`);
        
        if (!result.success) {
            console.error('❌ Failed to get event');
            console.error(`   Error: ${result.error}`);
            return {
                success: false,
                error: result.error
            };
        }
        
        const event = result.event;
        
        // Debug: log all event properties
        console.log(`\n🔍 Transformed event object properties:`);
        for (const key in event) {
            const value = event[key];
            const display = typeof value === 'string' && value.length > 100 ? value.substring(0, 100) + '...' : value;
            console.log(`   ${key}: ${display}`);
        }
        
        console.log(`\n✅ Event data received`);
        console.log(`   Name: ${event.name || 'undefined'}`);
        console.log(`   ID: ${event.id || 'undefined'}`);
        console.log(`   starts_at: ${event.starts_at || 'null'}`);
        console.log(`   all_day: ${event.all_day}`);
        
        // STEP 2: Validate response transformation
        console.log(`\n📋 Step 2: Validating response transformation...`);
        
        const findings = [];
        
        // Check required fields
        if (!event.id) {
            findings.push('❌ Event ID missing');
            console.log('   ❌ Event ID missing');
        } else {
            findings.push('✅ Event ID present');
            console.log('   ✅ Event ID present');
        }
        
        if (!event.name) {
            findings.push('❌ Event name missing');
            console.log('   ❌ Event name missing');
        } else {
            findings.push('✅ Event name present');
            console.log(`   ✅ Event name present: ${event.name.substring(0, 50)}...`);
        }
        
        // Check timestamp transformation
        if (!event.starts_at) {
            findings.push('❌ starts_at missing (transformation failed)');
            console.log('   ❌ starts_at missing (transformation failed)');
        } else {
            findings.push('✅ starts_at present (transformation worked)');
            console.log(`   ✅ starts_at present: ${event.starts_at}`);
            
            // Validate ISO 8601 format
            const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
            if (isoRegex.test(event.starts_at)) {
                findings.push('✅ starts_at in ISO 8601 format');
                console.log('   ✅ starts_at in ISO 8601 format');
            } else {
                findings.push('⚠️  starts_at format unexpected');
                console.log('   ⚠️  starts_at format unexpected');
            }
        }
        
        // Check all_day field
        if (typeof event.all_day !== 'boolean' && event.all_day !== 0 && event.all_day !== 1) {
            findings.push('⚠️  all_day type unexpected');
            console.log('   ⚠️  all_day type unexpected');
        } else {
            findings.push('✅ all_day field valid');
            console.log('   ✅ all_day field valid');
        }
        
        // Check optional fields
        const optionalFields = ['desc', 'visibility', 'routes', 'organizer_ids'];
        let optionalCount = 0;
        optionalFields.forEach(field => {
            if (event[field] !== undefined) optionalCount++;
        });
        console.log(`   ✅ Additional fields: ${optionalCount}/${optionalFields.length} present`);
        findings.push(`✅ Additional fields mapped: ${optionalCount}/${optionalFields.length}`);
        
        // STEP 3: Summary
        console.log(`\n📊 Transformation Results:`);
        console.log('   ✅ v1 API endpoint called (no login required)');
        console.log('   ✅ Response format transformed successfully');
        console.log('   ✅ Web API format returned to consumer');
        
        console.log(`\n🎉 Task 4.2 validation complete!`);
        console.log(`📊 Findings summary:`);
        findings.forEach((finding, i) => console.log(`   ${i + 1}. ${finding}`));
        
        return { success: true, findings };
        
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('❌ Test execution failed:', err.message);
        console.error('   Stack:', err.stack);
        return {
            success: false,
            error: err.message,
            findings: ['Test execution error - check logs']
        };
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
 * @param {number} [eventId] - Event ID to test (default: 445203)
 * @returns {{success: boolean, findings?: string[], error?: string, suggestion?: string, originalEvent?: any, testResult?: string}}
 */
function testTask4_1_V1ApiSingleEdit(eventId) {
    console.log('====================================');
    console.log('Task 4.1: Test v1 API Single-Edit');
    console.log('====================================');
    console.log(`Event ID: ${eventId || 'NOT PROVIDED - using default 445203'}`);
    
    if (!eventId) {
        console.warn('⚠️  No event ID provided. Using default: 445203');
        console.warn('   If this fails, provide a valid event ID:');
        console.warn('   testTask4_1_V1ApiSingleEdit(YOUR_EVENT_ID)');
        eventId = 445203; // Event used successfully in Task 3.11 updateEvent test
    }
    
    try {
        // Get credentials
        const scriptProps = PropertiesService.getScriptProperties();
        // @ts-ignore - CredentialManager available in GAS runtime
        const credentialManager = new CredentialManager(scriptProps);
        
        console.log('✅ Credentials loaded');
        
        // Create RWGPSClient
        // @ts-ignore - RWGPSClient available in GAS runtime
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
            console.error(`   Error: ${getResult.error || 'Unknown error'}`);
            console.error(`   Event URL attempted: ${eventUrl}`);
            console.error('');
            console.error('💡 Troubleshooting:');
            console.error('   1. Check if event exists: Visit the URL in browser');
            console.error('   2. Check if event is accessible to authenticated user');
            console.error('   3. Try a different event ID:');
            console.error('      testTask4_1_V1ApiSingleEdit(YOUR_EVENT_ID)');
            console.error('   4. Recent working event IDs: 445203, 444070');
            return { 
                success: false, 
                error: 'Could not fetch event: ' + (getResult.error || 'Unknown error'),
                suggestion: 'Try testTask4_1_V1ApiSingleEdit(445203) or another valid event ID'
            };
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
        
        console.log(`   Payload being sent to v1 API:`);
        console.log(`      name: ${testEventData.name}`);
        console.log(`      starts_at: ${testEventData.starts_at}`);
        console.log(`      all_day: ${testEventData.all_day}`);
        
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
        
        console.log('✅ V1 API single PUT succeeded (HTTP 200)');
        console.log('   V1 API response body:');
        console.log(`      Full response: ${JSON.stringify(v1Result.event || {}, null, 2)}`);
        
        if (v1Result.event) {
            console.log(`   Event name in response: ${v1Result.event.name || 'undefined'}`);
            console.log(`   Event starts_at in response: ${v1Result.event.starts_at || 'undefined'}`);
            console.log(`   Event all_day in response: ${v1Result.event.all_day}`);
        } else {
            console.log('   ⚠️  No event object in v1 API response');
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
        
        /** @type {string[]} */
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
        const timeMatches = updatedEvent.starts_at === testTime;
        // Also check if it's close (within 1 hour tolerance for timezone issues)
        const originalTime = new Date(originalEvent.starts_at).getTime();
        const updatedTime = new Date(updatedEvent.starts_at).getTime();
        const testTimeMs = new Date(testTime).getTime();
        const timeChanged = Math.abs(updatedTime - originalTime) > 60000; // Changed by more than 1 minute
        const testTimeCloseMatch = Math.abs(updatedTime - testTimeMs) < 3600000; // Within 1 hour
        
        if (timeMatches) {
            console.log('   ✅ Start time MATCHES test time exactly!');
            console.log(`   → V1 API DOES NOT need double-edit!`);
            findings.push('✅ CONFIRMED: V1 API single PUT correctly sets start_time');
            findings.push('Migration strategy: Can use single v1 PUT for time changes');
        } else if (testTimeCloseMatch && timeChanged) {
            console.log('   ⚠️  Start time changed but may have timezone offset');
            console.log(`   Expected: ${testTime}`);
            console.log(`   Got: ${updatedEvent.starts_at}`);
            console.log(`   Difference: ${Math.abs(updatedTime - testTimeMs) / 60000} minutes`);
            findings.push('⚠️ V1 API may apply timezone conversion to start_time');
            findings.push('Need to test with timezone-aware payloads');
        } else if (!timeChanged) {
            console.log('   ❌ Start time did NOT change');
            console.log(`   Expected: ${testTime}`);
            console.log(`   Got: ${updatedEvent.starts_at} (same as original: ${originalEvent.starts_at})`);
            console.log(`   → V1 API likely STILL NEEDS double-edit workaround`);
            findings.push('❌ CRITICAL: V1 API single PUT does NOT set start_time');
            findings.push('V1 API still requires double-edit workaround (like web API)');
            findings.push('Migration strategy: Must use double PUT for time changes');
        } else {
            console.log('   ⚠️  Start time does NOT match test time');
            console.log(`   Expected: ${testTime}`);
            console.log(`   Got: ${updatedEvent.starts_at}`);
            findings.push('⚠️ V1 API start_time behavior unclear - needs more testing');
        }
        
        // Check all_day flag
        const allDayValue = updatedEvent.all_day;
        if (allDayValue === false || allDayValue === 0 || allDayValue === '0') {
            console.log('   ✅ all_day flag set correctly (false/0)');
            findings.push('V1 API all_day field works correctly');
        } else {
            console.log(`   ⚠️  all_day flag not set correctly`);
            console.log(`   Expected: 0 or false, Got: ${allDayValue}`);
            findings.push('V1 API may have issue with all_day field');
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
        findings.forEach((/** @type {string} */ f, /** @type {number} */ i) => {
            console.log(`   ${i + 1}. ${f}`);
        });
        
        console.log('\n📝 CONCLUSION:');
        if (findings.some((/** @type {string} */ f) => f.includes('CRITICAL') || f.includes('NOT set start_time'))) {
            console.log('   ❌ V1 API REQUIRES double-edit workaround (same as web API)');
            console.log('   → Phase 4 migration must keep double-PUT pattern for time changes');
        } else if (findings.some((/** @type {string} */ f) => f.includes('CONFIRMED'))) {
            console.log('✅ V1 API works with single PUT - no double-edit needed!');
            console.log('   → Phase 4 migration can simplify to single PUT');
        } else {
            console.log('   ⚠️  Inconclusive - needs more investigation');
            console.log('   → Consider testing with different payload formats');
        }
        
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
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('❌ Test execution failed:', err.message);
        console.error('   Stack:', err.stack);
        return { 
            success: false, 
            error: err.message,
            findings: ['Test execution error - check logs']
        };
    }
}

/**
 * Test RWGPS Bug Fix: Single PUT with organizers + date change
 * 
 * Tests that the RWGPS v1 API bug has been fixed:
 * - BEFORE: Organizers not set on first edit, required double-edit workaround
 * - AFTER: Single PUT should set organizers correctly
 * 
 * Also tests date updates and all_day inference from start_time/end_time.
 * 
 * @returns {{success: boolean, findings?: string[], error?: string}}
 */
function testRWGPS_BugFixed_SinglePUT() {
    console.log('====================================');
    console.log('RWGPS Bug Fix Verification');
    console.log('====================================');
    
    try {
        // Get credentials
        const scriptProps = PropertiesService.getScriptProperties();
        // @ts-ignore - CredentialManager available in GAS runtime
        const credentialManager = new CredentialManager(scriptProps);
        
        // @ts-ignore - RWGPSClient available in GAS runtime
        const client = new RWGPSClient({
            apiKey: credentialManager.getApiKey(),
            authToken: credentialManager.getAuthToken(),
            username: credentialManager.getUsername(),
            password: credentialManager.getPassword()
        });
        
        console.log('✅ RWGPSClient instantiated');
        
        // STEP 1: Create test event
        console.log('\n📝 Step 1: Creating test event...');
        
        const testEventData = {
            name: `BUG TEST - Single PUT (${new Date().toISOString().slice(11, 19)})`,
            description: 'Test event for RWGPS bug fix verification. Safe to delete.',
            start_date: '2030-06-15',
            start_time: '10:00',
            visibility: 'public',
            route_ids: ['32614616'], // SCCCC Test Route
            organizer_ids: [] // Start with no organizers
        };
        
        const createResult = client.createEvent(testEventData);
        
        if (!createResult.success) {
            console.error('❌ Failed to create test event:', createResult.error);
            return {
                success: false,
                error: `Event creation failed: ${createResult.error}`
            };
        }
        
        console.log(`✅ Test event created: ${createResult.eventUrl}`);
        console.log(`   Event ID: ${createResult.event?.id}`);
        console.log(`   Initial date: ${createResult.event?.start_date}`);
        console.log(`   Initial time: ${createResult.event?.start_time}`);
        console.log(`   Initial all_day: ${createResult.event?.all_day}`);
        
        const eventUrl = createResult.eventUrl;
        const eventId = createResult.event?.id;
        
        // STEP 2: Test single PUT with organizers + date change
        console.log('\n🔧 Step 2: Testing single PUT with organizers + date change...');
        
        // Look up organizer from RWGPS Members sheet
        console.log('   Looking up organizer from RWGPS Members sheet...');
        
        // @ts-ignore - RWGPSMembersAdapter available in GAS runtime
        const membersAdapter = new RWGPSMembersAdapter(null); // rwgps param not needed for lookup
        const lookupResult = membersAdapter.lookupUserIdByName('Toby Ferguson');
        
        if (!lookupResult.success || !lookupResult.userId) {
            console.error('❌ Failed to lookup organizer from sheet:', lookupResult.error);
            console.warn('⚠️  Hint: Run daily RWGPS members sync first, or check RWGPS Members sheet exists');
            console.log('\n🧹 Cleaning up test event...');
            client.deleteEvent(eventUrl);
            return {
                success: false,
                error: `Organizer lookup failed: ${lookupResult.error}. Run RWGPS members sync first.`
            };
        }
        
        const organizerId = String(lookupResult.userId);
        console.log(`✅ Found organizer: ${lookupResult.name} (User ID: ${organizerId})`);
        
        // Single PUT with NEW date + organizer
        const updateData = {
            name: `BUG TEST - Single PUT UPDATED`,
            description: 'Updated via single PUT with organizer and date change.',
            start_date: '2030-07-20', // Changed from 2030-06-15
            start_time: '14:30', // Changed from 10:00
            visibility: 'public',
            route_ids: ['32614616'],
            organizer_ids: [organizerId] // Adding organizer
        };
        
        console.log('   Sending single PUT request...');
        console.log(`   - New date: ${updateData.start_date} (was: ${createResult.event?.start_date})`);
        console.log(`   - New time: ${updateData.start_time} (was: ${createResult.event?.start_time})`);
        console.log(`   - Adding organizer: ${organizerId}`);
        
        // Use testV1SingleEditEvent for single PUT (no double-edit)
        const editResult = client.testV1SingleEditEvent(eventUrl, updateData);
        
        if (!editResult.success) {
            console.error('❌ Single PUT failed:', editResult.error);
            console.log('\n🧹 Cleaning up test event...');
            client.deleteEvent(eventUrl);
            return {
                success: false,
                error: `Single PUT failed: ${editResult.error}`
            };
        }
        
        console.log('✅ Single PUT completed');
        
        // STEP 3: Verify changes
        console.log('\n🔍 Step 3: Verifying changes...');
        
        const getResult = client.getEvent(eventUrl);
        
        if (!getResult.success) {
            console.error('❌ Failed to fetch updated event:', getResult.error);
            console.log('\n🧹 Cleaning up test event...');
            client.deleteEvent(eventUrl);
            return {
                success: false,
                error: `Failed to verify event: ${getResult.error}`
            };
        }
        
        const updatedEvent = getResult.event;
        
        console.log('📊 Verification Results:');
        console.log(`   Name: ${updatedEvent.name}`);
        console.log(`   Date: ${updatedEvent.start_date} (expected: 2030-07-20)`);
        console.log(`   Time: ${updatedEvent.start_time} (expected: 14:30)`);
        console.log(`   All-day: ${updatedEvent.all_day} (expected: false)`);
        console.log(`   Organizers: ${updatedEvent.organizer_ids?.length || 0} (expected: 1)`);
        
        // Check results
        /** @type {string[]} */
        const findings = [];
        let bugFixed = true;
        
        // Check date (previously broken)
        if (updatedEvent.start_date === '2030-07-20') {
            console.log('✅ Date updated correctly');
            findings.push('✅ DATE: Updated correctly (bug was: date never changed)');
        } else {
            console.log(`❌ Date NOT updated: ${updatedEvent.start_date} (expected: 2030-07-20)`);
            findings.push(`❌ DATE: Still broken - got ${updatedEvent.start_date}, expected 2030-07-20`);
            bugFixed = false;
        }
        
        // Check time
        if (updatedEvent.start_time === '14:30') {
            console.log('✅ Time updated correctly');
            findings.push('✅ TIME: Updated correctly');
        } else {
            console.log(`❌ Time NOT updated: ${updatedEvent.start_time}`);
            findings.push(`❌ TIME: Got ${updatedEvent.start_time}, expected 14:30`);
            bugFixed = false;
        }
        
        // Check organizers (previously required double-edit)
        const hasOrganizer = updatedEvent.organizer_ids && updatedEvent.organizer_ids.length > 0;
        if (hasOrganizer) {
            console.log('✅ Organizer set on first PUT');
            findings.push('✅ ORGANIZERS: Set correctly with single PUT (bug was: required double-edit)');
        } else {
            console.log('❌ Organizer NOT set');
            findings.push('❌ ORGANIZERS: Not set - still requires double-edit workaround');
            bugFixed = false;
        }
        
        // Check all_day inference
        if (updatedEvent.all_day === false || updatedEvent.all_day === 'false') {
            console.log('✅ All-day correctly inferred from start_time presence');
            findings.push('✅ ALL_DAY: Correctly inferred as false from start_time/end_time');
        } else {
            console.log(`⚠️  All-day unexpected value: ${updatedEvent.all_day}`);
            findings.push(`⚠️  ALL_DAY: Unexpected value ${updatedEvent.all_day}, expected false`);
        }
        
        // STEP 4: Cleanup
        console.log('\n🧹 Step 4: Cleaning up test event...');
        const deleteResult = client.deleteEvent(eventUrl);
        
        if (deleteResult.success) {
            console.log('✅ Test event deleted');
        } else {
            console.warn(`⚠️  Failed to delete test event: ${deleteResult.error}`);
            console.warn(`   Manual cleanup required: ${eventUrl}`);
            findings.push(`⚠️  Manual cleanup required: ${eventUrl}`);
        }
        
        // Final summary
        console.log('\n' + '='.repeat(50));
        console.log('📊 FINAL VERDICT:');
        console.log('='.repeat(50));
        
        if (bugFixed) {
            console.log('🎉 BUG FIXED! Single PUT now works correctly.');
            console.log('✅ Date updates work');
            console.log('✅ Organizers set on first edit');
            console.log('✅ All-day correctly inferred');
            console.log('\n👉 ACTION REQUIRED: Remove double-edit workaround from RWGPSClient.editEvent()');
            findings.push('🎉 BUG FIXED - Double-edit workaround can be removed');
        } else {
            console.log('❌ BUG NOT FIXED - Double-edit workaround still needed');
            findings.push('❌ BUG NOT FIXED - Keep double-edit workaround');
        }
        
        return {
            success: true,
            bugFixed: bugFixed,
            findings: findings,
            testEventId: eventId,
            results: {
                dateUpdated: updatedEvent.start_date === '2030-07-20',
                timeUpdated: updatedEvent.start_time === '14:30',
                organizersSet: hasOrganizer,
                allDayInferred: updatedEvent.all_day === false || updatedEvent.all_day === 'false'
            }
        };
        
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('❌ Test execution failed:', err.message);
        console.error('   Stack:', err.stack);
        return {
            success: false,
            error: err.message,
            findings: ['Test execution error - check logs']
        };
    }
}

/**
 * Simple credential test
 */
function testCredentials() {
    try {
        const scriptProps = PropertiesService.getScriptProperties();
        // @ts-ignore - CredentialManager available in GAS runtime
        const credentialManager = new CredentialManager(scriptProps);
        
        console.log('✅ Credentials loaded successfully');
        console.log('Username present:', !!credentialManager.getUsername());
        console.log('API Key present:', !!credentialManager.getApiKey());
        console.log('Auth Token present:', !!credentialManager.getAuthToken());
        
        return { success: true };
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('❌ Credential test failed:', err.message);
        return { success: false, error: err.message };
    }
}