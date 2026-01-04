# Migration Guide: Fiddler + Formulas → Native GAS + RichText

## Overview

This guide describes the migration from using bmPreFiddler library with HYPERLINK formulas to native Google Apps Script (GAS) with RichText hyperlinks.

### What Changed

**Before (Fiddler + Formulas)**:
- Used bmPreFiddler library for spreadsheet I/O
- Route and Ride columns stored as `=HYPERLINK("url", "text")` formulas
- Required formula preservation logic (~100+ lines)
- Stored formulas in PropertiesService between operations
- Complex formula overlay during data load

**After (Native GAS + RichText)**:
- Uses native GAS `getValues()` and `getRichTextValues()` 
- Route and Ride columns use native RichText hyperlinks
- No formula preservation needed
- No PropertiesService storage
- Clean RichText extraction and creation

### Benefits

✅ **~100-150 lines of code removed**  
✅ **No external dependency** (bmPreFiddler removed)  
✅ **Simpler architecture** (RichText vs formula strings)  
✅ **Native GAS features** (better long-term support)  
✅ **Better performance** (no formula parsing/overlay)  

## Migration Steps

### 1. Backup Your Spreadsheet

**IMPORTANT**: Before running any migration, create a backup copy of your spreadsheet.

1. Open the Consolidated Rides spreadsheet
2. File → Make a copy
3. Name it with date: "Consolidated Rides - Backup YYYY-MM-DD"

### 2. Run Migration Script

The migration script converts existing HYPERLINK formulas to RichText hyperlinks.

#### Deploy Migration Script

1. Deploy the code to GAS:
   ```bash
   npm run dev:push
   ```

2. Open the Script Editor in Google Sheets:
   - Extensions → Apps Script

3. Run the migration function:
   - Select function: `migrateHyperlinksToRichText`
   - Click "Run"
   - Grant permissions if prompted
   - Check the execution log for progress

#### What the Migration Does

The script:
- Finds Route and Ride columns in the spreadsheet
- Reads all HYPERLINK formulas in these columns
- Parses each formula to extract URL and display text
- Creates native RichText hyperlinks with the same URL and text
- Writes RichText back to the cells
- Logs detailed progress and any errors

### 3. Verify Migration

After running the migration:

1. **Visual Check**: 
   - Open the spreadsheet
   - Click on a few Route and Ride cells
   - Links should still be blue and clickable
   - Links should NOT show formulas in the formula bar

2. **Click Test**:
   - Click 3-5 links in Route column → should open RidewithGPS routes
   - Click 3-5 links in Ride column → should open RidewithGPS events

3. **Check Logs**:
   - View → Execution log
   - Look for "Migration complete!" message
   - Check that converted count matches expected rows
   - Note any errors or warnings

### 4. Deploy New Code

Once migration is verified:

```bash
npm run prod:push
```

This deploys the new ScheduleAdapter with RichText support.

### 5. Test Operations

Test that normal operations still work:

1. **Read Test**: 
   - Ride Schedulers → Log Selected Row Data
   - Verify Route and Ride URLs are extracted correctly

2. **Write Test**:
   - Modify a cell (e.g., change a leader name)
   - Ride Schedulers → Save
   - Verify save succeeds without errors

3. **Link Test**:
   - Use menu function that sets ride links
   - Verify new links are created as RichText (not formulas)

## Rollback

If you need to rollback after migration:

### Option 1: Restore from Backup

1. Delete or archive the current spreadsheet
2. Use your backup copy
3. Redeploy the old code (before this PR)

### Option 2: Convert Back to Formulas

If you want to keep the data but convert back:

1. Run `convertRichTextToFormulas()` from the migration script
2. This converts RichText back to HYPERLINK formulas
3. Redeploy the old code

## Technical Details

### ScheduleAdapter Changes

**Load Path**:
```javascript
// Before (Fiddler)
this.fiddler.getData()          // Get data via Fiddler
this._overlayFormulas()         // Overlay formulas from PropertiesService

// After (Native GAS)
this._loadDataFromSheet()       // Direct GAS array operations
  → getValues()                 // Get cell values
  → getRichTextValues()         // Get RichText data
  → Extract {text, url} objects // Store in RowCore
```

**Save Path**:
```javascript
// Before (Formulas)
if (value.startsWith('=')) {
    cell.setFormula(value);     // Write formula
}

// After (RichText)
if (columnName === 'Route' || columnName === 'Ride') {
    const richText = SpreadsheetApp.newRichTextValue()
        .setText(value.text)
        .setLinkUrl(value.url)
        .build();
    cell.setRichTextValue(richText);
}
```

### RowCore Changes

**Before (Formula Strings)**:
```javascript
routeCell: '=HYPERLINK("url", "text")'  // Formula string

get routeURL() {
    return HyperlinkUtils.parseHyperlinkFormula(this.routeCell).url;
}
```

**After (RichText Objects)**:
```javascript
routeCell: {text: "text", url: "url"}  // Object

get routeURL() {
    return this.routeCell.url;  // Direct access
}
```

### Backward Compatibility

The code includes backward compatibility during migration:

- RowCore's `_normalizeLinkCell()` handles legacy formula strings
- Converts formulas to {text, url} objects automatically
- Allows gradual migration without breaking existing code

## Troubleshooting

### Migration Fails

**Problem**: Migration script fails partway through

**Solution**:
1. Check execution log for specific error
2. Note which row failed
3. Manually inspect that row in spreadsheet
4. Fix any malformed formulas
5. Re-run migration (script is idempotent)

### Links Don't Work After Migration

**Problem**: Clicking links does nothing

**Solution**:
1. Check if URL is valid (click Edit → View)
2. Verify migration script completed successfully
3. Check execution log for errors on that row
4. Manually recreate the link if needed

### Formula Bar Shows Formulas

**Problem**: Formula bar shows `=HYPERLINK(...)` after migration

**Solution**:
- Migration didn't run or failed
- Re-run migration script
- Check for errors in execution log

## Support

If you encounter issues:

1. Check the execution log for detailed error messages
2. Verify your backup is intact before retrying
3. Review the migration script code in `scripts/migrate-formulas-to-richtext.js`
4. Create an issue with:
   - Error message
   - Row number that failed
   - Contents of the problematic cell

## Files Modified

- `src/ScheduleAdapter.js` - Removed Fiddler, added native GAS + RichText
- `src/RowCore.js` - Changed routeCell/rideCell to {text, url} objects
- `src/HyperlinkUtils.js` - Added bidirectional conversion functions
- `scripts/migrate-formulas-to-richtext.js` - New migration script
- Tests updated to match new behavior
