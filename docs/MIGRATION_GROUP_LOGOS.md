# Migration Guide: Group Logos in Groups Tab

**Date**: January 13, 2026  
**Version**: Task 4.4 - createEvent with Logo Support  
**Impact**: Groups tab structure changes, one-time setup required

---

## Summary

Group logos are now stored directly in the Groups spreadsheet tab for use when creating events via the v1 API. This eliminates the need to copy from template events while still preserving group branding.

## What Changed

### Before
- Logos copied from template events using `copyTemplate()` web API
- Required web session authentication
- Templates had to exist for every ride

### After
- Logos stored in Groups tab as image blobs
- Used when creating events via `createEvent()` v1 API
- Requires Basic Auth only (no web session)
- Self-healing: Automatically populates missing logos

## Migration Steps

### Step 1: Add Logo Column (Manual - One Time)

1. **Open the spreadsheet** in Google Sheets
2. **Navigate to the "Groups" tab**
3. **Add a new column** after the "TEMPLATE" column:
   - **Column name**: `Logo`
   - **Location**: Between "TEMPLATE" and "GoogleCalendarId" columns
   - **Suggested layout**:
     ```
     Group | TEMPLATE                         | Logo | GoogleCalendarId | MIN_LENGTH | ...
     A     | https://.../events/404019        |      | groupA@gmail.com | 30         | ...
     B     | https://.../events/404020        |      | groupB@gmail.com | 40         | ...
     ```

4. **Save the spreadsheet**

### Step 2: Populate Logos (Automated - Self-Healing)

**OPTION A: Automatic (Recommended)**

The system will automatically populate missing logos when:
- The spreadsheet opens (via `onOpen` trigger)
- Any scheduled operation runs

**No manual action needed!** The system detects empty Logo cells and populates them automatically.

**OPTION B: Manual (If you want to do it now)**

1. Open **Script Editor** from the spreadsheet: Extensions > Apps Script
2. Find the function `populateGroupLogos()` in the left sidebar
3. Click **Run**
4. Wait for completion (check logs for progress)
5. Return to spreadsheet and verify logos appear in Logo column

### Step 3: Verify Logos

1. **Open the Groups tab**
2. **Check the Logo column** - you should see small thumbnails of the group logos
3. **Expected result**: Each group (A, B, C, D, O1, O2, O3) has a logo image

**If logos don't appear**:
- Check that the TEMPLATE column has valid event URLs
- Run `populateGroupLogos()` manually from Script Editor
- Check execution logs for error messages

## Technical Details

### How It Works

1. **Logo Storage**: Logos are stored as `Blob` objects in spreadsheet cells
2. **One-Time Fetch**: Script fetches logos from template events and inserts into cells
3. **Self-Healing**: On every script run, checks if logos are missing and populates them
4. **Caching**: Logos loaded via `getGroupSpecs()` just like other group data

### Self-Healing Behavior

The system automatically checks for missing logos and populates them:

```javascript
// Called automatically by triggers
function autoPopulateGroupLogos() {
    if (groupLogosNeedPopulation()) {
        populateGroupLogos();
    }
}
```

**When self-healing runs**:
- Spreadsheet opens (`onOpen` trigger)
- Daily announcement check (2 AM trigger)
- Daily RWGPS sync (2 AM trigger)

**What gets populated**:
- Groups with TEMPLATE URL but no Logo
- Skips groups that already have logos (safe to run multiple times)

### Updating Logos

To update a group's logo:

**Option 1: Replace in spreadsheet**
1. Delete the existing logo image in the cell
2. Insert new image: Insert > Image > Image in cell
3. Script will use the new logo for future events

**Option 2: Update template and re-populate**
1. Update the template event's logo on RWGPS
2. Delete the logo from the Groups tab cell
3. Let self-healing populate the new logo automatically
   - OR run `populateGroupLogos()` manually

## Troubleshooting

### Logos Not Appearing

**Problem**: Logo column added but no images appear

**Solution**:
1. Check execution logs: View > Logs in Script Editor
2. Verify TEMPLATE column has valid RWGPS event URLs
3. Run `populateGroupLogos()` manually
4. Check for error messages

### Script Errors

**Problem**: `populateGroupLogos()` fails with error

**Common causes**:
- **"Logo column not found"**: Add the Logo column to Groups tab
- **"Template has no logo_url"**: Template event doesn't have a logo
- **"403 Forbidden"**: Check RWGPSClient credentials in Script Properties

**Solution**: Check logs for specific error message, fix the issue, re-run

### Logo Quality Issues

**Problem**: Logos appear blurry or low resolution

**Cause**: Google Sheets may resize images to fit cells

**Solution**:
1. Widen the Logo column for better display
2. Logo quality in created events is unaffected (uses original from template)

## Rollback Plan

If needed, you can revert to the old template-copy approach:

1. **Don't delete the Logo column** - it's harmless if unused
2. **Use `copyTemplate()` instead of `createEvent()`** in scheduleEvent
3. Logos will be copied from templates as before

## Validation

After migration, verify:

1. ✅ Logo column exists in Groups tab
2. ✅ All groups have logo images (except those without templates)
3. ✅ New events created via "Schedule Selected" have logos
4. ✅ No errors in execution logs

## Support

If you encounter issues:

1. **Check logs**: Script Editor > View > Logs
2. **Run manual test**: `populateGroupLogos()` from Script Editor
3. **Contact**: [Your support contact here]

## Timeline

- **Preparation**: Add Logo column (5 minutes)
- **First run**: Automatic or manual `populateGroupLogos()` (1-2 minutes)
- **Future**: Self-healing runs automatically (no maintenance needed)

---

**Migration Complete!** Group logos are now managed in the Groups tab.
