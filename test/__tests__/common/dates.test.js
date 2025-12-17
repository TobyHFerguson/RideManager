const dates = require('../../../src/common/dates');

describe('dates', () => {
    describe('convert', () => {
        it('should convert Date object to new Date instance', () => {
            const original = new Date('2025-01-15T10:30:00');
            const result = dates.convert(original);
            
            expect(result).toBeInstanceOf(Date);
            expect(result).not.toBe(original); // Should be a new instance
            expect(result.getTime()).toBe(original.getTime());
        });

        it('should convert array [year, month, day] to Date', () => {
            const result = dates.convert([2025, 0, 15]); // January is 0
            
            expect(result).toBeInstanceOf(Date);
            expect(result.getFullYear()).toBe(2025);
            expect(result.getMonth()).toBe(0);
            expect(result.getDate()).toBe(15);
        });

        it('should convert string to Date', () => {
            const result = dates.convert('2025-01-15T10:30:00');
            
            expect(result).toBeInstanceOf(Date);
            expect(result.getFullYear()).toBe(2025);
            expect(result.getMonth()).toBe(0);
            expect(result.getDate()).toBe(15);
        });

        it('should convert timestamp number to Date', () => {
            const timestamp = new Date('2025-01-15T10:30:00').getTime();
            const result = dates.convert(timestamp);
            
            expect(result).toBeInstanceOf(Date);
            expect(result.getTime()).toBe(timestamp);
        });

        it('should convert object with year/month/date to Date', () => {
            const result = dates.convert({ year: 2025, month: 0, date: 15 });
            
            expect(result).toBeInstanceOf(Date);
            expect(result.getFullYear()).toBe(2025);
            expect(result.getMonth()).toBe(0);
            expect(result.getDate()).toBe(15);
        });

        it('should return Invalid Date for invalid string', () => {
            const result = dates.convert('not a date');
            
            expect(result).toBeInstanceOf(Date);
            expect(result.toString()).toBe('Invalid Date');
        });

        it('should return NaN for invalid number', () => {
            const result = dates.convert(NaN);
            
            expect(result).toBeNaN();
        });

        it('should return NaN for null', () => {
            const result = dates.convert(null);
            
            expect(result).toBeNaN();
        });
    });

    describe('weekday', () => {
        it('should return weekday abbreviation for Date', () => {
            const date = new Date('2025-01-15T10:30:00'); // Wednesday
            const result = dates.weekday(date);
            
            expect(result).toBe('Wed');
        });

        it('should return weekday abbreviation for string', () => {
            const result = dates.weekday('2025-01-15T10:30:00');
            
            expect(result).toBe('Wed');
        });

        it('should return NaN for invalid date', () => {
            const result = dates.weekday('invalid');
            
            expect(result).toBeNaN();
        });
    });

    describe('MMDD', () => {
        it('should format date as MM/DD', () => {
            const date = new Date('2025-01-15T10:30:00');
            const result = dates.MMDD(date);
            
            expect(result).toBe('1/15');
        });

        it('should handle string input', () => {
            const result = dates.MMDD('2025-12-25T10:30:00');
            
            expect(result).toBe('12/25');
        });

        it('should return NaN for invalid date', () => {
            const result = dates.MMDD('invalid');
            
            expect(result).toBeNaN();
        });
    });

    describe('MMDDYYYY', () => {
        it('should format date as MM/DD/YYYY', () => {
            const date = new Date('2025-01-15T10:30:00');
            const result = dates.MMDDYYYY(date);
            
            expect(result).toBe('1/15/2025');
        });

        it('should handle string input', () => {
            const result = dates.MMDDYYYY('2025-12-25T10:30:00');
            
            expect(result).toBe('12/25/2025');
        });

        it('should return NaN for invalid date', () => {
            const result = dates.MMDDYYYY('invalid');
            
            expect(result).toBeNaN();
        });
    });

    describe('T24', () => {
        it('should format time in 24-hour format', () => {
            const date = new Date('2025-01-15T14:30:00');
            const result = dates.T24(date);
            
            expect(result).toMatch(/14:30/);
        });

        it('should handle morning time', () => {
            const date = new Date('2025-01-15T09:15:00');
            const result = dates.T24(date);
            
            expect(result).toMatch(/9:15/);
        });

        it('should return NaN for invalid date', () => {
            const result = dates.T24('invalid');
            
            expect(result).toBeNaN();
        });
    });

    describe('T12', () => {
        it('should format time in 12-hour format with AM/PM', () => {
            const date = new Date('2025-01-15T14:30:00');
            const result = dates.T12(date);
            
            expect(result).toMatch(/2:30.*PM/);
        });

        it('should handle morning time with AM', () => {
            const date = new Date('2025-01-15T09:15:00');
            const result = dates.T12(date);
            
            expect(result).toMatch(/9:15.*AM/);
        });

        it('should return NaN for invalid date', () => {
            const result = dates.T12('invalid');
            
            expect(result).toBeNaN();
        });
    });

    describe('add', () => {
        it('should add positive days to date', () => {
            const date = new Date('2025-01-15T10:30:00');
            const result = dates.add(date, 5);
            
            expect(result).toBeInstanceOf(Date);
            expect(result.getDate()).toBe(20);
            expect(result.getMonth()).toBe(0);
            expect(result.getFullYear()).toBe(2025);
        });

        it('should subtract days with negative number', () => {
            const date = new Date('2025-01-15T10:30:00');
            const result = dates.add(date, -5);
            
            expect(result).toBeInstanceOf(Date);
            expect(result.getDate()).toBe(10);
            expect(result.getMonth()).toBe(0);
        });

        it('should handle month boundary', () => {
            const date = new Date('2025-01-30T10:30:00');
            const result = dates.add(date, 5);
            
            expect(result).toBeInstanceOf(Date);
            expect(result.getDate()).toBe(4);
            expect(result.getMonth()).toBe(1); // February
        });

        it('should not modify original date', () => {
            const original = new Date('2025-01-15T10:30:00');
            const originalTime = original.getTime();
            
            dates.add(original, 5);
            
            expect(original.getTime()).toBe(originalTime);
        });

        it('should handle string input', () => {
            const result = dates.add('2025-01-15T10:30:00', 3);
            
            expect(result).toBeInstanceOf(Date);
            expect(result.getDate()).toBe(18);
        });

        it('should return NaN for invalid date', () => {
            const result = dates.add('invalid', 5);
            
            expect(result).toBeNaN();
        });
    });

    describe('addMinutes', () => {
        it('should add positive minutes to date', () => {
            const date = new Date('2025-01-15T10:30:00');
            const result = dates.addMinutes(date, 45);
            
            expect(result).toBeInstanceOf(Date);
            expect(result.getHours()).toBe(11);
            expect(result.getMinutes()).toBe(15);
        });

        it('should subtract minutes with negative number', () => {
            const date = new Date('2025-01-15T10:30:00');
            const result = dates.addMinutes(date, -15);
            
            expect(result).toBeInstanceOf(Date);
            expect(result.getHours()).toBe(10);
            expect(result.getMinutes()).toBe(15);
        });

        it('should handle hour boundary', () => {
            const date = new Date('2025-01-15T10:50:00');
            const result = dates.addMinutes(date, 20);
            
            expect(result).toBeInstanceOf(Date);
            expect(result.getHours()).toBe(11);
            expect(result.getMinutes()).toBe(10);
        });

        it('should handle day boundary', () => {
            const date = new Date('2025-01-15T23:50:00');
            const result = dates.addMinutes(date, 20);
            
            expect(result).toBeInstanceOf(Date);
            expect(result.getDate()).toBe(16);
            expect(result.getHours()).toBe(0);
            expect(result.getMinutes()).toBe(10);
        });

        it('should not modify original date', () => {
            const original = new Date('2025-01-15T10:30:00');
            const originalTime = original.getTime();
            
            dates.addMinutes(original, 30);
            
            expect(original.getTime()).toBe(originalTime);
        });

        it('should handle string input', () => {
            const result = dates.addMinutes('2025-01-15T10:30:00', 15);
            
            expect(result).toBeInstanceOf(Date);
            expect(result.getMinutes()).toBe(45);
        });

        it('should return NaN for invalid date', () => {
            const result = dates.addMinutes('invalid', 30);
            
            expect(result).toBeNaN();
        });
    });
});
