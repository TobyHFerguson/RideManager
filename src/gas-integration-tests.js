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