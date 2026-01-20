/**
 * RWGPSClientCore.test.js
 * 
 * Tests for pure JavaScript business logic (no GAS dependencies)
 */

const RWGPSClientCore = require('../../src/rwgpslib/RWGPSClientCore');

describe('RWGPSClientCore', () => {
    describe('parseEventUrl', () => {
        it('should parse standard event URL', () => {
            const url = 'https://ridewithgps.com/events/12345';
            const result = RWGPSClientCore.parseEventUrl(url);
            
            expect(result.eventId).toBe('12345');
            expect(result.fullUrl).toBe(url);
        });

        it('should handle URL with trailing slash', () => {
            const url = 'https://ridewithgps.com/events/12345/';
            const result = RWGPSClientCore.parseEventUrl(url);
            
            expect(result.eventId).toBe('12345');
        });

        it('should throw on invalid URL', () => {
            expect(() => {
                RWGPSClientCore.parseEventUrl('not-a-url');
            }).toThrow();
        });

        it('should throw on non-string input', () => {
            expect(() => {
                RWGPSClientCore.parseEventUrl(null);
            }).toThrow('Invalid event URL: must be a non-empty string');
        });

        it('should throw on empty string', () => {
            expect(() => {
                RWGPSClientCore.parseEventUrl('');
            }).toThrow('Invalid event URL: must be a non-empty string');
        });
    });

    describe('extractEventId', () => {
        it('should extract ID from standard URL', () => {
            const id = RWGPSClientCore.extractEventId('https://ridewithgps.com/events/12345');
            expect(id).toBe('12345');
        });

        it('should extract ID from URL with query params', () => {
            const id = RWGPSClientCore.extractEventId('https://ridewithgps.com/events/12345?foo=bar');
            expect(id).toBe('12345');
        });

        it('should return null for non-event URL', () => {
            const id = RWGPSClientCore.extractEventId('https://ridewithgps.com/routes/12345');
            expect(id).toBeNull();
        });

        it('should return null for null input', () => {
            const id = RWGPSClientCore.extractEventId(null);
            expect(id).toBeNull();
        });

        it('should return null for empty string', () => {
            const id = RWGPSClientCore.extractEventId('');
            expect(id).toBeNull();
        });
    });

    describe('buildRequestOptions', () => {
        it('should build GET request options', () => {
            const options = RWGPSClientCore.buildRequestOptions('get');
            
            expect(options.method).toBe('get');
            expect(options.muteHttpExceptions).toBe(true);
            expect(options.headers).toEqual({ 'Content-Type': 'application/json' });
            expect(options.payload).toBeUndefined();
        });

        it('should build POST request with payload', () => {
            const payload = { name: 'Test Event' };
            const options = RWGPSClientCore.buildRequestOptions('post', payload);
            
            expect(options.method).toBe('post');
            expect(options.payload).toBe(JSON.stringify(payload));
        });

        it('should merge additional headers', () => {
            const options = RWGPSClientCore.buildRequestOptions('get', null, {
                'Authorization': 'Basic abc123'
            });
            
            expect(options.headers['Content-Type']).toBe('application/json');
            expect(options.headers['Authorization']).toBe('Basic abc123');
        });
    });

    describe('buildBasicAuthHeader', () => {
        it('should build Basic Auth header', () => {
            const header = RWGPSClientCore.buildBasicAuthHeader('mykey', 'mytoken');
            
            // Should be Base64 encoded "mykey:mytoken"
            expect(header).toMatch(/^Basic /);
            expect(header).toBe('Basic ' + Buffer.from('mykey:mytoken').toString('base64'));
        });
    });

    describe('validateEventData', () => {
        it('should validate complete event data', () => {
            const eventData = {
                name: 'Test Ride',
                starts_at: '2026-01-15T09:00:00',
                route_id: '12345'
            };
            
            const result = RWGPSClientCore.validateEventData(eventData);
            
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject event without name', () => {
            const eventData = {
                starts_at: '2026-01-15T09:00:00'
            };
            
            const result = RWGPSClientCore.validateEventData(eventData);
            
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Event name is required');
        });

        it('should reject event without start time', () => {
            const eventData = {
                name: 'Test Ride'
            };
            
            const result = RWGPSClientCore.validateEventData(eventData);
            
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Start time is required');
        });

        it('should allow missing route_id (for cancelled events)', () => {
            const eventData = {
                name: 'CANCELLED: Test Ride',
                starts_at: '2026-01-15T09:00:00'
            };
            
            const result = RWGPSClientCore.validateEventData(eventData);
            
            expect(result.valid).toBe(true);
        });

        // Task 4.F: Cover lines 122-123 (null/undefined check)
        it('should reject null event data', () => {
            const result = RWGPSClientCore.validateEventData(null);
            
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Event data is required');
        });

        it('should reject undefined event data', () => {
            const result = RWGPSClientCore.validateEventData(undefined);
            
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Event data is required');
        });
    });

    describe('buildGetEventOptions', () => {
        // Task 4.F: Cover buildGetEventOptions method
        it('should build GET event request options with session cookie', () => {
            const sessionCookie = 'test-session-cookie';
            const options = RWGPSClientCore.buildGetEventOptions(sessionCookie);

            expect(options.method).toBe('GET');
            expect(options.headers.Accept).toBe('application/json');
            expect(options.headers.Cookie).toBe('test-session-cookie');
            expect(options.headers['User-Agent']).toContain('Mozilla');
            expect(options.muteHttpExceptions).toBe(true);
        });
    });

    describe('buildEditEventOptions', () => {
        // Task 4.F: Cover buildEditEventOptions method
        it('should build PUT request options with session cookie', () => {
            const sessionCookie = 'test-session-cookie';
            const payload = { name: 'Test Event' };

            const options = RWGPSClientCore.buildEditEventOptions(sessionCookie, payload);

            expect(options.method).toBe('PUT');
            expect(options.headers.Accept).toBe('application/json');
            expect(options.headers.Cookie).toBe('test-session-cookie');
            expect(options.headers['Content-Type']).toBe('application/json');
            expect(options.headers['User-Agent']).toContain('Mozilla');
            expect(options.payload).toBe(JSON.stringify(payload));
            expect(options.muteHttpExceptions).toBe(true);
        });
    });

    // Note: buildOrganizerLookupOptions and findMatchingOrganizer were removed in Task 5.3.5
    // Organizer lookup is now done via RWGPSMembersAdapter.lookupUserIdByName() using cached members sheet

    describe('buildBatchTagOptions', () => {
        it('should build tag removal options', () => {
            const options = RWGPSClientCore.buildBatchTagOptions('test-cookie', '444070', 'remove', 'template');
            
            expect(options.method).toBe('POST');
            expect(options.headers.Cookie).toBe('test-cookie');
            expect(options.payload.tag_action).toBe('remove');
            expect(options.payload.tag_names).toBe('template');
            expect(options.payload.event_ids).toBe('444070');
        });

        it('should handle array of event IDs', () => {
            const options = RWGPSClientCore.buildBatchTagOptions('cookie', ['444070', '444071'], 'add', 'B');
            
            expect(options.payload.event_ids).toBe('444070,444071');
        });

        it('should handle array of tag names', () => {
            const options = RWGPSClientCore.buildBatchTagOptions('cookie', '444070', 'remove', ['template', 'draft']);
            
            expect(options.payload.tag_names).toBe('template,draft');
        });
    });

    describe('extractRouteId', () => {
        it('should extract route ID from URL', () => {
            const id = RWGPSClientCore.extractRouteId('https://ridewithgps.com/routes/53253553');
            expect(id).toBe('53253553');
        });

        it('should extract route ID from URL with slug', () => {
            const id = RWGPSClientCore.extractRouteId('https://ridewithgps.com/routes/53253553-some-route-name');
            expect(id).toBe('53253553');
        });

        it('should return null for invalid URL', () => {
            expect(RWGPSClientCore.extractRouteId('invalid-url')).toBeNull();
            expect(RWGPSClientCore.extractRouteId('')).toBeNull();
            expect(RWGPSClientCore.extractRouteId(null)).toBeNull();
        });

        it('should return null for event URL', () => {
            const id = RWGPSClientCore.extractRouteId('https://ridewithgps.com/events/444070');
            expect(id).toBeNull();
        });
    });

    describe('buildRouteCopyOptions', () => {
        it('should build route copy options with minimal data', () => {
            const sessionCookie = 'test-cookie';
            const routeUrl = 'https://ridewithgps.com/routes/53253553';
            const routeData = { userId: 621846 };

            const options = RWGPSClientCore.buildRouteCopyOptions(sessionCookie, routeUrl, routeData);

            expect(options.method).toBe('POST');
            expect(options.headers.Cookie).toBe('test-cookie');
            expect(options.contentType).toBe('application/json');
            expect(options.muteHttpExceptions).toBe(true);

            const payload = JSON.parse(options.payload);
            expect(payload.user_id).toBe(621846);
            expect(payload.asset_type).toBe('route');
            expect(payload.privacy_code).toBeNull();
            expect(payload.include_photos).toBe(false);
            expect(payload.url).toBe(routeUrl);
        });

        it('should build route copy options with all optional fields', () => {
            const sessionCookie = 'test-cookie';
            const routeUrl = 'https://ridewithgps.com/routes/53253553';
            const routeData = {
                userId: 621846,
                name: 'My Route',
                expiry: '1/31/2030',
                tags: ['B', 'Club']
            };

            const options = RWGPSClientCore.buildRouteCopyOptions(sessionCookie, routeUrl, routeData);

            const payload = JSON.parse(options.payload);
            expect(payload.name).toBe('My Route');
            expect(payload.expiry).toBe('1/31/2030');
            expect(payload.tags).toEqual(['B', 'Club']);
        });

        it('should not include optional fields when not provided', () => {
            const sessionCookie = 'test-cookie';
            const routeUrl = 'https://ridewithgps.com/routes/53253553';
            const routeData = { userId: 621846 };

            const options = RWGPSClientCore.buildRouteCopyOptions(sessionCookie, routeUrl, routeData);

            const payload = JSON.parse(options.payload);
            expect(payload.name).toBeUndefined();
            expect(payload.expiry).toBeUndefined();
            expect(payload.tags).toBeUndefined();
        });
    });

    describe('buildRouteTagOptions', () => {
        it('should build route tag options', () => {
            const sessionCookie = 'test-cookie';
            const routeId = '53715433';
            const tags = ['B', 'Club'];

            const options = RWGPSClientCore.buildRouteTagOptions(sessionCookie, routeId, tags);

            expect(options.method).toBe('POST');
            expect(options.headers.Cookie).toBe('test-cookie');
            expect(options.muteHttpExceptions).toBe(true);
            expect(options.payload.tag_action).toBe('add');
            expect(options.payload.tag_names).toBe('B,Club');
            expect(options.payload.route_ids).toBe('53715433');
        });

        it('should handle single tag', () => {
            const options = RWGPSClientCore.buildRouteTagOptions('cookie', '12345', ['B']);
            
            expect(options.payload.tag_names).toBe('B');
        });

        it('should handle empty tags array', () => {
            const options = RWGPSClientCore.buildRouteTagOptions('cookie', '12345', []);
            
            expect(options.payload.tag_names).toBe('');
        });
    });

    describe('buildV1EditEventPayload', () => {
        it('should build payload with event wrapper', () => {
            const eventData = {
                name: 'Test Event',
                description: 'Test description',
                start_date: '2030-03-01',
                start_time: '11:00'
            };

            const payload = RWGPSClientCore.buildV1EditEventPayload(eventData, false);

            expect(payload.event).toBeDefined();
            expect(payload.event.name).toBe('Test Event');
            expect(payload.event.description).toBe('Test description');
            expect(payload.event.start_date).toBe('2030-03-01');
            expect(payload.event.start_time).toBe('11:00');
            expect(payload.event.all_day).toBe(false);
        });

        it('should keep organizer_ids as numbers (OpenAPI compliance)', () => {
            const eventData = {
                name: 'Test',
                organizer_ids: [123, 456, 789]
            };

            const payload = RWGPSClientCore.buildV1EditEventPayload(eventData, false);

            expect(payload.event.organizer_ids).toEqual([123, 456, 789]);
        });

        it('should keep route_ids as numbers (OpenAPI compliance)', () => {
            const eventData = {
                name: 'Test',
                route_ids: [50969472, 12345678]
            };

            const payload = RWGPSClientCore.buildV1EditEventPayload(eventData, false);

            expect(payload.event.route_ids).toEqual([50969472, 12345678]);
        });

        it('should set all_day flag as boolean', () => {
            const eventData = { name: 'Test' };

            const payload1 = RWGPSClientCore.buildV1EditEventPayload(eventData, true);
            expect(payload1.event.all_day).toBe(true);

            const payload0 = RWGPSClientCore.buildV1EditEventPayload(eventData, false);
            expect(payload0.event.all_day).toBe(false);
        });

        it('should include optional fields when provided', () => {
            const eventData = {
                name: 'Test',
                location: 'Test Location',
                time_zone: 'America/Los_Angeles',
                visibility: 'public'
            };

            const payload = RWGPSClientCore.buildV1EditEventPayload(eventData, false);

            expect(payload.event.location).toBe('Test Location');
            expect(payload.event.time_zone).toBe('America/Los_Angeles');
            expect(payload.event.visibility).toBe('public');
        });

        // Task 4.F: Cover lines 307, 315-317, 324-326 (desc, starts_at parsing branches)
        it('should handle missing description field', () => {
            const eventData = {
                name: 'Test'
                // No description or desc field
            };

            const payload = RWGPSClientCore.buildV1EditEventPayload(eventData, false);

            expect(payload.event.description).toBeUndefined();
        });

        it('should handle missing location field', () => {
            const eventData = {
                name: 'Test'
                // No location field
            };

            const payload = RWGPSClientCore.buildV1EditEventPayload(eventData, false);

            expect(payload.event.location).toBeUndefined();
        });

        it('should handle missing time_zone field', () => {
            const eventData = {
                name: 'Test'
                // No time_zone field
            };

            const payload = RWGPSClientCore.buildV1EditEventPayload(eventData, false);

            expect(payload.event.time_zone).toBeUndefined();
        });

        // Task 4.F: Cover line 341 (visibility normalization)
        it('should normalize numeric visibility 0 to "public"', () => {
            const eventData = {
                name: 'Test',
                visibility: 0
            };

            const payload = RWGPSClientCore.buildV1EditEventPayload(eventData, false);

            expect(payload.event.visibility).toBe('public');
        });

        it('should normalize string visibility "0" to "public"', () => {
            const eventData = {
                name: 'Test',
                visibility: '0'
            };

            const payload = RWGPSClientCore.buildV1EditEventPayload(eventData, false);

            expect(payload.event.visibility).toBe('public');
        });

        it('should normalize numeric visibility 1 to "private"', () => {
            const eventData = {
                name: 'Test',
                visibility: 1
            };

            const payload = RWGPSClientCore.buildV1EditEventPayload(eventData, false);

            expect(payload.event.visibility).toBe('private');
        });

        it('should normalize string visibility "1" to "private"', () => {
            const eventData = {
                name: 'Test',
                visibility: '1'
            };

            const payload = RWGPSClientCore.buildV1EditEventPayload(eventData, false);

            expect(payload.event.visibility).toBe('private');
        });

        it('should normalize numeric visibility 2 to "friends_only"', () => {
            const eventData = {
                name: 'Test',
                visibility: 2
            };

            const payload = RWGPSClientCore.buildV1EditEventPayload(eventData, false);

            expect(payload.event.visibility).toBe('friends_only');
        });

        it('should normalize string visibility "2" to "friends_only"', () => {
            const eventData = {
                name: 'Test',
                visibility: '2'
            };

            const payload = RWGPSClientCore.buildV1EditEventPayload(eventData, false);

            expect(payload.event.visibility).toBe('friends_only');
        });

        it('should pass through string visibility "public"', () => {
            const eventData = {
                name: 'Test',
                visibility: 'public'
            };

            const payload = RWGPSClientCore.buildV1EditEventPayload(eventData, false);

            expect(payload.event.visibility).toBe('public');
        });

        it('should pass through string visibility "private"', () => {
            const eventData = {
                name: 'Test',
                visibility: 'private'
            };

            const payload = RWGPSClientCore.buildV1EditEventPayload(eventData, false);

            expect(payload.event.visibility).toBe('private');
        });

        it('should pass through string visibility "friends_only"', () => {
            const eventData = {
                name: 'Test',
                visibility: 'friends_only'
            };

            const payload = RWGPSClientCore.buildV1EditEventPayload(eventData, false);

            expect(payload.event.visibility).toBe('friends_only');
        });

        it('should pass through unknown visibility values as string', () => {
            const eventData = {
                name: 'Test',
                visibility: 99
            };

            const payload = RWGPSClientCore.buildV1EditEventPayload(eventData, false);

            expect(payload.event.visibility).toBe('99');
        });
        
        // Task 7.8: API defaults for fields not in domain SCCCCEvent
        describe('API defaults for domain-clean SCCCCEvent (Task 7.8)', () => {
            it('should add visibility default "public" when not provided', () => {
                const eventData = {
                    name: 'Test Event',
                    description: 'Test'
                    // No visibility - should default to 'public'
                };

                const payload = RWGPSClientCore.buildV1EditEventPayload(eventData, false);

                expect(payload.event.visibility).toBe('public');
            });
            
            it('should use provided visibility instead of default', () => {
                const eventData = {
                    name: 'Test Event',
                    visibility: 'friends_only'
                };

                const payload = RWGPSClientCore.buildV1EditEventPayload(eventData, false);

                expect(payload.event.visibility).toBe('friends_only');
            });
            
            it('should NOT include auto_expire_participants (removed - undocumented legacy field)', () => {
                const eventData = {
                    name: 'Test Event',
                    description: 'Test'
                };

                const payload = RWGPSClientCore.buildV1EditEventPayload(eventData, false);

                expect(payload.event.auto_expire_participants).toBeUndefined();
            });
        });
        
        // OpenAPI spec compliance (Task 7.8 - use spec-native types)
        describe('OpenAPI spec compliance', () => {
            it('should use boolean for all_day (not string)', () => {
                const eventData = { name: 'Test' };

                const payloadFalse = RWGPSClientCore.buildV1EditEventPayload(eventData, false);
                expect(payloadFalse.event.all_day).toBe(false);
                expect(typeof payloadFalse.event.all_day).toBe('boolean');

                const payloadTrue = RWGPSClientCore.buildV1EditEventPayload(eventData, true);
                expect(payloadTrue.event.all_day).toBe(true);
                expect(typeof payloadTrue.event.all_day).toBe('boolean');
            });

            it('should keep organizer_ids as numbers (not convert to strings)', () => {
                const eventData = {
                    name: 'Test',
                    organizer_ids: [123, 456]
                };

                const payload = RWGPSClientCore.buildV1EditEventPayload(eventData, false);

                expect(payload.event.organizer_ids).toEqual([123, 456]);
                expect(typeof payload.event.organizer_ids[0]).toBe('number');
            });

            it('should keep route_ids as numbers (not convert to strings)', () => {
                const eventData = {
                    name: 'Test',
                    route_ids: [50969472, 12345678]
                };

                const payload = RWGPSClientCore.buildV1EditEventPayload(eventData, false);

                expect(payload.event.route_ids).toEqual([50969472, 12345678]);
                expect(typeof payload.event.route_ids[0]).toBe('number');
            });

            it('should use string for visibility (OpenAPI enum: public, private, friends_only)', () => {
                const eventData = {
                    name: 'Test',
                    visibility: 'friends_only'
                };

                const payload = RWGPSClientCore.buildV1EditEventPayload(eventData, false);

                expect(payload.event.visibility).toBe('friends_only');
                expect(typeof payload.event.visibility).toBe('string');
            });
        });
    });

    describe('buildV1EditEventOptions', () => {
        it('should build PUT request options with Basic Auth', () => {
            const basicAuth = 'Basic dGVzdDp0ZXN0';
            const payload = { event: { name: 'Test' } };

            const options = RWGPSClientCore.buildV1EditEventOptions(basicAuth, payload);

            expect(options.method).toBe('PUT');
            expect(options.headers.Authorization).toBe(basicAuth);
            expect(options.headers['Content-Type']).toBe('application/json');
            expect(options.headers.Accept).toBe('application/json');
            expect(options.payload).toBe(JSON.stringify(payload));
            expect(options.muteHttpExceptions).toBe(true);
        });
    });

    describe('buildV1CreateEventOptions', () => {
        it('should build POST request options with Basic Auth', () => {
            const basicAuth = 'Basic dGVzdDp0ZXN0';
            const payload = { event: { name: 'Test' } };

            const options = RWGPSClientCore.buildV1CreateEventOptions(basicAuth, payload);

            expect(options.method).toBe('POST');
            expect(options.headers.Authorization).toBe(basicAuth);
            expect(options.headers['Content-Type']).toBe('application/json');
            expect(options.headers.Accept).toBe('application/json');
            expect(options.payload).toBe(JSON.stringify(payload));
            expect(options.muteHttpExceptions).toBe(true);
        });
    });

    describe('buildMultipartTextParts', () => {
        // Tests for Task 4.E - moved Blob operations to Adapter
        // Core method should build text structure without GAS dependencies
        
        const mockLogoBlob = {
            getContentType: () => 'image/jpeg',
            getName: () => 'logo.jpg'
        };

        it('should build text parts structure without Blob operations', () => {
            const eventData = {
                name: 'Test Event',
                description: 'Test Description',
                start_date: '2030-12-15',
                start_time: '10:00',
                visibility: 1
            };
            const boundary = 'testBoundary123';

            const result = RWGPSClientCore.buildMultipartTextParts(eventData, mockLogoBlob, boundary);

            // Should return object with textPart and endBoundary strings
            expect(result).toHaveProperty('textPart');
            expect(result).toHaveProperty('endBoundary');
            expect(typeof result.textPart).toBe('string');
            expect(typeof result.endBoundary).toBe('string');
        });

        it('should include all event fields in text parts', () => {
            const eventData = {
                name: 'Test Event',
                description: 'Test Description',
                start_date: '2030-12-15',
                start_time: '10:00',
                visibility: 1,
                location: 'Test Location'
            };
            const boundary = 'testBoundary';

            const result = RWGPSClientCore.buildMultipartTextParts(eventData, mockLogoBlob, boundary);

            // Verify all fields present in textPart
            expect(result.textPart).toContain('name="event[name]"');
            expect(result.textPart).toContain('Test Event');
            expect(result.textPart).toContain('name="event[description]"');
            expect(result.textPart).toContain('Test Description');
            expect(result.textPart).toContain('name="event[start_date]"');
            expect(result.textPart).toContain('2030-12-15');
            expect(result.textPart).toContain('name="event[location]"');
            expect(result.textPart).toContain('Test Location');
        });

        it('should handle array fields with [] syntax', () => {
            const eventData = {
                name: 'Test Event',
                organizer_ids: ['123', '456']
            };
            const boundary = 'testBoundary';

            const result = RWGPSClientCore.buildMultipartTextParts(eventData, mockLogoBlob, boundary);

            // Array fields should use event[field][] syntax
            expect(result.textPart).toContain('name="event[organizer_ids][]"');
            expect(result.textPart).toContain('123');
            expect(result.textPart).toContain('456');
        });

        it('should include logo file header with correct content type', () => {
            const eventData = { name: 'Test Event' };
            const boundary = 'testBoundary';

            const result = RWGPSClientCore.buildMultipartTextParts(eventData, mockLogoBlob, boundary);

            // Logo header should include filename and content type
            expect(result.textPart).toContain('name="event[logo]"');
            expect(result.textPart).toContain('filename="logo.jpg"');
            expect(result.textPart).toContain('Content-Type: image/jpeg');
        });

        it('should include correct boundary markers', () => {
            const eventData = { name: 'Test Event' };
            const boundary = 'myCustomBoundary';

            const result = RWGPSClientCore.buildMultipartTextParts(eventData, mockLogoBlob, boundary);

            // Should include boundary in parts
            expect(result.textPart).toContain(`--${boundary}`);
            
            // End boundary should be formatted correctly
            expect(result.endBoundary).toBe(`\r\n--${boundary}--\r\n`);
        });

        it('should handle PNG logo file extension', () => {
            const pngBlob = {
                getContentType: () => 'image/png',
                getName: () => 'logo.png'
            };
            const eventData = { name: 'Test Event' };
            const boundary = 'testBoundary';

            const result = RWGPSClientCore.buildMultipartTextParts(eventData, pngBlob, boundary);

            expect(result.textPart).toContain('filename="logo.png"');
            expect(result.textPart).toContain('Content-Type: image/png');
        });

        it('should handle GIF logo file extension', () => {
            const gifBlob = {
                getContentType: () => 'image/gif',
                getName: () => 'logo.gif'
            };
            const eventData = { name: 'Test Event' };
            const boundary = 'testBoundary';

            const result = RWGPSClientCore.buildMultipartTextParts(eventData, gifBlob, boundary);

            expect(result.textPart).toContain('filename="logo.gif"');
            expect(result.textPart).toContain('Content-Type: image/gif');
        });

        it('should handle WebP logo file extension', () => {
            const webpBlob = {
                getContentType: () => 'image/webp',
                getName: () => 'logo.webp'
            };
            const eventData = { name: 'Test Event' };
            const boundary = 'testBoundary';

            const result = RWGPSClientCore.buildMultipartTextParts(eventData, webpBlob, boundary);

            expect(result.textPart).toContain('filename="logo.webp"');
            expect(result.textPart).toContain('Content-Type: image/webp');
        });

        it('should use correct multipart format with CRLF line endings', () => {
            const eventData = { name: 'Test' };
            const boundary = 'test';

            const result = RWGPSClientCore.buildMultipartTextParts(eventData, mockLogoBlob, boundary);

            // Should use \r\n (CRLF) for multipart spec compliance
            expect(result.textPart).toContain('\r\n');
            expect(result.endBoundary).toContain('\r\n');
        });
    });

    describe('formatDateForV1Api', () => {
        it('should format date with zero-padded month and day', () => {
            const date = new Date('2025-03-15T10:30:00');

            const result = RWGPSClientCore.formatDateForV1Api(date);

            expect(result.start_date).toBe('2025-03-15');
            expect(result.start_time).toBe('10:30');
        });

        it('should zero-pad single digit month', () => {
            const date = new Date('2025-01-05T14:45:00');

            const result = RWGPSClientCore.formatDateForV1Api(date);

            expect(result.start_date).toBe('2025-01-05');
            expect(result.start_time).toBe('14:45');
        });

        it('should zero-pad single digit hours and minutes', () => {
            const date = new Date('2025-11-20T09:05:00');

            const result = RWGPSClientCore.formatDateForV1Api(date);

            expect(result.start_date).toBe('2025-11-20');
            expect(result.start_time).toBe('09:05');
        });

        it('should handle midnight correctly', () => {
            const date = new Date('2025-06-15T00:00:00');

            const result = RWGPSClientCore.formatDateForV1Api(date);

            expect(result.start_date).toBe('2025-06-15');
            expect(result.start_time).toBe('00:00');
        });
    });

    describe('buildExpirationTag', () => {
        it('should format date as "expires: MM/DD/YYYY" tag', () => {
            const date = new Date('2025-03-15T10:00:00');

            const result = RWGPSClientCore.buildExpirationTag(date);

            expect(result).toBe('expires: 03/15/2025');
        });

        it('should zero-pad single digit month and day', () => {
            const date = new Date('2025-01-05T10:00:00');

            const result = RWGPSClientCore.buildExpirationTag(date);

            expect(result).toBe('expires: 01/05/2025');
        });

        it('should handle end of year dates', () => {
            const date = new Date('2025-12-31T10:00:00');

            const result = RWGPSClientCore.buildExpirationTag(date);

            expect(result).toBe('expires: 12/31/2025');
        });
    });

    describe('parseExpirationTag', () => {
        it('should extract date from expiration tag', () => {
            const tag = 'expires: 03/15/2025';

            const result = RWGPSClientCore.parseExpirationTag(tag);

            expect(result.month).toBe(3);
            expect(result.day).toBe(15);
            expect(result.year).toBe(2025);
        });

        it('should return null for non-expiration tag', () => {
            const tag = 'some-other-tag';

            const result = RWGPSClientCore.parseExpirationTag(tag);

            expect(result).toBeNull();
        });

        it('should return null for null input', () => {
            const result = RWGPSClientCore.parseExpirationTag(null);

            expect(result).toBeNull();
        });

        it('should return null for empty string', () => {
            const result = RWGPSClientCore.parseExpirationTag('');

            expect(result).toBeNull();
        });
    });

    describe('isExpirationTagNewer', () => {
        it('should return true if new date is after existing tag date', () => {
            const existingTag = 'expires: 03/15/2025';
            const newDate = new Date('2025-04-01T10:00:00');

            const result = RWGPSClientCore.isExpirationTagNewer(existingTag, newDate);

            expect(result).toBe(true);
        });

        it('should return false if new date is before existing tag date', () => {
            const existingTag = 'expires: 03/15/2025';
            const newDate = new Date('2025-03-01T10:00:00');

            const result = RWGPSClientCore.isExpirationTagNewer(existingTag, newDate);

            expect(result).toBe(false);
        });

        it('should return false if dates are equal', () => {
            const existingTag = 'expires: 03/15/2025';
            const newDate = new Date('2025-03-15T10:00:00');

            const result = RWGPSClientCore.isExpirationTagNewer(existingTag, newDate);

            expect(result).toBe(false);
        });

        it('should return true if existing tag is invalid', () => {
            const existingTag = 'not a valid tag';
            const newDate = new Date('2025-03-15T10:00:00');

            const result = RWGPSClientCore.isExpirationTagNewer(existingTag, newDate);

            expect(result).toBe(true);
        });

        it('should return true if existing tag is null', () => {
            const newDate = new Date('2025-03-15T10:00:00');

            const result = RWGPSClientCore.isExpirationTagNewer(null, newDate);

            expect(result).toBe(true);
        });
    });

    describe('buildClubMembersUrl', () => {
        it('should build URL with default pagination (page 1, pageSize 200)', () => {
            const url = RWGPSClientCore.buildClubMembersUrl();
            
            expect(url).toBe('https://ridewithgps.com/api/v1/members.json?page=1&page_size=200');
        });

        it('should build URL with custom page number', () => {
            const url = RWGPSClientCore.buildClubMembersUrl(3);
            
            expect(url).toBe('https://ridewithgps.com/api/v1/members.json?page=3&page_size=200');
        });

        it('should build URL with custom page and pageSize', () => {
            const url = RWGPSClientCore.buildClubMembersUrl(2, 50);
            
            expect(url).toBe('https://ridewithgps.com/api/v1/members.json?page=2&page_size=50');
        });

        it('should enforce minimum page of 1', () => {
            const url = RWGPSClientCore.buildClubMembersUrl(0);
            
            expect(url).toBe('https://ridewithgps.com/api/v1/members.json?page=1&page_size=200');
        });

        it('should enforce minimum pageSize of 20', () => {
            const url = RWGPSClientCore.buildClubMembersUrl(1, 5);
            
            expect(url).toBe('https://ridewithgps.com/api/v1/members.json?page=1&page_size=20');
        });

        it('should enforce maximum pageSize of 200', () => {
            const url = RWGPSClientCore.buildClubMembersUrl(1, 500);
            
            expect(url).toBe('https://ridewithgps.com/api/v1/members.json?page=1&page_size=200');
        });

        it('should handle negative page number', () => {
            const url = RWGPSClientCore.buildClubMembersUrl(-5);
            
            expect(url).toBe('https://ridewithgps.com/api/v1/members.json?page=1&page_size=200');
        });
    });

    describe('hasMorePages', () => {
        it('should return true when next_page_url is present', () => {
            const pagination = {
                record_count: 250,
                page_count: 2,
                page_size: 200,
                next_page_url: '/api/v1/members.json?page=2'
            };

            expect(RWGPSClientCore.hasMorePages(pagination)).toBe(true);
        });

        it('should return false when next_page_url is null', () => {
            const pagination = {
                record_count: 150,
                page_count: 1,
                page_size: 200,
                next_page_url: null
            };

            expect(RWGPSClientCore.hasMorePages(pagination)).toBe(false);
        });

        it('should return false when next_page_url is undefined', () => {
            const pagination = {
                record_count: 150,
                page_count: 1,
                page_size: 200
            };

            expect(RWGPSClientCore.hasMorePages(pagination)).toBe(false);
        });

        it('should return false when pagination is null', () => {
            expect(RWGPSClientCore.hasMorePages(null)).toBe(false);
        });

        it('should return false when pagination is undefined', () => {
            expect(RWGPSClientCore.hasMorePages(undefined)).toBe(false);
        });
    });
});

