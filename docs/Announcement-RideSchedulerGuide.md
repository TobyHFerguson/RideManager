# Ride Announcement System - Ride Scheduler's Guide

**For:** Ride Schedulers who create and manage ride announcements  
**Focus:** Creating announcements, editing content, ensuring messages are sent

---

## Quick Start

### Creating a Ride Announcement

1. **In the spreadsheet**, select the row(s) for your ride(s)
2. **Click:** Ride Schedulers → Schedule Selected Rides
   If the ride is successfully scheduled a new announcement document will be made from the template (your own personal template or, if that can't be found, the [master template](https://docs.google.com/document/d/1tFcT5H1Sul0r0Nez2xdaqMP2MkvzB8HvkLLRwUr3Lns/edit?usp=drive_link))
3. **Click the link** in the `Announcement` column to open your document
4. **Edit the document** - add details, photos, emojis, formatting
5. **(Optional) Test it** - send a test announcement to yourself to check what it'll look like
6. **That's it!** The email will be sent automatically 2 days before the ride at 6:00 PM

---

## Using Your Own Template (Optional)

### What is a Personal Template?

By default, all announcements use the club's [master template](https://docs.google.com/document/d/1tFcT5H1Sul0r0Nez2xdaqMP2MkvzB8HvkLLRwUr3Lns/edit?usp=drive_link). But you can create your own template with your personal style, favorite emojis, or custom layout!

### How to Set Up Your Personal Template

1. **Create your template document:**
   - Create a template in the [Ride Announcements](https://drive.google.com/drive/folders/1uwZzbl1SkkAOwA_6-uIj-ZR368_sxJNm?usp=sharing) folder by:
     - Creating it from scratch
     - Copying another Template
     - Copying an announcement that is ready to be sent
   - Make sure you:
     *  Share it with toby.h.ferguson@gmail.com (that's the account that currently runs the code) 
     *  Name it so its clear to you and others just what it is!
   - Customize it with your preferred formatting, emojis, layout
   - Keep the `{FieldName}` placeholders where you want ride data

2. **Add yourself to Personal Templates sheet:**
   - Open the "Personal Templates" sheet in the CRS
   - Add a new row with:
     - **Email**: Your full email address (e.g., `yourname@gmail.com`)
     - **TemplateURL**: Link to your template document
     - **Active**: `TRUE`
     - **Notes**: (Optional) Description like "Uses lots of emojis"

3. **Test it:**
   - Create a test announcement
   - Verify it uses your template
   - If not working, check email matches exactly and Active = TRUE

### When Your Template is Used

- ✅ When YOU create an announcement → Uses YOUR template
- ✅ When other schedulers create → Uses THEIR template (or master if they have none)
- ✅ You can switch back to master by setting Active = FALSE

### Managing Your Template

**To update your template:**
- Just edit your template document
- Future announcements will use the updated version
- Already-created announcements are not affected

**To stop using your template:**
- Change `Active` to `FALSE` in Personal Templates sheet
- You'll use the master template instead

**To switch templates:**
- Update the `TemplateURL` in your row
- New announcements will use the new template

---

## How Announcements Work

### Timeline

```
Today: Create announcement
    ↓
Document created from template; `sendAt` column date is 2 days before ride start, at 6:00 pm
    ↓
Edit document (add custom content, photos, details)
    ↓
24 hours before send: You receive reminder email
    ↓
`sendAt` date & time (default - 6:00 PM, 2 days before ride): Email sent automatically
    ↓
Done!
```

### When Emails Are Sent

**Rule:** Announcements send at **6:00 PM, 2 calendar days before your ride**

**Examples:**
- Your ride: Saturday 12/7 at 9:00 AM → Email sends: Thursday 12/5 at 6:00 PM
- Your ride: Monday 12/9 at 5:00 PM → Email sends: Saturday 12/7 at 6:00 PM
- Your ride: Sunday 12/8 at 8:00 AM → Email sends: Friday 12/6 at 6:00 PM

### You'll Get a Reminder

**24 hours before the email sends**, you'll receive a reminder email:
- Confirms the announcement will send soon
- Gives you time for last-minute edits
- Includes link to the announcement document

---

## Editing Your Announcement

### Opening the Document

1. Find your ride in the spreadsheet
2. Click the link in the `Announcement` column
3. The Google Doc will open in a new tab

### What You Can Edit

**Everything!** The document is yours to customize:

Use Fields to have the system automatically fill in the correct values:



Format your announcement as you choose: 

✅ **Text Content**
- Add ride details, meeting instructions, parking info
- Include post-ride plans (coffee shop, restaurant)
- Add weather considerations or what to bring
- Write personal messages or ride highlights

✅ **Formatting**
- **Bold**, *italic*, underline
- Colors and font sizes
- Bullet lists and numbered lists
- Headings and paragraphs

✅ **Images and Emojis**
- Add photos from previous rides
- Include route maps or elevation profiles
- Use emojis 🚴‍♀️ ✨ 🌄 (they work great in emails!)
- Paste images directly from your clipboard

✅ **Links**
- Add hyperlinks to relevant websites
- Link to weather forecasts
- Include parking maps or directions

✅ **Tables**
- Create schedules or ride statistics
- Format information in columns

### Template Fields (Already Filled In)

When the announcement document is created these template fields are available to be used - they'll automatically get filled in with the latest information from the ride and route just prior to sending:

- `{DateTime}` - Full date and time (e.g., "Saturday, December 7, 2024 at 10:00 AM")
- `{Date}` - Date only (e.g., "December 7, 2024")
- `{Day}` - Day of week (e.g., "Saturday")
- `{Time}` - Time only (e.g., "10:00 AM")
- `{RideLink}` - Full hyperlink to ride: (e.g., [Fri B (1/2 09:00) [1] AV - Palm Beach SP via Watsonville](https://ridewithgps.com/events/436008))
- `{RideLeader}` - Name(s) of the ride leader(s)
- `{Group}` - Ride group (e.g., A, B, C etc.)
- `{RouteName}` - Name of the route (e.g. "AV - Palm Beach SP via Watsonville")
- `{Length}` - Route distance in miles (e.g., "45")
- `{Gain}` - Route elevation gain in feet (e.g., "2500")
- `{FPM}` - Feet per mile - climb difficulty (e.g., "56")
- `{Lat}` - Ride start latitude (e.g., "37.7749")
- `{Long}` - Ride start longitude (e.g., "-122.4194")
- `{StartPin}` - Map links to ride start: (e.g., [Apple Maps](https://maps.apple.com/?ll=36.97803,-121.90091&q=Ride%20Start) / [Google Maps](https://www.google.com/maps/search/?api=1&query=36.97803,-121.90091))

You can edit or remove any of this auto-filled information if needed.

### Editing Tips

**Best Practices:**
- ✅ Keep images under 100KB for best email delivery
- ✅ Use emojis for visual appeal (they work perfectly!)
- ✅ Test links to make sure they work
- ✅ Preview how it looks before the send time
- ✅ Edit anytime before the scheduled send

**Things to Avoid:**
- ❌ Don't delete the entire document
- ❌ Don't remove the document from the announcements folder
- ❌ Very large images (>100KB) may not display in some email clients

### Editing After Creation

**You can edit anytime until the email sends!**

1. Open the document (click `Announcement` column link)
2. Make your changes
3. The changes are automatically saved by Google Docs
4. When the scheduled time arrives, the email will include your latest edits

### Sending a Test Announcement
Simply select the row or rows you want test announcements for (any column) then select the `Ride Schedulers --> Test Selected Announcements` - you'll be prompted for an email address, and then the announcement(s) will be sent to that address. (Only `pending` announcements can be tested - others will be ignored!)

### Sending immediately
If you just decide you want to send one or more announcements **officially** right now then select the announcements (only `pending` - others will be ignored!) and select `Ride Schedulers --> Send Pending Announcements`. 

---

## Checking Status

### Status Column Values

Look at the `Status` column in your ride row:

| Status | What It Means | What You Should Do |
|--------|---------------|-------------------|
| `pending` | Waiting to send at scheduled time | Nothing - it will send automatically |
| `sent` | Email was successfully sent | Nothing - you're done! |
| `failed` | Send failed (system is retrying) | Check with operator if it doesn't resolve |
| *(empty)* | No announcement created yet | Create announcement if you want one |

### Other Helpful Columns

| Column | What It Shows |
|--------|---------------|
| `Announcement` | Link to your Google Doc |
| `SendAt` | When the email will send (or was scheduled to send) |
| `Attempts` | How many times system tried to send |
| `LastError` | Error message if something went wrong |

---

## Common Scenarios

### "I want to preview the email before it sends"

1. Open your announcement document (click `Announcement` link)
2. That's exactly what people will receive!
3. The document content is converted to email format when sent
4. Make any edits you want - they'll be included

### "I need to make a last-minute change"

No problem!
1. Open the announcement document
2. Make your edits
3. As long as the current time is before the `SendAt` time, your changes will be included

**Even 5 minutes before send time is fine!**

### "I want to add photos from the ride route"

1. Open the announcement document
2. Click where you want the photo
3. Insert → Image → Upload from computer (or paste from clipboard)
4. Resize the image (smaller is better - under 100KB recommended)
5. Save (automatic in Google Docs)

### "I made a mistake - can I cancel the announcement?"

**Before it sends:**
- Ask an operator to change the `Status` to `cancelled`
- Or delete the content in the `Announcement` column

**After it sends:**
- You cannot recall the email (like regular email)
- You could send a follow-up correction if needed

### "The announcement hasn't sent yet and it's past the scheduled time"

**Don't panic!** The system has automatic retry logic:

1. **Check `Status` column:**
   - If `pending` → May send within 15 minutes (system checks every 15 min)
   - If `failed` → System is automatically retrying (see retry schedule below)
   - If `sent` → It was sent! Check spam folder

2. **If status is `failed`:**
   - System retries automatically with these intervals:
     - 1st retry: 5 minutes later
     - 2nd retry: 15 minutes later
     - 3rd retry: 30 minutes later
     - Then: 1hr, 2hr, 4hr, 8hr intervals
   - Retries continue for 24 hours
   - If still failing, contact an operator

3. **If you need it sent urgently:**
   - Contact an operator - they can manually trigger a send

### "Can I use my own announcement template style?"

Yes! You can create a personal template:

1. **Create your template document**
   - Copy the master template or create from scratch
   - Customize with your style, emojis, layout
   - Keep `{FieldName}` placeholders for ride data

2. **Register it in Personal Templates sheet**
   - Add row: Your Email | Template URL | Active=TRUE | Notes
   - System will use your template for your announcements

3. **Others keep using their templates**
   - Each scheduler can have their own template
   - Or use the master template if they prefer

See "Using Your Own Template" section above for details.

### "I want to include a special message about weather/cancellation"

Perfect use case for editing!
1. Open your announcement document
2. Add a prominent note at the top:
   ```
   ⚠️ WEATHER UPDATE: Check email morning of ride for any cancellations
   ```
3. Use colors, bold, or larger fonts to make it stand out

---

## What Gets Sent

### Email Format

Your announcement document becomes an HTML email:
- Formatting is preserved (bold, italic, colors, etc.)
- Images are embedded in the email
- Links are clickable
- Lists and tables are formatted nicely
- Emojis display correctly

### Email Details

**From:** Ride Scheduler (or configured sender)  
**To:** Ride announcements distribution list (e.g., `ride_announcements@sc3.club`)  
**Subject:** `Ride Announcement: {Your Ride Name}`

### Who Receives It

The email goes to the distribution list configured by your club.  
This typically includes:
- All club members subscribed to ride announcements
- Ride coordinators
- Anyone on the announcement mailing list

---

## Tips for Great Announcements

### Content Ideas

**Essential Information:**
- Meeting time and exact location
- What to bring (water, snacks, tools)
- Ride pace and expected duration
- Post-ride plans

**Nice to Include:**
- Route highlights or scenic spots
- Difficulty notes or terrain description
- Weather considerations
- Parking instructions or alternative meeting options
- Coffee/food stop information
- Photos from previous rides on this route

**Pro Tips:**
- Use emojis to make it visually appealing 🚴‍♀️ ☕ 🌄
- Include a map link to the start (it's in the template!)
- Mention if it's a no-drop ride or what paces to expect
- Add your contact info for questions
- Make it friendly and welcoming!

### Example Announcement


>🚴‍♀️ Thursday Night Ride is On! ✨
>
>[Thu A (12/4 17:00) [1] BT- Doyle st., Soquel ave, Walnut ave, Highland ave, Coolidge Dr., Western Dr., W cliff](https://ridewithgps.com/events/436003-thu-a-12-4-17-00-1-bt-doyle-st-soquel-av)
>
>Join us for our weekly Thursday evening ride through the Westside! Don't forget to RSVP using the above link so we know you're coming!
>
>📅 When: Thursday, December 4 at 5:00 PM sharp
>📍 Where: The Bicycle Trip (1234 Main St, Santa Cruz) ( [Apple Maps](https://maps.apple.com/?ll=36.97887,-122.01297&q=Ride%20Start) / [Google Maps](https://maps.google.com/?q=36.97887,-122.01297))
>
>With the time change, it's already dark by 5 PM — so don't forget 
>your bike lights! Safety first!
>
>Route Details:
>- Distance: 24.5 miles
>- Elevation: 1,234 ft (50 ft/mi)
>- Pace: Casual, no-drop ride
>
>This is a casual, no-drop ride where everyone rides at a comfortable 
>pace. Whether you're here for the miles or just the good vibes, 
>you're welcome!
>
>Post-Ride Hangout:
>After the ride, we'll head to Gilman Brewing for drinks, bites, and 
>great company.
>
>Questions? Contact me at leader@email.com
>
>See you there! 🎉


---

## Getting Help

**If you need assistance:**

1. **Document editing issues** → Use Google Docs help or ask any colleague
2. **Announcement not sending** → Contact an operator (they monitor the system)
3. **Want to test before sending** → Ask an operator to help set up a test
4. **Technical questions** → Check with an operator

**Remember:** As a ride scheduler, your job is just to create great content. The operators handle the technical side!

---

## Quick Reference

### Your Workflow

1. **Create** announcement (Extensions menu)
2. **Edit** document (click Announcement link)
3. **Relax** - system sends automatically
4. **Verify** status = "sent" after scheduled time

### Important Times

- **Announcement sends:** 6 PM, 2 days before ride
- **Reminder to you:** 24 hours before send
- **System checks:** Every 15 minutes
- **Edit deadline:** Anytime before send

### Need to Know

- ✅ Edit anytime before send
- ✅ Add images, emojis, formatting
- ✅ System retries automatically if failed
- ✅ You get 24-hour reminder
- ❌ Can't recall after sent
- ❌ Keep images under 100KB
