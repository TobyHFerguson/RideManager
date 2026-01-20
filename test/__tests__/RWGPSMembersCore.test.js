const RWGPSMembersCore = require('../../src/RWGPSMembersCore');

describe('RWGPSMembersCore', () => {
    describe('transformMembersData', () => {
        it('should transform member with full name', () => {
            const input = [
                {
                    id: 799,
                    user_id: 131258,
                    user: {
                        id: 131258,
                        first_name: 'John',
                        last_name: 'Doe'
                    }
                }
            ];

            const result = RWGPSMembersCore.transformMembersData(input);

            expect(result).toEqual([{ Name: 'John Doe', UserID: 131258 }]);
        });

        it('should handle multiple members', () => {
            const input = [
                {
                    user: { id: 100, first_name: 'John', last_name: 'Doe' }
                },
                {
                    user: { id: 200, first_name: 'Jane', last_name: 'Smith' }
                },
                {
                    user: { id: 300, first_name: 'Bob', last_name: 'Johnson' }
                }
            ];

            const result = RWGPSMembersCore.transformMembersData(input);

            expect(result).toEqual([
                { Name: 'Bob Johnson', UserID: 300 },
                { Name: 'Jane Smith', UserID: 200 },
                { Name: 'John Doe', UserID: 100 }
            ]);
        });

        it('should handle member with only first name', () => {
            const input = [
                {
                    user: { id: 100, first_name: 'John', last_name: null }
                }
            ];

            const result = RWGPSMembersCore.transformMembersData(input);

            expect(result).toEqual([{ Name: 'John', UserID: 100 }]);
        });

        it('should handle member with only last name', () => {
            const input = [
                {
                    user: { id: 100, first_name: null, last_name: 'Doe' }
                }
            ];

            const result = RWGPSMembersCore.transformMembersData(input);

            expect(result).toEqual([{ Name: 'Doe', UserID: 100 }]);
        });

        it('should handle member with missing first_name field', () => {
            const input = [
                {
                    user: { id: 100, last_name: 'Doe' }
                }
            ];

            const result = RWGPSMembersCore.transformMembersData(input);

            expect(result).toEqual([{ Name: 'Doe', UserID: 100 }]);
        });

        it('should handle member with missing last_name field', () => {
            const input = [
                {
                    user: { id: 100, first_name: 'John' }
                }
            ];

            const result = RWGPSMembersCore.transformMembersData(input);

            expect(result).toEqual([{ Name: 'John', UserID: 100 }]);
        });

        it('should handle member with both names null', () => {
            const input = [
                {
                    user: { id: 100, first_name: null, last_name: null }
                }
            ];

            const result = RWGPSMembersCore.transformMembersData(input);

            expect(result).toEqual([{ Name: '', UserID: 100 }]);
        });

        it('should handle member with both names missing', () => {
            const input = [
                {
                    user: { id: 100 }
                }
            ];

            const result = RWGPSMembersCore.transformMembersData(input);

            expect(result).toEqual([{ Name: '', UserID: 100 }]);
        });

        it('should handle empty array', () => {
            const result = RWGPSMembersCore.transformMembersData([]);

            expect(result).toEqual([]);
        });

        it('should handle names with extra spaces', () => {
            const input = [
                {
                    user: { id: 100, first_name: '  John  ', last_name: '  Doe  ' }
                }
            ];

            const result = RWGPSMembersCore.transformMembersData(input);

            // trim() removes leading/trailing spaces but preserves internal spaces
            expect(result).toEqual([{ Name: 'John     Doe', UserID: 100 }]);
        });

        it('should throw error if input is not an array', () => {
            expect(() => {
                RWGPSMembersCore.transformMembersData('not an array');
            }).toThrow('Members data must be an array');

            expect(() => {
                RWGPSMembersCore.transformMembersData({ not: 'array' });
            }).toThrow('Members data must be an array');

            expect(() => {
                RWGPSMembersCore.transformMembersData(null);
            }).toThrow('Members data must be an array');

            expect(() => {
                RWGPSMembersCore.transformMembersData(undefined);
            }).toThrow('Members data must be an array');
        });

        it('should throw error if member is invalid', () => {
            expect(() => {
                RWGPSMembersCore.transformMembersData([null]);
            }).toThrow('Invalid member object');

            expect(() => {
                RWGPSMembersCore.transformMembersData(['string']);
            }).toThrow('Invalid member object');

            expect(() => {
                RWGPSMembersCore.transformMembersData([123]);
            }).toThrow('Invalid member object');
        });

        it('should throw error if member missing user object', () => {
            expect(() => {
                RWGPSMembersCore.transformMembersData([{ id: 123 }]);
            }).toThrow('Member missing user object');

            expect(() => {
                RWGPSMembersCore.transformMembersData([{ user: null }]);
            }).toThrow('Member missing user object');

            expect(() => {
                RWGPSMembersCore.transformMembersData([{ user: 'string' }]);
            }).toThrow('Member missing user object');
        });

        it('should handle real RWGPS API response format', () => {
            const input = [
                {
                    id: 799,
                    user_id: 131258,
                    club_id: 47,
                    manages_routes: true,
                    manages_members: true,
                    manages_billing: true,
                    admin: true,
                    approved_at: '2015-10-05T08:11:05-07:00',
                    created_at: '2015-10-05T08:11:05-07:00',
                    updated_at: '2015-10-05T08:11:05-07:00',
                    email_club_updates: true,
                    first_name: null,
                    last_name: null,
                    email: null,
                    active: true,
                    tag_names: [],
                    user: {
                        id: 131258,
                        first_name: 'Santa Cruz',
                        last_name: 'Cycling Club',
                        display_name: 'SCCCC',
                        real_email: 'rides@santacruzcycling.org',
                        location: 'Aptos, California'
                    }
                }
            ];

            const result = RWGPSMembersCore.transformMembersData(input);

            expect(result).toEqual([{ Name: 'Santa Cruz Cycling Club', UserID: 131258 }]);
        });
    });

    describe('validateApiResponse', () => {
        it('should validate correct API response', () => {
            const data = [
                {
                    id: 799,
                    user: {
                        id: 131258,
                        first_name: 'John',
                        last_name: 'Doe'
                    }
                }
            ];

            expect(RWGPSMembersCore.validateApiResponse(data)).toBe(true);
        });

        it('should validate empty array', () => {
            expect(RWGPSMembersCore.validateApiResponse([])).toBe(true);
        });

        it('should throw error for null', () => {
            expect(() => {
                RWGPSMembersCore.validateApiResponse(null);
            }).toThrow('API response is null or undefined');
        });

        it('should throw error for undefined', () => {
            expect(() => {
                RWGPSMembersCore.validateApiResponse(undefined);
            }).toThrow('API response is null or undefined');
        });

        it('should throw error if not an array', () => {
            expect(() => {
                RWGPSMembersCore.validateApiResponse('string');
            }).toThrow('API response must be an array');

            expect(() => {
                RWGPSMembersCore.validateApiResponse({ not: 'array' });
            }).toThrow('API response must be an array');

            expect(() => {
                RWGPSMembersCore.validateApiResponse(123);
            }).toThrow('API response must be an array');
        });

        it('should throw error if member is invalid', () => {
            expect(() => {
                RWGPSMembersCore.validateApiResponse([null]);
            }).toThrow('API response contains invalid member data');

            expect(() => {
                RWGPSMembersCore.validateApiResponse(['string']);
            }).toThrow('API response contains invalid member data');
        });

        it('should throw error if member missing user object', () => {
            expect(() => {
                RWGPSMembersCore.validateApiResponse([{ id: 123 }]);
            }).toThrow('API response member missing user object');

            expect(() => {
                RWGPSMembersCore.validateApiResponse([{ user: null }]);
            }).toThrow('API response member missing user object');

            expect(() => {
                RWGPSMembersCore.validateApiResponse([{ user: 'string' }]);
            }).toThrow('API response member missing user object');
        });
    });

    describe('filterEmptyNames', () => {
        it('should keep members with non-empty names', () => {
            const input = [
                { Name: 'John Doe' },
                { Name: 'Jane Smith' }
            ];

            const result = RWGPSMembersCore.filterEmptyNames(input);

            expect(result).toEqual([
                { Name: 'John Doe' },
                { Name: 'Jane Smith' }
            ]);
        });

        it('should filter out members with empty string names', () => {
            const input = [
                { Name: 'John Doe' },
                { Name: '' },
                { Name: 'Jane Smith' }
            ];

            const result = RWGPSMembersCore.filterEmptyNames(input);

            expect(result).toEqual([
                { Name: 'John Doe' },
                { Name: 'Jane Smith' }
            ]);
        });

        it('should filter out members with whitespace-only names', () => {
            const input = [
                { Name: 'John Doe' },
                { Name: '   ' },
                { Name: '\t\n' },
                { Name: 'Jane Smith' }
            ];

            const result = RWGPSMembersCore.filterEmptyNames(input);

            expect(result).toEqual([
                { Name: 'John Doe' },
                { Name: 'Jane Smith' }
            ]);
        });

        it('should filter out members with null names', () => {
            const input = [
                { Name: 'John Doe' },
                { Name: null },
                { Name: 'Jane Smith' }
            ];

            const result = RWGPSMembersCore.filterEmptyNames(input);

            expect(result).toEqual([
                { Name: 'John Doe' },
                { Name: 'Jane Smith' }
            ]);
        });

        it('should filter out members with undefined names', () => {
            const input = [
                { Name: 'John Doe' },
                { Name: undefined },
                { Name: 'Jane Smith' }
            ];

            const result = RWGPSMembersCore.filterEmptyNames(input);

            expect(result).toEqual([
                { Name: 'John Doe' },
                { Name: 'Jane Smith' }
            ]);
        });

        it('should filter out invalid member objects', () => {
            const input = [
                { Name: 'John Doe' },
                null,
                'string',
                { Name: 'Jane Smith' },
                123
            ];

            const result = RWGPSMembersCore.filterEmptyNames(input);

            expect(result).toEqual([
                { Name: 'John Doe' },
                { Name: 'Jane Smith' }
            ]);
        });

        it('should handle empty array', () => {
            const result = RWGPSMembersCore.filterEmptyNames([]);

            expect(result).toEqual([]);
        });

        it('should return empty array when all names are empty', () => {
            const input = [
                { Name: '' },
                { Name: '  ' },
                { Name: null }
            ];

            const result = RWGPSMembersCore.filterEmptyNames(input);

            expect(result).toEqual([]);
        });

        it('should throw error if input is not an array', () => {
            expect(() => {
                RWGPSMembersCore.filterEmptyNames('not an array');
            }).toThrow('Members must be an array');

            expect(() => {
                RWGPSMembersCore.filterEmptyNames(null);
            }).toThrow('Members must be an array');

            expect(() => {
                RWGPSMembersCore.filterEmptyNames(undefined);
            }).toThrow('Members must be an array');
        });

        it('should filter out members with non-string name types', () => {
            const input = [
                { Name: 'John Doe' },
                { Name: 123 },
                { Name: true },
                { Name: {} },
                { Name: 'Jane Smith' }
            ];

            const result = RWGPSMembersCore.filterEmptyNames(input);

            expect(result).toEqual([
                { Name: 'John Doe' },
                { Name: 'Jane Smith' }
            ]);
        });
    });
});
