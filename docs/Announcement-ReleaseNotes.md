# Announcement Feature Release Notes

**Release Date:** December 2, 2025  
**Feature:** Automated Ride Announcements  
**Issue:** #91

## Overview

This release introduces automated ride announcement functionality. Ride schedulers can create announcement documents from templates, which are automatically sent via email 2 days before the ride at 6:00 PM.

## Spreadsheet Changes

### New Columns Added to "Consolidated Rides" Sheet

The following columns have been added to track announcement status:

| Column Name | Type | Description | Example Values |
|-------------|------|-------------|----------------|
| `Announcement` | URL | Link to the Google Doc announcement | `https://docs.google.com/document/d/...` |
| `SendAt` | DateTime | Scheduled send time (6PM, 2 days before ride) | `2025-12-04 18:00:00` |
| `Status` | Text | Current status of announcement | `pending`, `sent`, `failed` |
| `Attempts` | Number | Number of send attempts | `0`, `1`, `2`, etc. |
| `LastError` | Text | Error message if send failed | Empty or error description |
| `LastAttemptAt` | DateTime | Timestamp of last send attempt | `2025-12-02 18:05:23` |

**Column Order:** These columns should be added after the existing ride management columns. They are independent and do not interfere with existing functionality.

**Data Types:** 
- URL columns will display as clickable hyperlinks
- DateTime columns should be formatted as `M/d/yyyy H:mm:ss` for proper sorting
- Status values are lowercase strings

### New "Personal Templates" Sheet (Optional)

A new optional sheet allows ride schedulers to use their own announcement templates:

| Column Name | Type | Description | Example Values |
|-------------|------|-------------|----------------|
| `Email` | Text | Ride scheduler's email address | `toby.h.ferguson@gmail.com` |
| `TemplateURL` | URL | Link to personal template document | `https://docs.google.com/document/d/...` |
| `Active` | Boolean | Whether to use this template | `TRUE`, `FALSE` |
| `Notes` | Text | Optional notes about template | `Uses emoji-heavy format` |

**Sheet Behavior:**
- Sheet is optional - if not present, all users use master template
- Ride schedulers can add their own entries (one row per scheduler)
- `Active` column must be `TRUE` for template to be used
- Email matching is case-insensitive
- System checks personal templates first, falls back to master template if:
  - Personal Templates sheet doesn't exist
  - User has no entry in sheet
  - User's entry has `Active = FALSE`
  - Template URL is invalid

## Global Properties Added

The following entries must be added to the **Globals** sheet:

| Key | Value | Description |
|-----|-------|-------------|
| `RIDE_ANNOUNCEMENT_MASTER_TEMPLATE` | Document URL or ID | URL or ID of the Google Doc template used for announcements |
| `RIDE_ANNOUNCEMENT_FOLDER_URL` | Folder URL | Google Drive folder where announcement docs are created |
| `RIDE_ANNOUNCEMENT_FROM_EMAIL` | Email address | "From" email for announcements (defaults to active user if not set) |
| `RIDE_ANNOUNCEMENT_RECIPIENTS_EMAIL` | Email address | Distribution list email (e.g., `ride_announcements@sc3.club`) |
| `RIDE_SCHEDULER_GROUP_EMAIL` | Email address | Group email that gets edit access to announcements |

### Template Field Enhancements

The announcement template system now supports the following fields (case-insensitive):

**Basic Fields:**
- `{RideName}`, `{Date}`, `{StartTime}`, `{Location}`, `{Address}`
- `{Group}`, `{RideLeaders}`, `{RideURL}`, `{RouteURL}`, `{RouteName}`

**Route-Based Fields (NEW):**
- `{Length}` - Route distance in miles (e.g., "24.5 miles")
- `{Gain}` - Elevation gain in feet (e.g., "1,234 ft")
- `{FPM}` - Feet per mile climbed (e.g., "50 ft/mi")
- `{Lat}` - Starting latitude (e.g., "36.9741")
- `{Long}` - Starting longitude (e.g., "-122.0308")
- `{StartPin}` - Map link to starting location

**Field Name Capitalization:**
- Fields can use any capitalization: `{routeurl}`, `{RouteURL}`, `{ROUTEURL}` all work
- Route-based fields use capitalized names for consistency with RWGPS data

## Document Template Features

### Template Field Expansion
When an announcement document is created, all template fields are automatically replaced with actual ride data.

### Image and Emoji Support
The announcement system supports rich content:
- **Emoji characters** (🚴‍♀️ ✨) are preserved in emails
- **Photos and images** can be embedded in the document
- **Small images** (≤20×20 pixels, typically emojis) are sent as Unicode characters
- **Larger images** are base64-encoded and embedded in the email
- **Image size warning:** Images >100KB may cause email delivery issues

### Email Formatting
- Documents are converted to HTML email with formatting preserved
- Supports bold, italic, underline, colors, and hyperlinks
- Lists (bullet and numbered) are preserved
- Tables are converted to HTML tables
- Horizontal rules become `<hr>` tags

## Automated Trigger

A time-based trigger is automatically installed to check for pending announcements.

**Trigger Name:** `processAnnouncementQueue`  
**Schedule:** Every 1 hour  
**Function:** Checks for announcements due to send and sends 24-hour reminders

**Automatic Installation:**
- Trigger is automatically created when the **first announcement is created**
- No manual setup required - just create an announcement via the menu
- Only one trigger exists per spreadsheet (managed via Script Properties)
- Trigger ID is stored in Script Properties with key `announcementTriggerId`

**How It Works:**
1. Ride scheduler creates first announcement (Extensions → RLC Functions → Create Announcement)
2. System automatically checks if trigger exists
3. If not found, trigger is created automatically
4. Subsequent announcements use the existing trigger

**Verification:**
- Open Apps Script editor: Extensions → Apps Script
- Click "Triggers" (clock icon on left sidebar)
- Verify `processAnnouncementQueue` appears with "Time-driven" frequency "Every hour"

**Manual Installation (if needed):**
If trigger is accidentally deleted or needs to be recreated:
1. Simply create any new announcement
2. System will detect missing trigger and recreate it automatically

OR manually create via Apps Script:
1. Extensions → Apps Script → Triggers
2. Add Trigger:
   - Function: `processAnnouncementQueue`
   - Event source: Time-driven
   - Type: Hour timer
   - Interval: Every hour

## Migration Notes

### For Existing Spreadsheets
1. Add the 6 new columns to the "Consolidated Rides" sheet (after existing columns)
2. **Optionally** create "Personal Templates" sheet if ride schedulers want custom templates
3. Add the 5 Global properties to the "Globals" sheet
4. Create an announcement template document with placeholder fields
5. Update the Globals sheet with the template URL and folder URL
6. No data migration needed - existing rides continue to work normally

### Personal Templates Sheet Setup (Optional)
If you want to allow ride schedulers to use personal templates:
1. Create new sheet named "Personal Templates" (exact name required)
2. Add columns: `Email`, `TemplateURL`, `Active`, `Notes`
3. Ride schedulers add their own rows:
   - Email: Their full email address
   - TemplateURL: Link to their template document  
   - Active: `TRUE` to enable
   - Notes: Optional description
4. Sheet is read-only to the code - schedulers manage it themselves

### Backward Compatibility
- Existing functionality is not affected
- Rows without announcement data are ignored by the announcement system
- The new columns can remain empty for rides that don't need announcements

## Testing Checklist

Before deploying to production:
- [ ] Verify all 6 columns added to "Consolidated Rides" sheet
- [ ] Verify all 5 Global properties configured
- [ ] Create test announcement template with sample fields
- [ ] Test document creation from master template
- [ ] **Optional**: Create "Personal Templates" sheet
- [ ] **Optional**: Test document creation with personal template
- [ ] Test template field expansion
- [ ] Test email sending
- [ ] Test 24-hour reminder functionality
- [ ] Test retry logic with intentional failures
- [ ] Verify trigger installation
- [ ] Test with emoji and image content

## Known Limitations

1. **Email Size:** Total email size should stay under 25MB (Gmail limit)
2. **Image Encoding:** Images >100KB may not display in some email clients
3. **Send Window:** Announcements are checked every 15 minutes (±15 min precision)
4. **Retry Window:** Failed sends retry for 24 hours, then mark as permanently failed
5. **Permissions:** Announcement documents require shared drive or proper permissions

## Support

For issues or questions:
- Check the Operator Manual for troubleshooting steps
- Review Script execution logs in Apps Script console
- Verify Global properties are correctly configured
- Ensure Google Drive permissions are properly set
