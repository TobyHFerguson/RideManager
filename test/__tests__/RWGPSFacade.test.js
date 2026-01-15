/**
 * RWGPSFacade.test.js
 * 
 * Tests for RWGPS API Facade
 * Tests public methods with mocked adapter
 */

const RWGPSFacade = require('../../src/rwgpslib/RWGPSFacade');

describe('RWGPSFacade', () => {
    // =============================================
    // Test Setup - Mock Adapter
    // =============================================

    /**
     * Create a mock adapter for testing
     * @param {Object} overrides - Method overrides for specific tests
     */
    function createMockAdapter(overrides = {}) {
        return {
            login: jest.fn(() => ({ success: true })),
            isAuthenticated: jest.fn(() => true),
            fetchV1: jest.fn(() => ({
                getResponseCode: () => 200,
                getContentText: () => '{"event": {"id": 12345, "name": "Test Event"}}'
            })),
            fetchV1Multipart: jest.fn(() => ({
                getResponseCode: () => 200,
                getContentText: () => '{"event": {"id": 12345}}'
            })),
            fetchWeb: jest.fn(() => ({
                getResponseCode: () => 200,
                getContentText: () => '[]'
            })),
            fetchWebForm: jest.fn(() => ({
                getResponseCode: () => 200,
                getContentText: () => '[]',
                getAllHeaders: () => ({})
            })),
            clearSession: jest.fn(),
            ...overrides
        };
    }

    /**
     * Create mock globals
     */
    function createMockGlobals() {
        return {
            ROUTE_EXPIRY_DAYS: 30
        };
    }

    // =============================================
    // getEvent
    // =============================================

    describe('getEvent', () => {
        it('should return event data on success', () => {
            const mockAdapter = createMockAdapter();
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            
            const result = facade.getEvent('https://ridewithgps.com/events/12345');
            
            expect(result.success).toBe(true);
            expect(result.data).toEqual({ id: 12345, name: 'Test Event' });
            expect(mockAdapter.fetchV1).toHaveBeenCalledWith('GET', '/events/12345.json');
        });

        it('should return error for invalid URL', () => {
            const mockAdapter = createMockAdapter();
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            
            const result = facade.getEvent('invalid-url');
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid event URL');
        });

        it('should return error on API failure', () => {
            const mockAdapter = createMockAdapter({
                fetchV1: jest.fn(() => ({
                    getResponseCode: () => 404,
                    getContentText: () => '{"error": "Not found"}'
                }))
            });
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            
            const result = facade.getEvent('https://ridewithgps.com/events/99999');
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('404');
        });

        it('should handle response without event wrapper', () => {
            const mockAdapter = createMockAdapter({
                fetchV1: jest.fn(() => ({
                    getResponseCode: () => 200,
                    getContentText: () => '{"id": 12345, "name": "Unwrapped"}'
                }))
            });
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            
            const result = facade.getEvent('https://ridewithgps.com/events/12345');
            
            expect(result.success).toBe(true);
            expect(result.data.name).toBe('Unwrapped');
        });
    });

    // =============================================
    // editEvent
    // =============================================

    describe('editEvent', () => {
        it('should update event fields on success', () => {
            const mockAdapter = createMockAdapter({
                fetchV1: jest.fn(() => ({
                    getResponseCode: () => 200,
                    getContentText: () => '{"event": {"id": 12345, "name": "Updated Event"}}'
                }))
            });
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            
            const result = facade.editEvent(
                'https://ridewithgps.com/events/12345',
                { name: 'Updated Event' }
            );
            
            expect(result.success).toBe(true);
            expect(result.data.name).toBe('Updated Event');
            expect(mockAdapter.fetchV1).toHaveBeenCalledWith('PUT', '/events/12345.json', expect.any(Object));
        });

        it('should return error for invalid URL', () => {
            const mockAdapter = createMockAdapter();
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            
            const result = facade.editEvent('bad-url', { name: 'Test' });
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid');
        });

        it('should return error on API failure', () => {
            const mockAdapter = createMockAdapter({
                fetchV1: jest.fn(() => ({
                    getResponseCode: () => 403,
                    getContentText: () => '{"error": "Forbidden"}'
                }))
            });
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            
            const result = facade.editEvent(
                'https://ridewithgps.com/events/12345',
                { name: 'Test' }
            );
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('403');
        });

        it('should handle group change with tag swap', () => {
            const mockAdapter = createMockAdapter({
                fetchV1: jest.fn(() => ({
                    getResponseCode: () => 200,
                    getContentText: () => '{"event": {"id": 12345}}'
                })),
                fetchWebForm: jest.fn(() => ({
                    getResponseCode: () => 200,
                    getContentText: () => '{}'
                }))
            });
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            
            const result = facade.editEvent(
                'https://ridewithgps.com/events/12345',
                { name: 'Test' },
                { oldGroup: 'A', newGroup: 'B' }
            );
            
            expect(result.success).toBe(true);
            // Should have called tag operations
            expect(mockAdapter.fetchWebForm).toHaveBeenCalled();
        });

        it('should skip tag swap if groups are the same', () => {
            const mockAdapter = createMockAdapter();
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            
            const result = facade.editEvent(
                'https://ridewithgps.com/events/12345',
                { name: 'Test' },
                { oldGroup: 'A', newGroup: 'A' }
            );
            
            expect(result.success).toBe(true);
            // fetchWebForm should only be for main edit, not tag operations
            expect(mockAdapter.fetchWebForm).not.toHaveBeenCalled();
        });
    });

    // =============================================
    // createEvent
    // =============================================

    describe('createEvent', () => {
        it('should create event without logo', () => {
            const mockAdapter = createMockAdapter({
                fetchV1: jest.fn(() => ({
                    getResponseCode: () => 201,
                    getContentText: () => '{"event": {"id": 99999, "name": "New Event"}}'
                })),
                fetchWebForm: jest.fn(() => ({
                    getResponseCode: () => 200,
                    getContentText: () => '{}'
                }))
            });
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            
            const result = facade.createEvent({
                name: 'New Event',
                startDateTime: new Date('2025-01-15T09:00:00'),
                group: 'A'
            });
            
            expect(result.success).toBe(true);
            expect(result.data.id).toBe(99999);
            expect(mockAdapter.fetchV1).toHaveBeenCalledWith('POST', '/events.json', expect.any(Object));
        });

        it('should return error on API failure', () => {
            const mockAdapter = createMockAdapter({
                fetchV1: jest.fn(() => ({
                    getResponseCode: () => 422,
                    getContentText: () => '{"error": "Validation failed"}'
                }))
            });
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            
            const result = facade.createEvent({ name: 'Test' });
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('422');
        });

        it('should add group tag automatically', () => {
            const mockAdapter = createMockAdapter({
                fetchV1: jest.fn(() => ({
                    getResponseCode: () => 201,
                    getContentText: () => '{"event": {"id": 99999}}'
                })),
                fetchWebForm: jest.fn(() => ({
                    getResponseCode: () => 200,
                    getContentText: () => '{}'
                }))
            });
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            
            const result = facade.createEvent({
                name: 'Test',
                group: 'GroupA'
            });
            
            expect(result.success).toBe(true);
            // Should have called fetchWebForm for tag addition
            expect(mockAdapter.fetchWebForm).toHaveBeenCalledWith(
                'POST',
                '/events/batch_update_tags.json',
                expect.any(Object)
            );
        });

        it('should handle event creation without group (no tag)', () => {
            const mockAdapter = createMockAdapter({
                fetchV1: jest.fn(() => ({
                    getResponseCode: () => 201,
                    getContentText: () => '{"event": {"id": 99999}}'
                }))
            });
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            
            const result = facade.createEvent({ name: 'Test' }); // No group
            
            expect(result.success).toBe(true);
            // Should NOT have called fetchWebForm for tagging
            expect(mockAdapter.fetchWebForm).not.toHaveBeenCalled();
        });
    });

    // =============================================
    // Input Transformation (domain types → API format)
    // =============================================

    describe('input transformation', () => {
        it('should transform startDateTime to start_date and start_time', () => {
            const mockAdapter = createMockAdapter({
                fetchV1: jest.fn(() => ({
                    getResponseCode: () => 201,
                    getContentText: () => '{"event": {"id": 12345}}'
                })),
                fetchWebForm: jest.fn(() => ({
                    getResponseCode: () => 200,
                    getContentText: () => '{}'
                }))
            });
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            
            facade.createEvent({
                name: 'Test Event',
                startDateTime: new Date('2025-03-15T14:30:00'),
                group: 'A'
            });
            
            // Check the payload passed to fetchV1
            const payload = mockAdapter.fetchV1.mock.calls[0][2];
            expect(payload.event.start_date).toBe('2025-03-15');
            expect(payload.event.start_time).toBe('14:30');
        });

        it('should transform routeUrls to route_ids', () => {
            const mockAdapter = createMockAdapter({
                fetchV1: jest.fn(() => ({
                    getResponseCode: () => 201,
                    getContentText: () => '{"event": {"id": 12345}}'
                })),
                fetchWebForm: jest.fn(() => ({
                    getResponseCode: () => 200,
                    getContentText: () => '{}'
                }))
            });
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            
            facade.createEvent({
                name: 'Test Event',
                routeUrls: [
                    'https://ridewithgps.com/routes/11111',
                    'https://ridewithgps.com/routes/22222'
                ],
                group: 'A'
            });
            
            // Check the payload passed to fetchV1
            const payload = mockAdapter.fetchV1.mock.calls[0][2];
            expect(payload.event.route_ids).toEqual(['11111', '22222']);
        });

        it('should transform visibility members_only to friends_only', () => {
            const mockAdapter = createMockAdapter({
                fetchV1: jest.fn(() => ({
                    getResponseCode: () => 201,
                    getContentText: () => '{"event": {"id": 12345}}'
                })),
                fetchWebForm: jest.fn(() => ({
                    getResponseCode: () => 200,
                    getContentText: () => '{}'
                }))
            });
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            
            facade.createEvent({
                name: 'Test Event',
                visibility: 'members_only',
                group: 'A'
            });
            
            // Check the payload passed to fetchV1
            const payload = mockAdapter.fetchV1.mock.calls[0][2];
            expect(payload.event.visibility).toBe('friends_only');
        });

        it('should pass through public visibility unchanged', () => {
            const mockAdapter = createMockAdapter({
                fetchV1: jest.fn(() => ({
                    getResponseCode: () => 201,
                    getContentText: () => '{"event": {"id": 12345}}'
                })),
                fetchWebForm: jest.fn(() => ({
                    getResponseCode: () => 200,
                    getContentText: () => '{}'
                }))
            });
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            
            facade.createEvent({
                name: 'Test Event',
                visibility: 'public',
                group: 'A'
            });
            
            const payload = mockAdapter.fetchV1.mock.calls[0][2];
            expect(payload.event.visibility).toBe('public');
        });

        it('should warn and skip invalid route URLs', () => {
            const mockAdapter = createMockAdapter({
                fetchV1: jest.fn(() => ({
                    getResponseCode: () => 201,
                    getContentText: () => '{"event": {"id": 12345}}'
                })),
                fetchWebForm: jest.fn(() => ({
                    getResponseCode: () => 200,
                    getContentText: () => '{}'
                }))
            });
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            facade.createEvent({
                name: 'Test Event',
                routeUrls: [
                    'https://ridewithgps.com/routes/11111',
                    'not-a-valid-url',
                    'https://ridewithgps.com/routes/33333'
                ],
                group: 'A'
            });
            
            const payload = mockAdapter.fetchV1.mock.calls[0][2];
            expect(payload.event.route_ids).toEqual(['11111', '33333']);
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not-a-valid-url'));
            consoleSpy.mockRestore();
        });

        it('should transform timeZone to time_zone', () => {
            const mockAdapter = createMockAdapter({
                fetchV1: jest.fn(() => ({
                    getResponseCode: () => 201,
                    getContentText: () => '{"event": {"id": 12345}}'
                })),
                fetchWebForm: jest.fn(() => ({
                    getResponseCode: () => 200,
                    getContentText: () => '{}'
                }))
            });
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            
            facade.createEvent({
                name: 'Test Event',
                timeZone: 'America/Los_Angeles',
                group: 'A'
            });
            
            const payload = mockAdapter.fetchV1.mock.calls[0][2];
            expect(payload.event.time_zone).toBe('America/Los_Angeles');
        });
    });

    // =============================================
    // deleteEvents
    // =============================================

    describe('deleteEvents', () => {
        it('should delete single event successfully', () => {
            const mockAdapter = createMockAdapter({
                fetchV1: jest.fn(() => ({
                    getResponseCode: () => 200,
                    getContentText: () => '{}'
                }))
            });
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            
            const results = facade.deleteEvents(['https://ridewithgps.com/events/12345']);
            
            expect(results).toHaveLength(1);
            expect(results[0].success).toBe(true);
            expect(results[0].url).toBe('https://ridewithgps.com/events/12345');
        });

        it('should delete multiple events', () => {
            const mockAdapter = createMockAdapter({
                fetchV1: jest.fn(() => ({
                    getResponseCode: () => 200,
                    getContentText: () => '{}'
                }))
            });
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            
            const results = facade.deleteEvents([
                'https://ridewithgps.com/events/111',
                'https://ridewithgps.com/events/222'
            ]);
            
            expect(results).toHaveLength(2);
            expect(results[0].success).toBe(true);
            expect(results[1].success).toBe(true);
            expect(mockAdapter.fetchV1).toHaveBeenCalledTimes(2);
        });

        it('should handle partial failures', () => {
            let callCount = 0;
            const mockAdapter = createMockAdapter({
                fetchV1: jest.fn(() => {
                    callCount++;
                    if (callCount === 1) {
                        return {
                            getResponseCode: () => 200,
                            getContentText: () => '{}'
                        };
                    } else {
                        return {
                            getResponseCode: () => 404,
                            getContentText: () => '{"error": "Not found"}'
                        };
                    }
                })
            });
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            
            const results = facade.deleteEvents([
                'https://ridewithgps.com/events/111',
                'https://ridewithgps.com/events/222'
            ]);
            
            expect(results[0].success).toBe(true);
            expect(results[1].success).toBe(false);
            expect(results[1].error).toContain('404');
        });

        it('should handle invalid URLs', () => {
            const mockAdapter = createMockAdapter();
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            
            const results = facade.deleteEvents(['not-a-valid-url']);
            
            expect(results[0].success).toBe(false);
            expect(results[0].error).toContain('Invalid');
        });
    });

    // =============================================
    // importRoute
    // =============================================

    describe('importRoute', () => {
        it('should import route successfully', () => {
            const mockAdapter = createMockAdapter({
                fetchWebForm: jest.fn(() => ({
                    getResponseCode: () => 302,
                    getContentText: () => '',
                    getAllHeaders: () => ({
                        'Location': 'https://ridewithgps.com/routes/99999'
                    })
                }))
            });
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            
            const result = facade.importRoute({
                sourceUrl: 'https://ridewithgps.com/routes/12345',
                name: 'Copied Route'
            });
            
            expect(result.success).toBe(true);
            expect(result.routeUrl).toBe('https://ridewithgps.com/routes/99999');
        });

        it('should return error on login failure', () => {
            const mockAdapter = createMockAdapter({
                login: jest.fn(() => ({ success: false, error: 'Bad credentials' }))
            });
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            
            const result = facade.importRoute({
                sourceUrl: 'https://ridewithgps.com/routes/12345'
            });
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('Login failed');
        });

        it('should add group and expiry tags', () => {
            // Track fetchWebForm calls
            const fetchWebFormMock = jest.fn()
                // First call: copy route
                .mockReturnValueOnce({
                    getResponseCode: () => 302,
                    getContentText: () => '',
                    getAllHeaders: () => ({ 'Location': 'https://ridewithgps.com/routes/99999' })
                })
                // Second call: add tags
                .mockReturnValueOnce({
                    getResponseCode: () => 200,
                    getContentText: () => '{}'
                });

            const mockAdapter = createMockAdapter({
                fetchWebForm: fetchWebFormMock
            });
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            
            const result = facade.importRoute({
                sourceUrl: 'https://ridewithgps.com/routes/12345',
                group: 'GroupA',
                rideDate: new Date(2025, 0, 15)
            });
            
            expect(result.success).toBe(true);
            // Should have called for copy + tag
            expect(fetchWebFormMock).toHaveBeenCalledTimes(2);
        });

        it('should return error for invalid source URL', () => {
            const mockAdapter = createMockAdapter();
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            
            const result = facade.importRoute({
                sourceUrl: 'invalid-url'
            });
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid');
        });
    });

    // =============================================
    // getClubMembers
    // =============================================

    describe('getClubMembers', () => {
        it('should return members list', () => {
            const mockMembers = [
                { user_id: 1, name: 'Alice' },
                { user_id: 2, name: 'Bob' }
            ];
            const mockAdapter = createMockAdapter({
                fetchWeb: jest.fn(() => ({
                    getResponseCode: () => 200,
                    getContentText: () => JSON.stringify(mockMembers)
                }))
            });
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            
            const result = facade.getClubMembers();
            
            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
            expect(result.data[0].name).toBe('Alice');
        });

        it('should return error on API failure', () => {
            const mockAdapter = createMockAdapter({
                fetchWeb: jest.fn(() => ({
                    getResponseCode: () => 401,
                    getContentText: () => '{"error": "Unauthorized"}'
                }))
            });
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            
            const result = facade.getClubMembers();
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('401');
        });
    });

    // =============================================
    // Private Methods (tested through public API)
    // =============================================

    describe('_addEventTags', () => {
        it('should be called when creating event with group', () => {
            const fetchWebFormMock = jest.fn(() => ({
                getResponseCode: () => 200,
                getContentText: () => '{}'
            }));
            const mockAdapter = createMockAdapter({
                fetchV1: jest.fn(() => ({
                    getResponseCode: () => 201,
                    getContentText: () => '{"event": {"id": 99999}}'
                })),
                fetchWebForm: fetchWebFormMock
            });
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            
            facade.createEvent({ name: 'Test', group: 'GroupA' });
            
            // Should call batch_update_tags endpoint
            expect(fetchWebFormMock).toHaveBeenCalledWith(
                'POST',
                '/events/batch_update_tags.json',
                expect.objectContaining({
                    'tag_action': 'add',
                    'tags[0]': 'GroupA'
                })
            );
        });
    });

    describe('_removeEventTags', () => {
        it('should be called when changing group', () => {
            const fetchWebFormMock = jest.fn(() => ({
                getResponseCode: () => 200,
                getContentText: () => '{}'
            }));
            const mockAdapter = createMockAdapter({
                fetchV1: jest.fn(() => ({
                    getResponseCode: () => 200,
                    getContentText: () => '{"event": {"id": 12345}}'
                })),
                fetchWebForm: fetchWebFormMock
            });
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            
            facade.editEvent(
                'https://ridewithgps.com/events/12345',
                { name: 'Test' },
                { oldGroup: 'OldGroup', newGroup: 'NewGroup' }
            );
            
            // Should have called for both remove and add
            const calls = fetchWebFormMock.mock.calls;
            const removeCall = calls.find(c => c[2] && c[2]['tag_action'] === 'remove');
            const addCall = calls.find(c => c[2] && c[2]['tag_action'] === 'add');
            
            expect(removeCall).toBeDefined();
            expect(addCall).toBeDefined();
        });
    });

    // =============================================
    // Additional edge cases for coverage
    // =============================================

    describe('createEvent with logo', () => {
        it('should return error when logo download fails', () => {
            const mockAdapter = createMockAdapter();
            // Mock _downloadBlob to return null (simulating GAS not available or download failure)
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            
            const result = facade.createEvent(
                { name: 'Test Event' },
                'https://drive.google.com/some-logo.png'  // Logo URL provided
            );
            
            // In Jest environment, _downloadBlob returns null (UrlFetchApp not available)
            expect(result.success).toBe(false);
            expect(result.error).toContain('Failed to download logo');
        });
    });

    describe('editEvent with logo update', () => {
        it('should attempt logo update when newLogoUrl provided', () => {
            const mockAdapter = createMockAdapter({
                fetchV1: jest.fn(() => ({
                    getResponseCode: () => 200,
                    getContentText: () => '{"event": {"id": 12345}}'
                })),
                fetchWebForm: jest.fn(() => ({
                    getResponseCode: () => 200,
                    getContentText: () => '{}'
                }))
            });
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            
            // Spy on console.warn to verify logo failure is logged
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            const result = facade.editEvent(
                'https://ridewithgps.com/events/12345',
                { name: 'Test' },
                { oldGroup: 'A', newGroup: 'B', newLogoUrl: 'https://example.com/logo.png' }
            );
            
            expect(result.success).toBe(true);
            // Should warn about logo failure since _downloadBlob returns null in test env
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Logo update failed'));
            
            warnSpy.mockRestore();
        });
    });

    describe('tag operation failures', () => {
        it('should log warning when tag addition fails', () => {
            const mockAdapter = createMockAdapter({
                fetchV1: jest.fn(() => ({
                    getResponseCode: () => 201,
                    getContentText: () => '{"event": {"id": 99999}}'
                })),
                fetchWebForm: jest.fn(() => ({
                    getResponseCode: () => 500,  // Tag operation fails
                    getContentText: () => '{"error": "Server error"}'
                }))
            });
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            const result = facade.createEvent({ name: 'Test', group: 'A' });
            
            expect(result.success).toBe(true);  // Event created successfully
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Tag addition failed'));
            
            warnSpy.mockRestore();
        });
    });

    describe('importRoute edge cases', () => {
        it('should handle JSON response body with id', () => {
            const mockAdapter = createMockAdapter({
                fetchWebForm: jest.fn(() => ({
                    getResponseCode: () => 200,  // Not a redirect
                    getContentText: () => '{"id": 88888}',
                    getAllHeaders: () => ({})  // No Location header
                }))
            });
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            
            const result = facade.importRoute({
                sourceUrl: 'https://ridewithgps.com/routes/12345'
            });
            
            expect(result.success).toBe(true);
            expect(result.routeId).toBe('88888');
            expect(result.routeUrl).toBe('https://ridewithgps.com/routes/88888');
        });

        it('should return error on copy failure', () => {
            const mockAdapter = createMockAdapter({
                fetchWebForm: jest.fn(() => ({
                    getResponseCode: () => 403,
                    getContentText: () => '{"error": "Forbidden"}',
                    getAllHeaders: () => ({})
                }))
            });
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            
            const result = facade.importRoute({
                sourceUrl: 'https://ridewithgps.com/routes/12345'
            });
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('403');
        });

        it('should log warning when route tag addition fails', () => {
            const fetchWebFormMock = jest.fn()
                .mockReturnValueOnce({  // copy
                    getResponseCode: () => 302,
                    getContentText: () => '',
                    getAllHeaders: () => ({ 'Location': 'https://ridewithgps.com/routes/99999' })
                })
                .mockReturnValueOnce({  // tag - fails
                    getResponseCode: () => 500,
                    getContentText: () => '{"error": "Tag failed"}'
                });

            const mockAdapter = createMockAdapter({
                fetchWebForm: fetchWebFormMock
            });
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            const result = facade.importRoute({
                sourceUrl: 'https://ridewithgps.com/routes/12345',
                group: 'A'
            });
            
            expect(result.success).toBe(true);  // Copy succeeded
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Route tag addition failed'));
            
            warnSpy.mockRestore();
        });
    });

    describe('_addEventTags authentication', () => {
        it('should login if not authenticated', () => {
            const mockAdapter = createMockAdapter({
                isAuthenticated: jest.fn(() => false),  // Not authenticated
                login: jest.fn(() => ({ success: true })),
                fetchV1: jest.fn(() => ({
                    getResponseCode: () => 201,
                    getContentText: () => '{"event": {"id": 99999}}'
                })),
                fetchWebForm: jest.fn(() => ({
                    getResponseCode: () => 200,
                    getContentText: () => '{}'
                }))
            });
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            
            facade.createEvent({ name: 'Test', group: 'A' });
            
            // Should have called login before tag operation
            expect(mockAdapter.login).toHaveBeenCalled();
        });
        
        it('should return error when login fails during tag operation', () => {
            const mockAdapter = createMockAdapter({
                isAuthenticated: jest.fn(() => false),
                login: jest.fn(() => ({ success: false, error: 'Auth failed' })),
                fetchV1: jest.fn(() => ({
                    getResponseCode: () => 201,
                    getContentText: () => '{"event": {"id": 99999}}'
                }))
            });
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            const result = facade.createEvent({ name: 'Test', group: 'A' });
            
            // Event creation succeeds but tag fails due to auth
            expect(result.success).toBe(true);
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Tag addition failed'));
            
            warnSpy.mockRestore();
        });
    });

    describe('_removeEventTags authentication', () => {
        it('should login if not authenticated during group change', () => {
            const mockAdapter = createMockAdapter({
                isAuthenticated: jest.fn(() => false),
                login: jest.fn(() => ({ success: true })),
                fetchV1: jest.fn(() => ({
                    getResponseCode: () => 200,
                    getContentText: () => '{"event": {"id": 12345}}'
                })),
                fetchWebForm: jest.fn(() => ({
                    getResponseCode: () => 200,
                    getContentText: () => '{}'
                }))
            });
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            
            facade.editEvent(
                'https://ridewithgps.com/events/12345',
                { name: 'Test' },
                { oldGroup: 'A', newGroup: 'B' }
            );
            
            expect(mockAdapter.login).toHaveBeenCalled();
        });
    });

    describe('_addRouteTags authentication', () => {
        it('should login if not authenticated during route import', () => {
            let isAuthenticatedCalls = 0;
            const mockAdapter = createMockAdapter({
                isAuthenticated: jest.fn(() => {
                    isAuthenticatedCalls++;
                    // Return false for first call (route tag check), true for others
                    return isAuthenticatedCalls > 1;
                }),
                login: jest.fn(() => ({ success: true })),
                fetchWebForm: jest.fn()
                    .mockReturnValueOnce({  // copy
                        getResponseCode: () => 302,
                        getContentText: () => '',
                        getAllHeaders: () => ({ 'Location': 'https://ridewithgps.com/routes/99999' })
                    })
                    .mockReturnValueOnce({  // tag
                        getResponseCode: () => 200,
                        getContentText: () => '{}'
                    })
            });
            const facade = new RWGPSFacade(mockAdapter, createMockGlobals());
            
            facade.importRoute({
                sourceUrl: 'https://ridewithgps.com/routes/12345',
                group: 'A'
            });
            
            // Login should be called for route tag operation when not authenticated
            expect(mockAdapter.login).toHaveBeenCalled();
        });
    });
});
