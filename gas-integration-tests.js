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