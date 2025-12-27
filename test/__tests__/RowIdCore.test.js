const RowIdCore = require('../../src/RowIdCore');

describe('RowIdCore', () => {
    describe('parseFormulaCache', () => {
        it('should parse valid JSON cache', () => {
            const json = '{"uuid1":"=HYPERLINK(\\"url1\\",\\"name1\\")","uuid2":"=HYPERLINK(\\"url2\\",\\"name2\\")"}';
            const cache = RowIdCore.parseFormulaCache(json);
            
            expect(cache).toEqual({
                uuid1: '=HYPERLINK("url1","name1")',
                uuid2: '=HYPERLINK("url2","name2")'
            });
        });

        it('should return empty object for null', () => {
            const cache = RowIdCore.parseFormulaCache(null);
            expect(cache).toEqual({});
        });

        it('should return empty object for invalid JSON', () => {
            const cache = RowIdCore.parseFormulaCache('{invalid json}');
            expect(cache).toEqual({});
        });

        it('should return empty object for empty string', () => {
            const cache = RowIdCore.parseFormulaCache('');
            expect(cache).toEqual({});
        });
    });

    describe('serializeFormulaCache', () => {
        it('should serialize cache to JSON', () => {
            const cache = {
                uuid1: '=HYPERLINK("url1","name1")',
                uuid2: '=HYPERLINK("url2","name2")'
            };
            const json = RowIdCore.serializeFormulaCache(cache);
            
            expect(JSON.parse(json)).toEqual(cache);
        });

        it('should serialize empty cache', () => {
            const cache = {};
            const json = RowIdCore.serializeFormulaCache(cache);
            
            expect(json).toBe('{}');
        });
    });

    describe('getFormula', () => {
        it('should get formula by UUID', () => {
            const cache = {
                uuid1: '=HYPERLINK("url1","name1")',
                uuid2: '=HYPERLINK("url2","name2")'
            };
            
            expect(RowIdCore.getFormula(cache, 'uuid1')).toBe('=HYPERLINK("url1","name1")');
            expect(RowIdCore.getFormula(cache, 'uuid2')).toBe('=HYPERLINK("url2","name2")');
        });

        it('should return null for missing UUID', () => {
            const cache = { uuid1: '=HYPERLINK("url1","name1")' };
            
            expect(RowIdCore.getFormula(cache, 'missing')).toBeNull();
        });

        it('should return null for empty cache', () => {
            const cache = {};
            
            expect(RowIdCore.getFormula(cache, 'uuid1')).toBeNull();
        });
    });

    describe('setFormula', () => {
        it('should set formula in cache', () => {
            const cache = {};
            
            RowIdCore.setFormula(cache, 'uuid1', '=HYPERLINK("url1","name1")');
            
            expect(cache).toEqual({
                uuid1: '=HYPERLINK("url1","name1")'
            });
        });

        it('should overwrite existing formula', () => {
            const cache = {
                uuid1: '=HYPERLINK("old","old")'
            };
            
            RowIdCore.setFormula(cache, 'uuid1', '=HYPERLINK("new","new")');
            
            expect(cache).toEqual({
                uuid1: '=HYPERLINK("new","new")'
            });
        });

        it('should add to existing cache', () => {
            const cache = {
                uuid1: '=HYPERLINK("url1","name1")'
            };
            
            RowIdCore.setFormula(cache, 'uuid2', '=HYPERLINK("url2","name2")');
            
            expect(cache).toEqual({
                uuid1: '=HYPERLINK("url1","name1")',
                uuid2: '=HYPERLINK("url2","name2")'
            });
        });
    });

    describe('removeFormula', () => {
        it('should remove formula from cache', () => {
            const cache = {
                uuid1: '=HYPERLINK("url1","name1")',
                uuid2: '=HYPERLINK("url2","name2")'
            };
            
            RowIdCore.removeFormula(cache, 'uuid1');
            
            expect(cache).toEqual({
                uuid2: '=HYPERLINK("url2","name2")'
            });
        });

        it('should do nothing for missing UUID', () => {
            const cache = {
                uuid1: '=HYPERLINK("url1","name1")'
            };
            
            RowIdCore.removeFormula(cache, 'missing');
            
            expect(cache).toEqual({
                uuid1: '=HYPERLINK("url1","name1")'
            });
        });

        it('should handle empty cache', () => {
            const cache = {};
            
            RowIdCore.removeFormula(cache, 'uuid1');
            
            expect(cache).toEqual({});
        });
    });

    describe('buildCache', () => {
        it('should build cache from row data', () => {
            const rows = [
                { uuid: 'uuid1', formula: '=HYPERLINK("url1","name1")' },
                { uuid: 'uuid2', formula: '=HYPERLINK("url2","name2")' },
                { uuid: 'uuid3', formula: '=HYPERLINK("url3","name3")' }
            ];
            
            const cache = RowIdCore.buildCache(rows);
            
            expect(cache).toEqual({
                uuid1: '=HYPERLINK("url1","name1")',
                uuid2: '=HYPERLINK("url2","name2")',
                uuid3: '=HYPERLINK("url3","name3")'
            });
        });

        it('should skip rows without UUID', () => {
            const rows = [
                { uuid: 'uuid1', formula: '=HYPERLINK("url1","name1")' },
                { uuid: '', formula: '=HYPERLINK("url2","name2")' },
                { formula: '=HYPERLINK("url3","name3")' }
            ];
            
            const cache = RowIdCore.buildCache(rows);
            
            expect(cache).toEqual({
                uuid1: '=HYPERLINK("url1","name1")'
            });
        });

        it('should skip rows without formula', () => {
            const rows = [
                { uuid: 'uuid1', formula: '=HYPERLINK("url1","name1")' },
                { uuid: 'uuid2', formula: '' },
                { uuid: 'uuid3' }
            ];
            
            const cache = RowIdCore.buildCache(rows);
            
            expect(cache).toEqual({
                uuid1: '=HYPERLINK("url1","name1")'
            });
        });

        it('should handle empty array', () => {
            const rows = [];
            
            const cache = RowIdCore.buildCache(rows);
            
            expect(cache).toEqual({});
        });

        it('should handle array with all invalid rows', () => {
            const rows = [
                { uuid: '', formula: '' },
                { formula: '=HYPERLINK("url","name")' },
                { uuid: 'uuid1' }
            ];
            
            const cache = RowIdCore.buildCache(rows);
            
            expect(cache).toEqual({});
        });
    });
});
