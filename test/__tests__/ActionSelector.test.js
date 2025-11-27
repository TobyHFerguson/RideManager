// @ts-check

const { determineNextAction } = require('../../src/ActionSelector');

describe('ActionSelector', () => {
    describe('determineNextAction', () => {
        it('should return none when DTRT is disabled', () => {
            const rowState = { isScheduled: true, isPlanned: true };
            const result = determineNextAction(rowState, false);
            
            expect(result).toEqual({
                action: 'none',
                message: null
            });
        });

        it('should return update for scheduled ride when DTRT enabled', () => {
            const rowState = { isScheduled: true, isPlanned: true };
            const result = determineNextAction(rowState, true);
            
            expect(result).toEqual({
                action: 'update',
                message: 'Ride updated.'
            });
        });

        it('should return schedule for planned but unscheduled ride', () => {
            const rowState = { isScheduled: false, isPlanned: true };
            const result = determineNextAction(rowState, true);
            
            expect(result).toEqual({
                action: 'schedule',
                message: 'Ride scheduled.'
            });
        });

        it('should return none for unplanned ride', () => {
            const rowState = { isScheduled: false, isPlanned: false };
            const result = determineNextAction(rowState, true);
            
            expect(result).toEqual({
                action: 'none',
                message: null
            });
        });

        it('should prioritize scheduled over planned', () => {
            // If somehow both flags are true, scheduled takes precedence
            const rowState = { isScheduled: true, isPlanned: true };
            const result = determineNextAction(rowState, true);
            
            expect(result.action).toBe('update');
        });
    });
});
