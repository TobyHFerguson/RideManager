// @ts-check

const {
    parseRouteInput,
    determineRouteName,
    buildHyperlinkFormula,
    buildRichTextLink,
    processRouteEdit
} = require('../../src/RouteColumnEditor');

// Mock HyperlinkUtils
global.parseHyperlinkFormula = jest.fn((formula) => {
    const match = formula.match(/=hyperlink\("([^"]+)",\s*"([^"]+)"\)/i);
    if (match) {
        return { url: match[1], name: match[2] };
    }
    return { url: '', name: '' };
});

global.createHyperlinkFormula = jest.fn((name, url) => {
    return `=hyperlink("${url}", "${name}")`;
});

describe('RouteColumnEditor', () => {
    describe('parseRouteInput', () => {
        it('should return null for empty input', () => {
            expect(parseRouteInput('')).toEqual({ url: null, wasFormula: false });
            expect(parseRouteInput(null)).toEqual({ url: null, wasFormula: false });
        });

        it('should parse plain URL', () => {
            const result = parseRouteInput('https://ridewithgps.com/routes/12345');
            expect(result).toEqual({
                url: 'https://ridewithgps.com/routes/12345',
                wasFormula: false
            });
        });

        it('should parse hyperlink formula', () => {
            const formula = '=hyperlink("https://ridewithgps.com/routes/12345", "Test Route")';
            const result = parseRouteInput(formula);
            expect(result).toEqual({
                url: 'https://ridewithgps.com/routes/12345',
                wasFormula: true
            });
        });

        it('should handle case-insensitive hyperlink', () => {
            const formula = '=HYPERLINK("https://ridewithgps.com/routes/12345", "Test Route")';
            const result = parseRouteInput(formula);
            expect(result.wasFormula).toBe(true);
        });

        it('should trim whitespace from plain URLs', () => {
            const result = parseRouteInput('  https://ridewithgps.com/routes/12345  ');
            expect(result.url).toBe('https://ridewithgps.com/routes/12345');
        });
    });

    describe('determineRouteName', () => {
        const CLUB_USER_ID = 12345;
        const FOREIGN_PREFIX = 'External:';

        it('should return route name for club-owned route', () => {
            const route = { user_id: CLUB_USER_ID, name: 'Club Ride' };
            const result = determineRouteName(route, CLUB_USER_ID, FOREIGN_PREFIX);
            
            expect(result).toEqual({
                name: 'Club Ride',
                isForeign: false
            });
        });

        it('should prefix foreign route with default name', () => {
            const route = { user_id: 99999, name: 'Other Club Ride' };
            const result = determineRouteName(route, CLUB_USER_ID, FOREIGN_PREFIX);
            
            expect(result).toEqual({
                name: 'External: Other Club Ride',
                isForeign: true
            });
        });

        it('should use user-provided name for foreign route', () => {
            const route = { user_id: 99999, name: 'Other Club Ride' };
            const result = determineRouteName(
                route, 
                CLUB_USER_ID, 
                FOREIGN_PREFIX, 
                'Custom Name'
            );
            
            expect(result).toEqual({
                name: 'Custom Name',
                isForeign: true
            });
        });
    });

    describe('buildHyperlinkFormula (legacy)', () => {
        it('should build correct formula', () => {
            const formula = buildHyperlinkFormula(
                'https://ridewithgps.com/routes/12345',
                'Test Route'
            );
            expect(formula).toBe('=hyperlink("https://ridewithgps.com/routes/12345", "Test Route")');
        });
    });

    describe('buildRichTextLink', () => {
        it('should build RichText link object', () => {
            const link = buildRichTextLink(
                'https://ridewithgps.com/routes/12345',
                'Test Route'
            );
            expect(link).toEqual({
                text: 'Test Route',
                url: 'https://ridewithgps.com/routes/12345'
            });
        });
    });

    describe('processRouteEdit', () => {
        const CLUB_USER_ID = 12345;
        const FOREIGN_PREFIX = 'External:';

        it('should return null link for empty input', () => {
            const result = processRouteEdit({
                inputValue: '',
                route: { user_id: CLUB_USER_ID, name: 'Test' },
                clubUserId: CLUB_USER_ID,
                foreignPrefix: FOREIGN_PREFIX
            });

            expect(result).toEqual({
                link: null,
                isForeign: false
            });
        });

        it('should create RichText link for club route from plain URL', () => {
            const result = processRouteEdit({
                inputValue: 'https://ridewithgps.com/routes/12345',
                route: { user_id: CLUB_USER_ID, name: 'Club Ride' },
                clubUserId: CLUB_USER_ID,
                foreignPrefix: FOREIGN_PREFIX
            });

            expect(result).toEqual({
                link: { text: 'Club Ride', url: 'https://ridewithgps.com/routes/12345' },
                isForeign: false
            });
        });

        it('should create RichText link for foreign route with prefix', () => {
            const result = processRouteEdit({
                inputValue: 'https://ridewithgps.com/routes/99999',
                route: { user_id: 99999, name: 'Other Ride' },
                clubUserId: CLUB_USER_ID,
                foreignPrefix: FOREIGN_PREFIX
            });

            expect(result).toEqual({
                link: { text: 'External: Other Ride', url: 'https://ridewithgps.com/routes/99999' },
                isForeign: true
            });
        });

        it('should use custom name for foreign route', () => {
            const result = processRouteEdit({
                inputValue: 'https://ridewithgps.com/routes/99999',
                route: { user_id: 99999, name: 'Other Ride' },
                clubUserId: CLUB_USER_ID,
                foreignPrefix: FOREIGN_PREFIX,
                userProvidedName: 'Custom Route Name'
            });

            expect(result).toEqual({
                link: { text: 'Custom Route Name', url: 'https://ridewithgps.com/routes/99999' },
                isForeign: true
            });
        });

        it('should handle hyperlink formula input', () => {
            const result = processRouteEdit({
                inputValue: '=hyperlink("https://ridewithgps.com/routes/12345", "Old Name")',
                route: { user_id: CLUB_USER_ID, name: 'New Name' },
                clubUserId: CLUB_USER_ID,
                foreignPrefix: FOREIGN_PREFIX
            });

            expect(result).toEqual({
                link: { text: 'New Name', url: 'https://ridewithgps.com/routes/12345' },
                isForeign: false
            });
        });
    });
});
