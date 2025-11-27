/**
 * testEvent - Test suite for Event module
 * 
 * Type definitions for Event module testing functions.
 */

/**
 * Assert that actual equals expected
 * @private
 * @param actual - Actual value
 * @param expected - Expected value
 * @param message - Error message if assertion fails
 * @throws Error if assertion fails
 */
declare function assertEqual_(actual: any, expected: any, message: string): void;

/**
 * Assert that condition is true
 * @private
 * @param condition - Condition to check
 * @param message - Error message if assertion fails
 * @throws Error if assertion fails
 */
declare function assertTrue_(condition: boolean, message: string): void;

/**
 * Assert that condition is false
 * @private
 * @param condition - Condition to check
 * @param message - Error message if assertion fails
 * @throws Error if assertion fails
 */
declare function assertFalse_(condition: boolean, message: string): void;

/**
 * Run Event module test suite
 * Tests managedEventName, extractStartDetails, and other Event methods
 */
declare function runTestEvent(): void;

export { runTestEvent };
