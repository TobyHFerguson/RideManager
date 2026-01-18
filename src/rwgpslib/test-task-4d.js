/**
 * GAS Test for Task 4.D: Consolidated createEvent method
 * 
 * Tests that createEvent() works with and without optional logo parameter.
 * 
 * USAGE:
 * 1. Deploy this script to GAS (via npm run dev:push)
 * 2. Open Script Editor
 * 3. Run testTask4DCreateEvent() for basic test
 * 4. Run testTask4DCreateEventWithLogo() for logo test (requires valid Drive URL)
 * 
 * CLEANUP:
 * Events created by these tests should be manually deleted from RWGPS.
 */

/* istanbul ignore file - GAS-only test script */

/**
 * Test createEvent without logo (JSON POST)
 */
function testTask4DCreateEvent() {
    console.log('=== Task 4.D GAS Test: createEvent without logo ===');
    
    try {
        const globals = getGlobals();
        const client = new RWGPSClient(globals.RWGPSApiKey, globals.RWGPSAuthToken);
        
        // Create test event data
        const eventData = {
            name: `[TEST 4.D] Event without logo ${new Date().toISOString()}`,
            description: 'Task 4.D test - createEvent without logo parameter',
            start_date: '2030-12-15',
            start_time: '10:00',
            visibility: 1, // Club members only
            location: 'Test Location'
        };
        
        console.log('Creating event without logo...');
        const result = client.createEvent(eventData);
        
        if (result.success) {
            console.log('✅ SUCCESS: Event created without logo');
            console.log(`Event URL: ${result.eventUrl}`);
            console.log(`Event ID: ${result.event.id}`);
            console.log('\nPlease manually delete this test event from RWGPS');
            return result;
        } else {
            console.error('❌ FAILED: ' + result.error);
            throw new Error(result.error);
        }
        
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('❌ FATAL ERROR:', err.message);
        throw error;
    }
}

/**
 * Test createEvent with logo (multipart POST)
 * 
 * SETUP REQUIRED:
 * 1. Upload a test image to Google Drive
 * 2. Get the sharing link (File > Share > Copy link)
 * 3. Replace the logoUrl below with your Drive URL
 */
function testTask4DCreateEventWithLogo() {
    console.log('=== Task 4.D GAS Test: createEvent with logo ===');
    
    try {
        const globals = getGlobals();
        const client = new RWGPSClient(globals.RWGPSApiKey, globals.RWGPSAuthToken);
        
        // REPLACE THIS URL with your test image Drive URL
        const logoUrl = 'https://drive.google.com/file/d/YOUR_FILE_ID_HERE/view';
        
        if (logoUrl.includes('YOUR_FILE_ID_HERE')) {
            console.warn('⚠️  WARNING: Please update logoUrl in testTask4DCreateEventWithLogo()');
            console.warn('   Upload a test image to Drive and paste the sharing link');
            return;
        }
        
        // Create test event data
        const eventData = {
            name: `[TEST 4.D] Event with logo ${new Date().toISOString()}`,
            description: 'Task 4.D test - createEvent with logo parameter',
            start_date: '2030-12-15',
            start_time: '14:00',
            visibility: 1, // Club members only
            location: 'Test Location'
        };
        
        console.log('Creating event with logo...');
        console.log(`Logo URL: ${logoUrl}`);
        const result = client.createEvent(eventData, logoUrl);
        
        if (result.success) {
            console.log('✅ SUCCESS: Event created with logo');
            console.log(`Event URL: ${result.eventUrl}`);
            console.log(`Event ID: ${result.event.id}`);
            console.log('\nVerify logo appears on event page, then manually delete this test event');
            return result;
        } else {
            console.error('❌ FAILED: ' + result.error);
            throw new Error(result.error);
        }
        
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('❌ FATAL ERROR:', err.message);
        throw error;
    }
}

/**
 * Run both tests in sequence
 */
function testTask4DAll() {
    console.log('=== Running all Task 4.D tests ===\n');
    
    try {
        // Test 1: Without logo
        const result1 = testTask4DCreateEvent();
        console.log('\n' + '='.repeat(60) + '\n');
        
        // Test 2: With logo
        const result2 = testTask4DCreateEventWithLogo();
        
        console.log('\n=== All Task 4.D tests complete ===');
        console.log('Remember to manually delete test events from RWGPS');
        
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('\n=== Task 4.D tests FAILED ===');
        console.error(err.message);
        throw error;
    }
}
