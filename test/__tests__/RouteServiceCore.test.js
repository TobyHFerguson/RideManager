/**
 * RouteServiceCore.test.js
 * 
 * TDD tests for RouteServiceCore - pure JavaScript logic for route operations
 * 
 * Tests written BEFORE implementation per copilot-instructions.md
 */

const RouteServiceCore = require('../../src/RouteServiceCore');

describe('RouteServiceCore', () => {
    describe('ROUTE_URL_PATTERN', () => {
        it('should be a RegExp', () => {
            expect(RouteServiceCore.ROUTE_URL_PATTERN).toBeInstanceOf(RegExp);
        });
    });

    describe('CACHE_DURATION_SECONDS', () => {
        it('should be 6 hours (21600 seconds)', () => {
            expect(RouteServiceCore.CACHE_DURATION_SECONDS).toBe(21600);
        });
    });

    describe('isValidRouteUrl', () => {
        it('should return true for valid RWGPS route URL', () => {
            expect(RouteServiceCore.isValidRouteUrl('https://ridewithgps.com/routes/12345')).toBe(true);
        });

        it('should return true for route URL with long ID', () => {
            expect(RouteServiceCore.isValidRouteUrl('https://ridewithgps.com/routes/123456789')).toBe(true);
        });

        it('should return false for empty string', () => {
            expect(RouteServiceCore.isValidRouteUrl('')).toBe(false);
        });

        it('should return false for null', () => {
            expect(RouteServiceCore.isValidRouteUrl(null)).toBe(false);
        });

        it('should return false for undefined', () => {
            expect(RouteServiceCore.isValidRouteUrl(undefined)).toBe(false);
        });

        it('should return false for non-RWGPS URL', () => {
            expect(RouteServiceCore.isValidRouteUrl('https://example.com/routes/12345')).toBe(false);
        });

        it('should return false for RWGPS events URL', () => {
            expect(RouteServiceCore.isValidRouteUrl('https://ridewithgps.com/events/12345')).toBe(false);
        });

        it('should return false for URL without route ID', () => {
            expect(RouteServiceCore.isValidRouteUrl('https://ridewithgps.com/routes/')).toBe(false);
        });

        it('should return false for URL with non-numeric ID', () => {
            expect(RouteServiceCore.isValidRouteUrl('https://ridewithgps.com/routes/abc')).toBe(false);
        });

        it('should return false for URL with trailing text after ID', () => {
            // URL like /routes/12345-my-ride should still be valid (RWGPS supports this)
            expect(RouteServiceCore.isValidRouteUrl('https://ridewithgps.com/routes/12345-my-ride')).toBe(true);
        });
    });

    describe('getCacheKey', () => {
        it('should return the URL as cache key', () => {
            const url = 'https://ridewithgps.com/routes/12345';
            expect(RouteServiceCore.getCacheKey(url)).toBe(url);
        });

        it('should handle URL with trailing slug', () => {
            const url = 'https://ridewithgps.com/routes/12345-my-ride';
            expect(RouteServiceCore.getCacheKey(url)).toBe(url);
        });
    });

    describe('trimRouteForCache', () => {
        it('should remove course_points', () => {
            const route = {
                id: 12345,
                name: 'Test Route',
                course_points: [{lat: 1, lng: 2}, {lat: 3, lng: 4}]
            };
            const trimmed = RouteServiceCore.trimRouteForCache(route);
            expect(trimmed.course_points).toBeUndefined();
        });

        it('should remove points_of_interest', () => {
            const route = {
                id: 12345,
                name: 'Test Route',
                points_of_interest: [{name: 'POI 1'}, {name: 'POI 2'}]
            };
            const trimmed = RouteServiceCore.trimRouteForCache(route);
            expect(trimmed.points_of_interest).toBeUndefined();
        });

        it('should remove track_points', () => {
            const route = {
                id: 12345,
                name: 'Test Route',
                track_points: [[1,2], [3,4], [5,6]]
            };
            const trimmed = RouteServiceCore.trimRouteForCache(route);
            expect(trimmed.track_points).toBeUndefined();
        });

        it('should set has_course_points to false', () => {
            const route = {
                id: 12345,
                name: 'Test Route',
                has_course_points: true,
                course_points: [{lat: 1, lng: 2}]
            };
            const trimmed = RouteServiceCore.trimRouteForCache(route);
            expect(trimmed.has_course_points).toBe(false);
        });

        it('should preserve essential route properties', () => {
            const route = {
                id: 12345,
                name: 'Test Route',
                url: 'https://ridewithgps.com/routes/12345',
                first_lat: 37.7749,
                first_lng: -122.4194,
                user_id: 99999,
                distance: 50000,
                elevation_gain: 1000,
                course_points: [],
                track_points: []
            };
            const trimmed = RouteServiceCore.trimRouteForCache(route);
            expect(trimmed.id).toBe(12345);
            expect(trimmed.name).toBe('Test Route');
            expect(trimmed.first_lat).toBe(37.7749);
            expect(trimmed.first_lng).toBe(-122.4194);
            expect(trimmed.user_id).toBe(99999);
            expect(trimmed.distance).toBe(50000);
            expect(trimmed.elevation_gain).toBe(1000);
        });

        it('should not modify the original route object', () => {
            const route = {
                id: 12345,
                name: 'Test Route',
                course_points: [{lat: 1, lng: 2}]
            };
            RouteServiceCore.trimRouteForCache(route);
            expect(route.course_points).toEqual([{lat: 1, lng: 2}]);
        });

        it('should handle route without optional large arrays', () => {
            const route = {
                id: 12345,
                name: 'Test Route'
            };
            const trimmed = RouteServiceCore.trimRouteForCache(route);
            expect(trimmed.id).toBe(12345);
            expect(trimmed.name).toBe('Test Route');
            expect(trimmed.has_course_points).toBe(false);
        });
    });

    describe('getInvalidUrlError', () => {
        it('should return descriptive error for invalid URL', () => {
            const error = RouteServiceCore.getInvalidUrlError('bad-url');
            expect(error).toContain('bad-url');
            expect(error).toContain('https://ridewithgps.com/routes/DIGITS');
        });

        it('should handle empty string', () => {
            const error = RouteServiceCore.getInvalidUrlError('');
            expect(error).toContain("''");
        });
    });

    describe('getHttpStatusError', () => {
        it('should return "not public" for 403', () => {
            const error = RouteServiceCore.getHttpStatusError(403);
            expect(error.toLowerCase()).toContain('public');
        });

        it('should return "not found" for 404', () => {
            const error = RouteServiceCore.getHttpStatusError(404);
            expect(error.toLowerCase()).toContain('not');
            expect(error.toLowerCase()).toContain('found');
        });

        it('should return generic error for other status codes', () => {
            const error = RouteServiceCore.getHttpStatusError(500);
            expect(error).toBeTruthy();
            expect(typeof error).toBe('string');
        });

        it('should include status code in generic error', () => {
            const error = RouteServiceCore.getHttpStatusError(502);
            expect(error).toContain('502');
        });
    });
});
