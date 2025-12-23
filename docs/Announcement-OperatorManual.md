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

- **Triggers:** Managed centrally via TriggerManager (owner-only installation)
  - Daily backstop: Runs at 2:00 AM daily
  - Scheduled triggers: Fire at precise announcement send times
- **Functions:** `dailyAnnouncementCheck` (backstop), `announcementTrigger` (scheduled)
- **Spreadsheet:** Spreadsheet columns + Document Properties for trigger coordination
- **Folders & Files:** Master template and announcements stored in [Ride Announcements](https://drive.google.com/drive/folders/1uwZzbl1SkkAOwA_6-uIj-ZR368_sxJNm?usp=sharing) folder. Share with Ride Scheduler group as `Content Manager`.
- **Failure Handling:** Immediate notification to Ride Schedulers on failure (manual retry required)
- **Notifications:** 24-hour reminder emails to ride schedulers

### Send Schedule

- **Main send:** 6:00 PM, 2 calendar days before ride
- **Reminder:** 24 hours before main send
- **Precision:** Scheduled triggers fire at exact send time
- **Backstop:** Daily check at 2 AM catches any missed sends

### Trigger Installation (Owner-Only)

**Triggers must be installed by the spreadsheet owner:**

1. Open spreadsheet as the owner
2. **Ride Schedulers → Install Triggers** from the menu
3. Confirm installation
4. Verify success message shows all 4 triggers installed:
   - `onOpen` (spreadsheet open event)
   - `editHandler` (cell edit event)
   - `dailyAnnouncementCheck` (2 AM daily backstop)
   - `dailyRWGPSMembersDownload` (2 AM daily RWGPS sync)

**Installation also immediately runs:**
- `dailyAnnouncementCheck` - Processes any pending announcements right away
- `dailyRWGPSMembersDownload` - Syncs RWGPS members list immediately

**Owner-only restriction:** Only the spreadsheet owner can install triggers to prevent conflicts from multiple users. Other users will see an error if they attempt installation.

**Idempotent operation:** Safe to run multiple times - will not create duplicate triggers.


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
| No recent executions | ⚠️ Triggers not installed | Owner must run "Install Triggers" menu |

### Trigger Health Check

**Verify triggers are installed:**
1. Extensions → Apps Script → Triggers (clock icon)
2. Confirm these triggers exist:
   - `onOpen` - On open event
   - `editHandler` - On edit event  
   - `dailyAnnouncementCheck` - Time-driven, daily at 2 AM
3. Check "Last run" time for daily triggers (should run once per day)
4. Check for dynamically created triggers (may not be present):
   - `announcementTrigger` - Created when announcements are scheduled, **self-removes after firing**
   - **Note**: These triggers clean themselves up automatically after execution

**If triggers are missing:**
- Must be reinstalled by **spreadsheet owner only**
- Use **Ride Schedulers → Install Triggers** menu
- See [System Maintenance](#system-maintenance) section for details

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


**Recovery:**
1. Fix underlying issue (permissions, document, etc.)
2. Change `Status` from `failed` to `pending`
3. Optionally reset `Attempts` to 0
4. Clear `LastError`
5. Use `Send Pending Announcements`

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
1. **Reinstall triggers (Owner-only):**
   - Spreadsheet → Ride Schedulers → Install Triggers
   - Check User Activity Log for installation confirmation
2. **Manually run function:**
   - Apps Script → Editor → Select `dailyAnnouncementCheck`
   - Click Run
   - Check logs for errors
3. **Verify owner status:**
   - Only spreadsheet owner can install/manage triggers
   - Verify current user is owner via File → Share
4. **Check quotas:**
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
3. Run `Send Pending Announcements`
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

## Quick Reference

### Critical Files and Locations

| Resource | Location | Purpose |
|----------|----------|---------|
| Master Template | Globals: `RIDE_ANNOUNCEMENT_MASTER_TEMPLATE` | Default template for all users |
| Personal Templates | Sheet: `Personal Templates` (optional) | User-specific template preferences |
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
        ├─ YES → Fix errors, update ride to retry
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
Use `Send Pending Announcements`
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

---

## Cancellation and Reinstatement Handling

### Overview

The system automatically handles announcements when rides are cancelled or reinstated. Email notifications are sent based on timing relative to the scheduled send time.

### Configuration

Two additional global properties must be configured:

| Property | Value | Purpose |
|----------|-------|---------|
| `CANCELLATION_TEMPLATE` | Google Doc URL | Template for cancellation emails |
| `REINSTATEMENT_TEMPLATE` | Google Doc URL | Template for reinstatement emails |

**Setup:**
1. Create cancellation template document (similar to regular announcement template)
2. Add `{CancellationReason}` field for user-provided reason
3. Set CANCELLATION_TEMPLATE in Globals sheet to document URL
4. Repeat for reinstatement template with `{ReinstatementReason}` field

### Email Timing Logic

#### Cancellation

**Before SendAt:**
- Status → `cancelled`
- No email sent
- Scheduled announcement blocked
- Reminders blocked

**After SendAt:**
- Status → `cancelled`
- Cancellation email sent immediately
- Template expanded with ride data
- User activity logged

#### Reinstatement

**Before SendAt:**
- Status → `pending`
- No email sent
- Announcement returns to queue
- Will send at scheduled time

**After SendAt:**
- Status → `pending`
- Reinstatement email sent immediately
- Template expanded with ride data
- Note: Past SendAt means no future scheduled send

### Troubleshooting

#### Problem: No cancellation/reinstatement email sent

**Symptoms:**
- Ride cancelled/reinstated but no email received
- No error in LastError column

**Investigation:**
1. Check if announcement exists (Announcement column not empty)
2. Verify Status column value
3. Check SendAt time vs current time
4. Verify CANCELLATION_TEMPLATE/REINSTATEMENT_TEMPLATE in Globals
5. Check Apps Script execution logs

**Common causes:**
- Template URL not configured in Globals
- SendAt time not yet reached (email only sent after SendAt)
- Announcement status was already `cancelled` (for reinstatement)
- No announcement was created for the ride

#### Problem: Template fields not expanding

**Symptoms:**
- Email sent but shows `{CancellationReason}` or `{ReinstatementReason}` unexpanded

**Investigation:**
1. Check if reason was provided during cancellation/reinstatement
2. Verify template field syntax matches exactly
3. Review execution logs for template expansion errors

**Resolution:**
- Reason fields may be empty if cancelled via force=true mode
- Check User Activity Log for reason text
- Verify template uses correct field names

### Monitoring

**Status transitions to watch:**

| From | To | Trigger | Email Sent? |
|------|-------|---------|-------------|
| `pending` | `cancelled` | Cancel before SendAt | No |
| `pending` | `cancelled` | Cancel after SendAt | Yes (cancellation) |
| `cancelled` | `pending` | Reinstate before SendAt | No |
| `cancelled` | `pending` | Reinstate after SendAt | Yes (reinstatement) |

**User Activity Log entries:**
```
Action: CANCEL_RIDE
Details: Row 42, Sat A (12/7 10:00) [5] Nice Route, Reason: Weather too bad
Additional: {"announcementSent": true}

Action: REINSTATE_RIDE  
Details: Row 42, Sat A (12/7 10:00) [5] Nice Route, Reason: Weather improved
Additional: {"announcementSent": false}
```

### Manual Testing

**Test cancellation email:**
```javascript
// In Apps Script editor
const adapter = new ScheduleAdapter();
const row = adapter.loadAll().find(r => r.rowNum === 123); // Pick a test row
const manager = new AnnouncementManager();
const result = manager.handleCancellation(row, 'Test cancellation');
Logger.log(result);
```

---

## System Maintenance

### Trigger Management (Owner-Only)

**Important**: Only the spreadsheet owner can install and manage triggers. This prevents conflicts from multiple users attempting to manage the same triggers.

#### Installing Triggers

**When to install:**
- First-time system setup
- After spreadsheet is copied/cloned
- If triggers are accidentally deleted
- When troubleshooting trigger-related issues

**Installation process:**
1. **Verify you are the owner:**
   - File → Share → Check you are listed as owner
   - Only owner can install triggers
2. **Install triggers:**
   - Spreadsheet → Ride Schedulers → Install Triggers
   - Wait for confirmation dialog
3. **Verify installation:**
   - Extensions → Apps Script → Triggers
   - Should see 4 core triggers:
     - `onOpenHandler` (on spreadsheet open)
     - `editHandler` (on spreadsheet edit)
     - `dailyAnnouncementCheck` (time-driven, 2:00 AM)
     - `dailyRWGPSMembersDownload` (time-driven, 2:00 AM)
4. **Check User Activity Log:**
   - Look for "INSTALL_TRIGGERS" entry
   - Verify all 4 triggers listed as installed
   - Look for "DAILY_ANNOUNCEMENT_CHECK" entry (ran during installation)
5. **Check for pending announcements:**
   - If any announcements were pending, they will be processed immediately
   - Check spreadsheet for scheduled triggers created

**What gets installed:**

| Trigger | Type | Purpose | When Runs |
|---------|------|---------|-----------|
| `onOpenHandler` | On Open | Update menus, show dialogs | When spreadsheet opens |
| `editHandler` | On Edit | Detect row changes, trigger notifications | When cells edited |
| `dailyAnnouncementCheck` | Time-Driven | Backstop for missed announcements | Daily at 2:00 AM |

**Dynamic triggers** (created automatically by the system):
- `announcementTrigger` - Created when announcement scheduled, fires at SendAt time

#### Verifying Trigger Health

**Check trigger list:**
```
1. Extensions → Apps Script → Triggers
2. Verify 4 core triggers exist
3. Verify 0-2 dynamic triggers (depending on pending operations)
4. Check "Last run" times are recent
```

**Check execution history:**
```
1. Extensions → Apps Script → Executions
2. Filter by trigger name
3. Look for recent successful executions
4. Check for error patterns
```

**Common issues:**

| Symptom | Cause | Fix |
|---------|-------|-----|
| No triggers in list | Not installed | Install Triggers menu item |
| Triggers exist but not running | Disabled or quota exceeded | Check Apps Script quotas |
| Only some triggers present | Partial installation | Remove all, reinstall |
| Multiple duplicates | Multiple installations | Remove all, reinstall once |

#### Reinstalling Triggers

**When to reinstall:**
- Triggers not executing despite being listed
- Triggers show errors in execution log
- After major system update/code deployment
- If dynamic triggers stuck (not cleaning up)

**Reinstallation process:**
1. **Remove existing triggers:**
   - Spreadsheet → Ride Schedulers → Remove All Triggers
   - Wait for confirmation
2. **Verify removal:**
   - Apps Script → Triggers → Should be empty
3. **Reinstall:**
   - Spreadsheet → Ride Schedulers → Install Triggers
   - Verify all 4 triggers created
4. **Check logs:**
   - User Activity Log should show removal and installation entries

**Safe to reinstall:**
- Installation is idempotent (can run multiple times safely)
- Existing dynamic triggers are preserved
- In-progress announcements and retries continue normally

### Trigger Architecture

**Pattern: "Backstop + Scheduled"**

The system uses two complementary trigger types:

1. **Backstop Triggers (Daily 2:00 AM)**
   - `dailyAnnouncementCheck` - Scans for missed announcements
   - **Purpose**: Self-healing safety net
   - **Runs**: Every day at 2 AM whether needed or not

2. **Scheduled Triggers (Precise Timing)**
   - `announcementTrigger` - Fires exactly at announcement SendAt time
   - **Purpose**: Precise timing for immediate processing
   - **Created**: Dynamically when announcement scheduled
   - **Self-Cleaning**: Automatically removes itself after firing
   - **Cleanup Method**: Calls `TriggerManager.removeAnnouncementTrigger()`

**Why this pattern:**
- **Reliability**: Daily backstop catches any missed operations
- **Precision**: Scheduled triggers provide exact timing
- **Resilience**: System self-heals if scheduled trigger fails
- **Simplicity**: No complex coordination needed
- **Clean**: Dynamic triggers don't accumulate or become orphaned

**Example flow:**

```
Announcement created for 6:00 PM Friday
├─ Scheduled trigger created for 6:00 PM Friday
├─ 6:00 PM Friday: Trigger fires, sends announcement, removes itself automatically
└─ 2:00 AM Saturday: Backstop runs, finds nothing to do

If scheduled trigger fails:
├─ 6:00 PM Friday: Trigger fails (quota exceeded, script error, etc.)
├─ 2:00 AM Saturday: Backstop detects missed announcement
└─ 2:00 AM Saturday: Backstop sends announcement, cleans up
```

### Owner-Only Restrictions

**Why owner-only:**
- Prevents conflicts from multiple users managing triggers
- Ensures single source of trigger management
- Avoids duplicate trigger creation
- Simplifies troubleshooting

**What non-owners can do:**
- View spreadsheet data
- Edit ride details
- Create announcement documents
- Use all menu functions except trigger management

**What non-owners cannot do:**
- Install/remove triggers
- Access trigger management menu items
- Modify Apps Script code
- View Apps Script execution logs

**Checking ownership:**
```
1. File → Share
2. Look for your email in the list
3. Verify it shows "Owner" next to your name
4. If "Editor" or "Viewer" → You are not the owner
```

**Transferring ownership:**
```
1. Current owner: File → Share
2. Add new owner's email
3. Change permission to "Owner"
4. Original owner becomes "Editor" automatically
5. New owner must reinstall triggers
```

### Monitoring and Diagnostics

**Daily checks:**
1. **User Activity Log**: Check for errors or unexpected activity
2. **Execution history**: Verify triggers running successfully
3. **Announcement status**: Verify pending announcements have future SendAt times

**Weekly checks:**
1. **Trigger list**: Verify 4 core triggers present
2. **Quota usage**: Apps Script → Project Settings → Check quotas
3. **Failed executions**: Review any failures in execution log

**Monthly checks:**
1. **Full trigger reinstall**: Remove and reinstall all triggers
2. **Test announcement**: Create test announcement, verify sends correctly
3. **Test cancellation**: Cancel test announcement, verify notification sent

**Health check script:**
```javascript
// Run in Apps Script editor
function healthCheck() {
  const manager = TriggerManager.getInstance();
  const issues = manager.validateAllTriggers();
  
  if (issues.length === 0) {
    Logger.log('✅ All triggers healthy');
  } else {
    Logger.log('⚠️ Issues found:');
    issues.forEach(issue => Logger.log('  - ' + issue));
  }
}
```

### Troubleshooting Guide

**Triggers not installing:**

| Check | Solution |
|-------|----------|
| Are you the owner? | File → Share → Verify ownership |
| Script authorization? | Run any menu item, authorize script |
| Apps Script access? | Extensions → Apps Script → Should open editor |
| Quota exceeded? | Apps Script → Project Settings → Check quotas |

**Announcements not sending:**

| Check | Solution |
|-------|----------|
| Trigger installed? | Install Triggers menu item |
| SendAt time past? | Check row SendAt column |
| Status = pending? | Should be `pending`, not `sent`/`cancelled` |
| Backstop running? | Check Apps Script → Executions for `dailyAnnouncementCheck` |
| Dynamic trigger? | Apps Script → Triggers → Look for `announcementTrigger` |

**Dynamic triggers not cleaning up:**

| Check | Solution |
|-------|----------|
| Execution succeeded? | Apps Script → Executions → Check for errors |
| Multiple triggers? | Remove all, reinstall (cleans up orphans) |
| Script errors? | Check execution log for exceptions |

**Best practices:**
- Always use menu items (Install/Remove Triggers) - don't manually manage in Apps Script
- Only owner should manage triggers
- Reinstall triggers after major code updates
- Monitor User Activity Log for unexpected behavior
- Keep Apps Script execution log clean (investigate all errors)

**Test reinstatement email:**
```javascript
const adapter = new ScheduleAdapter();
const row = adapter.loadAll().find(r => r.rowNum === 123);
const manager = new AnnouncementManager();
const result = manager.handleReinstatement(row, 'Test reinstatement');
Logger.log(result);
```
