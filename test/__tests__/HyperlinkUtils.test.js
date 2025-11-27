const HyperlinkUtils = require('../../src/HyperlinkUtils');

describe('HyperlinkUtils', () => {
    describe('parseHyperlinkFormula', () => {
        it('should parse a valid HYPERLINK formula', () => {
            const formula = '=HYPERLINK("https://example.com", "Example")';
            const result = HyperlinkUtils.parseHyperlinkFormula(formula);
            expect(result).toEqual({ url: 'https://example.com', name: 'Example' });
        });

        it('should parse case-insensitive HYPERLINK', () => {
            const formula = '=hyperlink("https://example.com", "Example")';
            const result = HyperlinkUtils.parseHyperlinkFormula(formula);
            expect(result).toEqual({ url: 'https://example.com', name: 'Example' });
        });

        it('should handle spaces after comma', () => {
            const formula = '=HYPERLINK("https://example.com",  "Example")';
            const result = HyperlinkUtils.parseHyperlinkFormula(formula);
            expect(result).toEqual({ url: 'https://example.com', name: 'Example' });
        });

        it('should return empty strings for invalid formula', () => {
            const formula = 'not a hyperlink';
            const result = HyperlinkUtils.parseHyperlinkFormula(formula);
            expect(result).toEqual({ url: '', name: '' });
        });

        it('should return empty strings for malformed formula', () => {
            const formula = '=HYPERLINK("https://example.com")';
            const result = HyperlinkUtils.parseHyperlinkFormula(formula);
            expect(result).toEqual({ url: '', name: '' });
        });

        it('should handle URLs with special characters', () => {
            const formula = '=HYPERLINK("https://example.com/path?query=1&other=2", "Complex URL")';
            const result = HyperlinkUtils.parseHyperlinkFormula(formula);
            expect(result).toEqual({ url: 'https://example.com/path?query=1&other=2', name: 'Complex URL' });
        });
    });

    describe('createHyperlinkFormula', () => {
        it('should create a valid HYPERLINK formula', () => {
            const formula = HyperlinkUtils.createHyperlinkFormula('Example', 'https://example.com');
            expect(formula).toBe('=HYPERLINK("https://example.com", "Example")');
        });

        it('should handle names with special characters', () => {
            const formula = HyperlinkUtils.createHyperlinkFormula('Example & Test', 'https://example.com');
            expect(formula).toBe('=HYPERLINK("https://example.com", "Example & Test")');
        });

        it('should handle URLs with query parameters', () => {
            const formula = HyperlinkUtils.createHyperlinkFormula('Query', 'https://example.com?param=value');
            expect(formula).toBe('=HYPERLINK("https://example.com?param=value", "Query")');
        });
    });

    describe('round-trip parsing', () => {
        it('should parse a created formula back to original values', () => {
            const originalName = 'My Link';
            const originalUrl = 'https://example.com/path';
            
            const formula = HyperlinkUtils.createHyperlinkFormula(originalName, originalUrl);
            const parsed = HyperlinkUtils.parseHyperlinkFormula(formula);
            
            expect(parsed.name).toBe(originalName);
            expect(parsed.url).toBe(originalUrl);
        });
    });
});
