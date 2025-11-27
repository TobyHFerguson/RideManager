/**
 * testRetryQueue - Test suite for RetryQueue module
 * 
 * Type definitions for RetryQueue testing functions.
 * See file header comment for detailed function documentation.
 */

/**
 * Main test orchestrator - runs through complete retry scenario
 * START HERE for comprehensive testing
 * 
 * Tests:
 * - Queue item creation
 * - Retry timing (5min immediate, then hourly)
 * - Failure tracking and notifications
 * - 48-hour cutoff behavior
 * 
 * Contains 3 private helper functions (not visible in GAS Run dropdown)
 */
declare function testRetryQueueFullScenario(): void;

/**
 * Test successful retry (disable failure mode)
 * Run this AFTER testRetryQueueFullScenario() to test the success path
 */
declare function testSuccessfulRetry(): void;

/**
 * Test the 48-hour cutoff behavior
 * Requires existing queue items from testRetryQueueFullScenario()
 */
declare function testCutoffBehavior(): void;

/**
 * Test multiple items in queue simultaneously
 * Creates 3 test operations and shows queue status
 */
declare function testMultipleQueueItems(): void;

/**
 * Manually process queue (for testing trigger behavior)
 * Triggers retry processing on existing queue items
 */
declare function manualProcessQueue(): void;

/**
 * Clean up test data
 * Clears queue, disables test mode, and removes triggers
 * Run this before/after tests or when things get stuck
 */
declare function cleanupRetryQueueTest(): void;

/**
 * Inspect detailed queue information
 * Shows all queue items with full details
 */
declare function inspectQueueDetails(): void;

export {
    testRetryQueueFullScenario,
    testSuccessfulRetry,
    testCutoffBehavior,
    testMultipleQueueItems,
    manualProcessQueue,
    cleanupRetryQueueTest,
    inspectQueueDetails
};
