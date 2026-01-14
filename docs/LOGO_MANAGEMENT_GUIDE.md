# Group Logo Management Guide

## Overview

Group logos are stored in Google Drive and referenced in the Groups spreadsheet. This provides:
- **Persistent storage**: Logos survive template deletions
- **User management**: Update logos through familiar Drive interface
- **Programmatic access**: Scripts can fetch logos for event creation
- **Visual reference**: Optional thumbnail display in spreadsheet

## Architecture

### Storage Components

1. **Drive Folder**: "SCCCC Group Logos"
   - Contains one image file per group
   - File names match group names (e.g., "Thursday.png")
   - Files are shared with "Anyone with link" for accessibility

2. **Groups Spreadsheet Columns**:
   - **LogoURL** (Required): Drive URL pointing to the logo file
   - **Logo** (Optional): Thumbnail display for visual reference

### Data Flow

```
Template Event (logo_url)
    ↓ [populateGroupLogos()]
Drive Folder (image files)
    ↓
LogoURL Column (Drive URLs)
    ↓ [Groups.js reads]
Event Creation (fetches from Drive URL)
```

## Initial Setup

### 1. Add Required Columns to Groups Sheet

Before running population, ensure Groups tab has these columns:
- **LogoURL**: Required - stores Drive URLs
- **Logo**: Optional - displays thumbnails

### 2. Run Population Script

In GAS Script Editor, run:
```javascript
populateGroupLogos();
```

This script:
1. Creates "SCCCC Group Logos" Drive folder (if needed)
2. For each group with a TEMPLATE:
   - Fetches template event to get logo_url
   - Downloads logo blob
   - Uploads to Drive folder
   - Stores Drive URL in LogoURL column
   - Creates thumbnail in Logo column (if present)

### 3. Verify Results

Check the console log for:
```
=== Summary ===
Populated: 7
Skipped: 0
Errors: 0
```

Verify:
- LogoURL column contains Drive URLs
- Logo column shows thumbnails (if enabled)
- Drive folder contains image files

## Updating Logos

### Method 1: Replace Drive File (Recommended)

1. Open "SCCCC Group Logos" folder in Drive
2. Find the group's logo file (e.g., "Thursday.png")
3. Right-click → "Manage versions" → Upload new version
   - OR: Delete old file and upload new file with same name
4. LogoURL remains valid, no spreadsheet changes needed
5. New events will use updated logo automatically

**Pros**: 
- Simple for users
- No spreadsheet editing required
- URL stays constant

**Cons**: 
- Must maintain file names

### Method 2: Update LogoURL Column

1. Upload new logo to any Drive location
2. Right-click → "Get link" → Copy link
3. Paste new URL into LogoURL column
4. Optionally update Logo thumbnail:
   ```javascript
   // In GAS, create thumbnail from new URL
   const thumbnail = SpreadsheetApp.newCellImage()
       .setSourceUrl(newDriveUrl)
       .build();
   cell.setValue(thumbnail);
   ```

**Pros**: 
- Flexible storage location
- Can use existing Drive files

**Cons**: 
- Requires spreadsheet editing
- Manual thumbnail update

## Self-Healing

### Automatic Population

The system checks for missing logos on:
- Spreadsheet open
- Scheduled triggers

If any group has TEMPLATE but no LogoURL, the system automatically runs `populateGroupLogos()`.

### Manual Re-Population

To repopulate all missing logos:
```javascript
autoPopulateGroupLogos();
```

To force-repopulate (clear LogoURL column first):
1. Delete LogoURL values for groups needing new logos
2. Run `populateGroupLogos()`

## Logo Display Thumbnail (Optional)

The Logo column provides visual reference but is NOT required for logo functionality.

### Enable Logo Column

1. Add "Logo" column to Groups sheet
2. Run `populateGroupLogos()` to create thumbnails

### Disable Logo Column

1. Remove "Logo" column from Groups sheet
2. LogoURL column still works for event creation

### Update Existing Thumbnail

```javascript
// In GAS
const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Groups');
const logoCell = sheet.getRange(rowNumber, logoColumnIndex);
const driveUrl = sheet.getRange(rowNumber, logoUrlColumnIndex).getValue();

const thumbnail = SpreadsheetApp.newCellImage()
    .setSourceUrl(driveUrl)
    .build();
logoCell.setValue(thumbnail);
```

## Troubleshooting

### Logo Not Appearing on Events

1. **Check LogoURL column**: Contains valid Drive URL?
2. **Check Drive permissions**: File shared as "Anyone with link"?
3. **Test URL**: Open URL in browser - does image load?
4. **Check console logs**: Errors during event creation?

### Population Errors

**"LogoURL column not found"**:
- Add LogoURL column to Groups sheet
- Run script again

**"Template has no logo_url"**:
- Template event doesn't have a logo
- Upload logo to template first, OR
- Manually upload logo to Drive and add URL

**"Failed to fetch template"**:
- Check RWGPS credentials
- Verify template URL is valid
- Check template is accessible

### Drive Folder Not Found

If "SCCCC Group Logos" folder is deleted:
1. Run `populateGroupLogos()` - creates folder automatically
2. Re-uploads all logos from templates

### File Upload Failures

If logo upload fails:
1. Check Drive quota (storage limit)
2. Check Drive API is enabled
3. Check script permissions include Drive access
4. Try manually uploading to test permissions

## API Reference

### populateGroupLogos()

```javascript
/**
 * Populate logos in Groups tab from template events
 * 
 * Downloads logos from templates, uploads to Drive, stores Drive URLs
 * Can be run multiple times safely (only updates missing logos)
 * 
 * @returns {{success: boolean, populated: number, skipped: number, errors: string[]}}
 */
function populateGroupLogos()
```

**Returns**:
```javascript
{
    success: true,
    populated: 7,      // Number of logos uploaded
    skipped: 2,        // Already had LogoURL
    errors: []         // Error messages if any
}
```

### autoPopulateGroupLogos()

```javascript
/**
 * Auto-populate group logos if missing (self-healing)
 * 
 * Called automatically by triggers
 * Safe to call multiple times - only populates missing logos
 */
function autoPopulateGroupLogos()
```

### groupLogosNeedPopulation()

```javascript
/**
 * Check if group logos need population
 * 
 * Returns true if any group has TEMPLATE but no LogoURL
 * 
 * @returns {boolean}
 */
function groupLogosNeedPopulation()
```

### getOrCreateLogoFolder()

```javascript
/**
 * Get or create the Drive folder for group logos
 * 
 * Creates "SCCCC Group Logos" folder if it doesn't exist
 * 
 * @returns {GoogleAppsScript.Drive.Folder}
 */
function getOrCreateLogoFolder()
```

### uploadLogoToDrive()

```javascript
/**
 * Upload logo blob to Drive and return shareable URL
 * 
 * If file exists, replaces it (deletes old, creates new)
 * 
 * @param {GoogleAppsScript.Base.Blob} blob - Image blob
 * @param {string} fileName - Name for the file (e.g., "Thursday.png")
 * @param {GoogleAppsScript.Drive.Folder} folder - Drive folder
 * @returns {string} Shareable Drive URL
 */
function uploadLogoToDrive(blob, fileName, folder)
```

## Migration from Template URLs

If you have old logo URLs pointing to RWGPS templates:

1. Clear existing Logo/LogoURL columns
2. Run `populateGroupLogos()`
3. Verify Drive folder contains all logos
4. Verify LogoURL column has Drive URLs
5. Test event creation includes logos

Old template URLs will be converted to permanent Drive storage.

## Best Practices

### Logo File Guidelines
- **Format**: PNG or JPG
- **Size**: Recommended 200-500 KB
- **Dimensions**: Square or 16:9 aspect ratio
- **File names**: Match group names for easy identification

### Maintenance
- **Backup Drive folder**: Periodically download all logos
- **Verify permissions**: Ensure "Anyone with link" sharing
- **Monitor quota**: Check Drive storage usage
- **Test updates**: Create test event after logo changes

### Performance
- Logos cached by RWGPS after first upload
- Drive access is fast (< 1 second per logo)
- Population script processes ~1 logo/second
- Self-healing runs in background, no user impact

## Related Documentation

- [Task 4.4 Implementation](../RWGPS_TASKS.md#task-44-part-b---logo-runtime-integration)
- [Groups Tab Setup](./FAQ.md#groups-configuration)
- [Event Creation](./FAQ.md#event-scheduling)
