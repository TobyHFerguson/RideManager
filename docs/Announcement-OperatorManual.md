# Ride Announcement System - Operator Manual

**For:** Technical operators who maintain the announcement system  
**Focus:** Monitoring, troubleshooting, system health, manual interventions

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Monitoring Dashboard](#monitoring-dashboard)
3. [Troubleshooting](#troubleshooting)
4. [Manual Interventions](#manual-interventions)
5. [Testing Procedures](#testing-procedures)
6. [System Maintenance](#system-maintenance)
7. [Common Issues and Fixes](#common-issues-and-fixes)

---

## System Overview

The Ride Announcement System is a fully automated email notification system for scheduled rides.

### Key Components

- **Trigger:** Time-based trigger runs every 1 hour (auto-installed)
- **Function:** `processAnnouncementQueue`
- **Storage:** Spreadsheet columns for state tracking
- **Template:** Google Doc master template
- **Retry Logic:** Exponential backoff over 24 hours
- **Notifications:** 24-hour reminder emails to ride schedulers

### Send Schedule

- **Main send:** 6:00 PM, 2 calendar days before ride
- **Reminder:** 24 hours before main send
- **Check interval:** Every 1 hour
- **Send window:** ±1 hour precision

### Automatic Trigger Installation

**The trigger installs itself automatically** when the first announcement is created:
1. Ride scheduler creates announcement (Extensions → Create Announcement)
2. System checks if trigger exists (via Script Properties)
3. If missing, creates `processAnnouncementQueue` hourly trigger
4. Stores trigger ID in Script Properties (`announcementTriggerId`)

**No manual setup required** for normal operation.

### Automatic Retry Schedule

If a send fails, the system automatically retries:

| Attempt | Interval |
|---------|----------|
| 1st retry | 5 minutes |
| 2nd retry | 15 minutes |
| 3rd retry | 30 minutes |
| 4th retry | 1 hour |
| 5th retry | 2 hours |
| 6th retry | 4 hours |
| 7th+ retry | 8 hours |

**Retry window:** 24 hours from scheduled send time, then permanently fails

---

## Monitoring Dashboard

### Spreadsheet Columns (Monitoring View)

| Column | Operator Focus | Action Required |
|--------|----------------|-----------------|
| `Announcement` | Verify doc exists and is accessible | If broken link, investigate |
| `SendAt` | Check timing is correct | If wrong, may need to adjust manually |
| `Status` | **Primary health indicator** | `failed` requires attention |
| `Attempts` | High numbers (>3) indicate problems | Investigate recurring failures |
| `LastError` | **First place to check for issues** | Read error, take corrective action |
| `LastAttemptAt` | Verify system is trying to send | If old timestamp, trigger may be broken |

### Quick Health Check

**Filter for problems:**
1. Open "Consolidated Rides" sheet
2. Create filter on `Status` column
3. Filter for `failed` status
4. Review `LastError` for each failed row
5. Take corrective action (see troubleshooting section)

**Check upcoming sends:**
1. Filter `Status` = `pending`
2. Sort by `SendAt` ascending
3. Verify send times look reasonable
4. Check that `SendAt` dates are in the future (if past + pending = problem)

### Execution Logs

**Access execution logs:**
1. Open spreadsheet → Extensions → Apps Script
2. Click "Executions" (left sidebar)
3. Find recent `processAnnouncementQueue` runs
4. Click execution to view detailed logs

**Key log patterns:**

| Log Message | Meaning | Action |
|-------------|---------|--------|
| `"Processing announcement for..."` | Normal - checking due items | None |
| `"Sending announcement email..."` | Normal - attempting send | None |
| `"Successfully sent..."` | ✅ Send worked | None - success! |
| `"Error sending..."` | ❌ Send failed | Read error, fix root cause |
| `"Skipping emoji-sized image..."` | Normal - emoji in document | None |
| `"Warning: Large inline image..."` | May cause email delivery issues | Ask scheduler to resize images |
| No recent executions | ⚠️ Trigger may be broken | Reinstall trigger |

### Trigger Health Check

**Verify trigger is running:**
1. Extensions → Apps Script → Triggers (clock icon)
2. Confirm `checkAnnouncementsAndReminders` is listed
3. Check "Last run" time (should be within last 15 minutes)
4. If missing or disabled, recreate it (see System Maintenance section)

---

## Troubleshooting

### Problem: Announcement Shows `failed` Status

**Diagnostic steps:**
1. Check `LastError` column for error message
2. Review execution logs for full error details
3. Identify error category:

**Permission Errors:**
- Error mentions "access denied" or "permissions"
- **Fix:** Check document sharing settings, verify document hasn't been moved/deleted

**Email Quota Errors:**
- Error mentions "quota" or "limit exceeded"
- **Fix:** Wait 24 hours for quota reset, or use different sender email

**Document Errors:**
- Error mentions "document not found" or "invalid ID"
- **Fix:** Verify `Announcement` URL is valid, document wasn't deleted

**Network/Timeout Errors:**
- Error mentions "timeout" or "network"
- **Fix:** System will auto-retry, no action needed

**Recovery:**
1. Fix underlying issue (permissions, document, etc.)
2. Change `Status` from `failed` to `pending`
3. Optionally reset `Attempts` to 0
4. Clear `LastError`
5. System will retry on next check (within 15 min)

### Problem: Announcement Stuck in `pending`

**Symptoms:**
- `Status` = `pending`
- `SendAt` time is in the past (more than 1 hour ago)
- `Attempts` = 0 or very low

**Diagnostic:**
1. Check trigger is running (Executions log should show recent runs)
2. Check `SendAt` is actually in the past
3. Review execution logs for errors

**Common causes:**
- Trigger disabled or deleted
- Script execution failing before reaching announcement code
- `SendAt` timezone issue (rare)

**Fix:**
1. If trigger missing: Create new announcement to reinstall trigger
2. If trigger failing: Check execution logs, fix script errors
3. If urgent: Manually run `checkAnnouncementsAndReminders()` function

### Problem: Emails Sent But Not Received

**Diagnostic:**
1. Verify `Status` = `sent` (proves email was sent)
2. Check recipient's spam/junk folder
3. Verify `RIDE_ANNOUNCEMENT_RECIPIENTS_EMAIL` in Globals is correct
4. Check execution logs for successful send confirmation

**Fix:**
1. If wrong recipient email: Update Globals, resend (change Status to pending)
2. If spam issue: Work with email admin to whitelist sender
3. If email never sent despite `sent` status: Check logs for actual send confirmation

### Problem: Images Broken in Email

**Symptoms:**
- Email shows broken image icons or missing images
- `Status` = `sent` (email was sent successfully)

**Diagnostic:**
1. Check execution logs for image size warnings
2. Open announcement document to see image sizes
3. Large images (>100KB) often fail to display in email clients

**Fix:**
1. For future: Ask ride schedulers to resize images <100KB
2. For this send: Cannot fix (email already sent)
3. Consider sending correction email with properly sized images

### Problem: No Announcements Processing

**Symptoms:**
- Multiple announcements with `pending` status and past `SendAt` times
- Execution logs show no recent runs
- Trigger appears in list but not executing

**Diagnostic:**
1. Check Apps Script → Executions for errors
2. Verify trigger exists and is enabled
3. Check script quotas (Apps Script → Project Settings)

**Fix:**
1. **Delete and recreate trigger:**
   - Apps Script → Triggers → Delete `checkAnnouncementsAndReminders`
   - Create new announcement (auto-installs trigger)
2. **Manually run function:**
   - Apps Script → Editor → Select `checkAnnouncementsAndReminders`
   - Click Run
   - Check logs for errors
3. **Check quotas:**
   - If quota exceeded, wait for reset (usually 24 hours)

---

## Manual Interventions

### Force Immediate Send

**Use case:** Ride scheduler needs announcement sent now, can't wait for schedule

**Method 1: Change SendAt time**
```
1. Find row in spreadsheet
2. Edit `SendAt` column to: current time minus 2 hours
3. Verify `Status` = `pending`
4. Wait up to 1 hour for automatic send (or run trigger manually)
5. Verify `Status` changes to `sent`
```

**Method 2: Manual function execution**
```
1. Extensions → Apps Script
2. Editor → Select function: `processAnnouncementQueue`
3. Click Run button
4. Check execution log for results
5. Verify row `Status` updated to `sent`
```

### Resend Failed Announcement

**Use case:** Announcement failed, root cause fixed, need to resend

**Steps:**
```
1. Fix underlying issue (permissions, email address, document, etc.)
2. In spreadsheet, edit row:
   - Change `Status` from `failed` to `pending`
   - Optionally: Reset `Attempts` to 0
   - Clear `LastError` (delete content)
3. System will retry within 1 hour (or run trigger manually for immediate retry)
4. Monitor status change to `sent`
```

### Cancel Pending Announcement

**Use case:** Ride cancelled or announcement sent by mistake

**Steps:**
```
1. Change `Status` from `pending` to `cancelled`
2. System will skip this announcement
3. Document remains in Drive (can be deleted manually if needed)
```

### Reschedule Announcement

**Use case:** Send time needs to change (ride date changed, etc.)

**Steps:**
```
1. Edit `SendAt` to new desired date/time
2. Keep `Status` = `pending`
3. System will send at new time
4. Verify new time is in the future
```

### Send Test to Personal Email

**Use case:** Test announcement system before going live

**Steps:**
```
1. In Globals sheet, temporarily change:
   - `RIDE_ANNOUNCEMENT_RECIPIENTS_EMAIL` = your personal email
2. Create test ride row and announcement
3. Change `SendAt` to immediate time (10 min ago)
4. Wait for send (or manually trigger)
5. Verify email received at personal address
6. IMPORTANT: Restore original recipient email in Globals
7. Delete test row
```

### Bypass Retry Logic (Emergency Send)

**Use case:** Announcement stuck in retry loop, need to force send now regardless of attempts

**Steps:**
```
1. Open Apps Script editor
2. Create temporary script:
   ```javascript
   function emergencySend() {
     const row = 123; // Row number with the announcement
     const manager = new AnnouncementManager();
     // Get row from adapter
     const adapter = ScheduleAdapter.getInstance();
     const rows = adapter.getAllRows();
     const targetRow = rows.find(r => r.rowNum === row);
     
     if (targetRow) {
       manager.sendAnnouncement(targetRow);
       Logger.log('Emergency send completed');
     }
   }
   ```
3. Replace row number with actual row
4. Run function
5. Check logs and row status
6. Delete temporary function after use
```

---

## Testing Procedures

### Pre-Deployment Testing

**1. Document Creation Test**
```
✓ Create test ride row
✓ Run Create Announcement
✓ Verify document exists in folder
✓ Verify template fields replaced
✓ Verify permissions (RS group has edit access)
✓ Verify row columns populated correctly
```

**2. Immediate Send Test**
```
✓ Create announcement with future SendAt
✓ Change SendAt to 10 minutes ago
✓ Run trigger manually or wait 15 min
✓ Verify Status → "sent"
✓ Verify email received at test address
✓ Check execution logs for success confirmation
```

**3. Failure and Retry Test**
```
✓ Create announcement
✓ Break document URL (invalid ID)
✓ Change SendAt to past
✓ Trigger send
✓ Verify Status = "failed"
✓ Verify LastError populated
✓ Fix document URL
✓ Change Status to "pending"
✓ Verify system retries and succeeds
```

**4. 24-Hour Reminder Test**
```
✓ Create announcement
✓ Set SendAt to exactly 24 hours from now
✓ Wait for trigger
✓ Verify reminder email sent to ride scheduler
✓ Check execution logs
```

**5. Image/Emoji Test**
```
✓ Add emojis to template (🚴‍♀️ ✨)
✓ Add small image (<100KB)
✓ Create announcement
✓ Send to test email
✓ Verify emojis display correctly
✓ Verify images embedded properly
✓ Check execution logs for warnings
```

### Performance Testing

**Monitor trigger execution time:**
```
1. Apps Script → Executions
2. Find checkAnnouncementsAndReminders runs
3. Check execution duration
4. Should be <30 seconds for normal loads
5. If >30 seconds, investigate (too many pending rows?)
```

**Test with multiple announcements:**
```
1. Create 10-20 test announcements
2. Set all SendAt to same time (past)
3. Run trigger
4. Verify all sent successfully
5. Check execution time
6. Delete test rows
```

---

## System Maintenance

### Trigger Management

**Check trigger status:**
```
1. Apps Script → Triggers
2. Verify `processAnnouncementQueue` exists
3. Check frequency: Every hour (time-based)
4. Verify "Last run" is recent (within last hour)
5. Check "Next run" is scheduled
```

**Reinstall trigger (automatic method - RECOMMENDED):**
```
1. Delete existing trigger if present (Apps Script → Triggers → Delete)
2. Create any new announcement (Extensions → Create Announcement)
3. System automatically detects missing trigger and recreates it
4. Verify in Triggers list: `processAnnouncementQueue` appears
```

**Manual trigger creation** (if automatic install fails):
```
1. Apps Script → Editor
2. Click clock icon (Triggers) in left sidebar
3. Click "Add Trigger" button (bottom right)
4. Configure:
   - Function: processAnnouncementQueue
   - Event source: Time-driven
   - Type: Hour timer
   - Interval: Every hour
5. Click Save
6. Verify trigger appears in list
```

**Note:** Do NOT manually set trigger frequency to less than 1 hour, as the system expects hourly checks.

### Configuration Verification

**Monthly check of Globals:**
```
1. Open Globals sheet
2. Verify all announcement globals are set:
   - RIDE_ANNOUNCEMENT_MASTER_TEMPLATE (URL or ID)
   - RIDE_ANNOUNCEMENT_FOLDER_URL (folder URL)
   - RIDE_ANNOUNCEMENT_FROM_EMAIL (email address)
   - RIDE_ANNOUNCEMENT_RECIPIENTS_EMAIL (distribution list)
   - RIDE_SCHEDULER_GROUP_EMAIL (RS group email)
3. Test template URL opens correctly
4. Test folder URL is accessible
5. Verify emails are valid
```

### Routine Maintenance Tasks

**Weekly:**
- Check for stuck `pending` announcements (SendAt >1 week old)
- Review `failed` status rows, investigate recurring issues
- Check execution logs for repeated errors
- Verify trigger is running normally

**Monthly:**
- Clean up old test announcements/documents
- Review announcement folder for orphaned documents
- Check template for updates/improvements
- Verify email distribution list is current

**Quarterly:**
- Test full announcement workflow end-to-end
- Review and update template based on feedback
- Check Apps Script quotas and usage
- Review these operator docs for accuracy

### Backup and Recovery

**Template backup:**
```
1. Make copy of master template
2. Store in safe location
3. Version control (name: "Template v2024-12" etc.)
4. Update if template changed
```

**Configuration backup:**
```
1. Export Globals sheet values
2. Document current trigger settings
3. Store in documentation folder
4. Update when configuration changes
```

---

## Common Issues and Fixes

### Issue: High Email Bounce Rate

**Symptoms:**
- Emails marked as `sent` but recipients report not receiving
- Bounce notifications in sender inbox

**Investigation:**
1. Check recipient email address is valid
2. Verify sender email reputation (not blacklisted)
3. Check email size (including embedded images)
4. Review email content for spam triggers

**Resolution:**
- Update invalid recipient addresses
- Reduce image sizes in documents
- Consider using text-only mode for testing
- Work with email admin to improve sender reputation

### Issue: Quota Exceeded

**Symptoms:**
- Error mentions "quota exceeded" or "rate limit"
- Multiple announcements failing simultaneously

**Investigation:**
1. Apps Script → Project Settings → Quotas
2. Check daily email send limit
3. Count pending announcements

**Resolution:**
- Wait 24 hours for quota reset
- Spread announcement sends across multiple days
- Consider using organization email (higher quotas)
- Contact Google Workspace admin for quota increase

### Issue: Document Permission Denied

**Symptoms:**
- `LastError` mentions "access denied" or "permission"
- Document exists but can't be read

**Investigation:**
1. Check document sharing settings
2. Verify script account has access
3. Check if document moved to different folder
4. Verify folder permissions

**Resolution:**
- Share document with script account (session user)
- Move document back to announcements folder
- Grant folder access to script account
- Update document permissions: Anyone with link can view

### Issue: Template Fields Not Expanding

**Symptoms:**
- Document created but shows `{FieldName}` instead of values
- Only some fields expanded

**Investigation:**
1. Check route has RWGPS data (for route fields)
2. Verify row has required data (RideName, Leaders, etc.)
3. Check template field syntax (case-insensitive but must match)
4. Review execution logs for template expansion errors

**Resolution:**
- Manually edit document to fill in missing fields
- Update master template with correct field names
- Ensure RWGPS route is properly linked
- For future: Fix row data before creating announcement

---

## Quick Reference

### Critical Files and Locations

| Resource | Location | Purpose |
|----------|----------|---------|
| Master Template | Globals: `RIDE_ANNOUNCEMENT_MASTER_TEMPLATE` | Source for new announcements |
| Announcement Folder | Globals: `RIDE_ANNOUNCEMENT_FOLDER_URL` | Storage for created docs |
| Recipient Email | Globals: `RIDE_ANNOUNCEMENT_RECIPIENTS_EMAIL` | Where emails are sent |
| Trigger Function | Apps Script: `processAnnouncementQueue` | Runs every hour (auto-installed) |
| Trigger ID Storage | Script Properties: `announcementTriggerId` | Tracks installed trigger |
| Execution Logs | Apps Script → Executions | Debug and monitoring |

### Status Decision Tree

```
Status = pending + SendAt in past
    ↓
Trigger running?
    ├─ NO → Reinstall trigger
    └─ YES → Check execution logs
        ↓
    Errors in logs?
        ├─ YES → Fix errors, retry
        └─ NO → Wait up to 15 min
```

```
Status = failed
    ↓
Check LastError
    ↓
Fix root cause
    ↓
Change Status to "pending"
    ↓
System auto-retries
```

### Emergency Contacts

**For escalation:**
- Apps Script quota issues → Google Workspace admin
- Email delivery problems → Email administrator
- Template/document issues → Content manager
- Spreadsheet structure → System developer

### Useful Commands

**Run specific function:**
```javascript
// In Apps Script editor
processAnnouncementQueue()  // Main trigger function - check and send due items
```

**Query spreadsheet data:**
```javascript
// Get all pending announcements
const adapter = ScheduleAdapter.getInstance();
const rows = adapter.getAllRows();
const pending = rows.filter(r => r.Status === 'pending');
Logger.log(`Pending count: ${pending.length}`);
```

**Check specific row:**
```javascript
// Debug specific row
const adapter = ScheduleAdapter.getInstance();
const row = adapter.getAllRows().find(r => r.rowNum === 123);
Logger.log(`Row ${row.rowNum}: Status=${row.Status}, SendAt=${row.SendAt}`);
```
