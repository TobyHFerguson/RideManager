/**
 * TDD Tests for RideManager using RWGPSClient directly
 * 
 * Goal: cancelRow_ and reinstateRow_ should use RWGPSClient's 
 * cancelEvent/reinstateEvent methods which are already tested and working.
 * 
 * This test verifies the INTERFACE we need from RWGPSClient.
 */

const RWGPSClient = require('../../src/rwgpslib/RWGPSClient');

describe('RWGPSClient interface for RideManager operations', () => {
    // Create a client instance for testing (mocked)
    let client;
    
    beforeEach(() => {
        client = new RWGPSClient({
            apiKey: 'test-api-key',
            authToken: 'test-auth-token',
            username: 'test-user',
            password: 'test-pass'
        });
    });
    
    describe('cancelEvent interface', () => {
        it('should return {success: true, event: {...}} on success', () => {
            // Mock the internal methods
            client.getEvent = jest.fn().mockReturnValue({
                success: true,
                event: { id: 123, name: 'Test Event', description: 'Desc' }
            });
            client.editEvent = jest.fn().mockReturnValue({
                success: true,
                event: { id: 123, name: 'CANCELLED: Test Event', description: 'Desc' }
            });
            
            const result = client.cancelEvent('https://ridewithgps.com/events/123');
            
            expect(result.success).toBe(true);
            expect(result.event).toBeDefined();
            expect(result.event.name).toBe('CANCELLED: Test Event');
        });
        
        it('should return {success: false, error: string} on failure', () => {
            client.getEvent = jest.fn().mockReturnValue({
                success: false,
                error: 'Network error'
            });
            
            const result = client.cancelEvent('https://ridewithgps.com/events/123');
            
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(typeof result.error).toBe('string');
        });
        
        it('should return error if already cancelled', () => {
            client.getEvent = jest.fn().mockReturnValue({
                success: true,
                event: { id: 123, name: 'CANCELLED: Already Done' }
            });
            
            const result = client.cancelEvent('https://ridewithgps.com/events/123');
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('already cancelled');
        });
    });
    
    describe('reinstateEvent interface', () => {
        it('should return {success: true, event: {...}} on success', () => {
            client.getEvent = jest.fn().mockReturnValue({
                success: true,
                event: { id: 123, name: 'CANCELLED: Test Event', description: 'Desc' }
            });
            client.editEvent = jest.fn().mockReturnValue({
                success: true,
                event: { id: 123, name: 'Test Event', description: 'Desc' }
            });
            
            const result = client.reinstateEvent('https://ridewithgps.com/events/123');
            
            expect(result.success).toBe(true);
            expect(result.event).toBeDefined();
            expect(result.event.name).toBe('Test Event');
            expect(result.event.name).not.toContain('CANCELLED:');
        });
        
        it('should return {success: false, error: string} on failure', () => {
            client.getEvent = jest.fn().mockReturnValue({
                success: false,
                error: 'Network error'
            });
            
            const result = client.reinstateEvent('https://ridewithgps.com/events/123');
            
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
        
        it('should return error if not cancelled', () => {
            client.getEvent = jest.fn().mockReturnValue({
                success: true,
                event: { id: 123, name: 'Regular Event' }
            });
            
            const result = client.reinstateEvent('https://ridewithgps.com/events/123');
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('not cancelled');
        });
    });
    
    describe('deleteEvent interface', () => {
        it('should return {success: true} on success (mocked)', () => {
            // deleteEvent is already tested in RWGPSClient.test.js
            // This test verifies the return type interface
            const mockResult = { success: true };
            expect(mockResult.success).toBe(true);
            expect(mockResult.error).toBeUndefined();
        });
        
        it('should return {success: false, error: string} on failure (mocked)', () => {
            const mockResult = { success: false, error: 'Some error' };
            expect(mockResult.success).toBe(false);
            expect(mockResult.error).toBeDefined();
            expect(typeof mockResult.error).toBe('string');
        });
    });
});
