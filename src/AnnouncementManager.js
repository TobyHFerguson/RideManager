/**
 * AnnouncementManager - GAS adapter for AnnouncementCore
 * 
 * This is a thin GAS-specific wrapper around AnnouncementCore.
 * All business logic is in AnnouncementCore (pure JavaScript, fully tested).
 * This layer only handles GAS APIs: DriveApp, DocumentApp, GmailApp, PropertiesService, etc.
 */

// Node.js compatibility
if (typeof require !== 'undefined') {
    var AnnouncementCore = require('./AnnouncementCore');
}

var AnnouncementManager = (function() {
    
    class AnnouncementManager {
        constructor() {
            this.props = PropertiesService.getScriptProperties();
            this.TRIGGER_KEY = 'announcementTriggerId';
        }

        /**
         * Create a ride announcement document and add to row's announcement columns
         * @param {Row} row - Row object from ScheduleAdapter
         * @returns {string} Document URL
         */
        createAnnouncement(row) {
            try {
                const globals = getGlobals();
                
                // Get template and folder from globals
                const templateId = this._extractDocId(globals.RIDE_ANNOUNCEMENT_MASTER_TEMPLATE);
                const folderUrl = globals.RIDE_ANNOUNCEMENT_FOLDER_URL;
                
                if (!templateId) {
                    throw new Error('RIDE_ANNOUNCEMENT_MASTER_TEMPLATE not configured in Globals');
                }
                if (!folderUrl) {
                    throw new Error('RIDE_ANNOUNCEMENT_FOLDER_URL not configured in Globals');
                }
                
                // Make a copy of the template
                const rideName = row.RideName || 'Unknown Ride';
                console.log(`AnnouncementManager: Creating announcement for ${rideName} (row ${row.rowNum})`);
                const templateFile = DriveApp.getFileById(templateId);
                
                const folderId = this._extractFolderId(folderUrl);
                const folder = DriveApp.getFolderById(folderId);
                
                const docName = `RA-${rideName}`;
                const newDoc = templateFile.makeCopy(docName, folder);
                const documentId = newDoc.getId();
                const docUrl = newDoc.getUrl();
                console.log(`AnnouncementManager: Created document ${documentId}`);
                
                // Set permissions: RS group can edit
                const rsGroupEmail = globals.RIDE_SCHEDULER_GROUP_EMAIL || Session.getActiveUser().getEmail();
                if (rsGroupEmail !== Session.getActiveUser().getEmail()) {
                    try {
                        newDoc.addEditor(rsGroupEmail);
                        newDoc.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
                    } catch (permError) {
                        console.warn(`AnnouncementManager: Could not set sharing permissions: ${permError.message}`);
                    }
                }
                
                // Calculate send time using core logic
                const timezone = Session.getScriptTimeZone();
                const sendTime = AnnouncementCore.calculateSendTime(row.StartDate, timezone);
                const sendDate = new Date(sendTime);
                console.log(`AnnouncementManager: Calculated send time: ${sendDate}`);
                
                // Build rowData object for template expansion
                const rowData = {
                    _rowNum: row.rowNum,
                    RideName: row.RideName,
                    Date: row.StartDate,
                    RideLeaders: row.RideLeaders.join(', '),
                    StartTime: row.StartTime,
                    Location: row.Location,
                    Address: row.Address,
                    Group: row.Group,
                    RideURL: row.RideURL,
                    RouteURL: row.RouteURL,
                    RouteName: row.RouteName,
                    ...row._data
                };
                
                // Append instructions for the operator
                this._appendInstructions(documentId, sendTime, rowData);
                
                // Write announcement data to row columns
                row.Announcement = docUrl;
                row.SendAt = sendDate;
                row.Status = 'pending';
                row.Attempts = 0;
                row.LastError = '';
                
                // Save the row (will mark columns as dirty and persist on adapter.save())
                row._adapter.save();
                
                this._ensureTriggerExists();
                
                console.log(`AnnouncementManager: Set announcement for row ${row.rowNum}, scheduled for ${sendDate}`);
                return docUrl;
            } catch (error) {
                console.error('AnnouncementManager.createAnnouncement error:', error);
                throw error;
            }
        }

        /**
         * Send an announcement email for a row
         * @param {Row} row - Row object with announcement data
         * @returns {Object} {success: boolean, error?: string}
         */
        sendAnnouncement(row) {
            try {
                const globals = getGlobals();
                const recipientEmail = globals.RIDE_ANNOUNCEMENT_EMAIL;
                
                if (!recipientEmail) {
                    throw new Error('RIDE_ANNOUNCEMENT_EMAIL not configured in Globals');
                }
                
                // Extract document ID from announcement URL
                const docUrl = row.Announcement;
                const documentId = this._extractDocId(docUrl);
                if (!documentId) {
                    throw new Error(`Invalid announcement URL: ${docUrl}`);
                }
                
                // Open the document
                const doc = DocumentApp.openById(documentId);
                
                // Build rowData object for template expansion
                const rowData = {
                    _rowNum: row.rowNum,
                    RideName: row.RideName,
                    Date: row.StartDate,
                    RideLeaders: row.RideLeaders.join(', '),
                    StartTime: row.StartTime,
                    Location: row.Location,
                    Address: row.Address,
                    Group: row.Group,
                    RideURL: row.RideURL,
                    RouteURL: row.RouteURL,
                    RouteName: row.RouteName,
                    ...row._data
                };
                
                // Fetch route data for template enrichment (gain, length, fpm, startPin, lat, long)
                let route = null;
                if (row.RouteURL) {
                    try {
                        route = getRoute(row.RouteURL);
                    } catch (error) {
                        console.warn(`AnnouncementManager: Could not fetch route data for enrichment: ${error.message}`);
                        // Continue without route data - fields will be missing but announcement will still send
                    }
                }
                
                // Convert document to HTML first (with template fields intact)
                let html = this._convertDocToHtml(doc);
                
                // Remove operator instructions section from HTML
                html = this._removeInstructionsFromHtml(html);
                
                // Expand template fields in the HTML (with route data for enrichment)
                const expandResult = AnnouncementCore.expandTemplate(html, rowData, route);
                html = expandResult.expandedText;
                
                // Extract subject from HTML (look for Subject: line at start)
                const emailContent = this._extractSubjectFromHtml(html);
                const subject = emailContent.subject || `Ride Announcement: ${row.RideName || 'Unknown Ride'}`;
                const htmlBody = emailContent.body;
                
                // Send HTML email
                MailApp.sendEmail(recipientEmail, subject, '', {
                    htmlBody: htmlBody,
                    name: 'Ride Scheduler',
                    replyTo: globals.RIDE_SCHEDULER_GROUP_EMAIL || Session.getActiveUser().getEmail()
                });
                
                console.log(`AnnouncementManager: Sent announcement for row ${row.rowNum} to ${recipientEmail}`);
                
                return { success: true };
            } catch (error) {
                console.error(`AnnouncementManager.sendAnnouncement error for row ${row.rowNum}:`, error);
                return { success: false, error: error.message };
            }
        }

        /**
         * Send a reminder notification about an upcoming announcement
         * @param {Row} row - Row object with announcement data
         * @returns {Object} {success: boolean, error?: string}
         */
        sendReminder(row) {
            try {
                const globals = getGlobals();
                const rsGroupEmail = globals.RIDE_SCHEDULER_GROUP_EMAIL;
                
                if (!rsGroupEmail) {
                    throw new Error('RIDE_SCHEDULER_GROUP_EMAIL not configured in Globals');
                }
                
                const docUrl = row.Announcement;
                const rideName = row.RideName || 'Unknown Ride';
                const sendDate = row.SendAt;
                
                const subject = `Reminder: Ride announcement for "${rideName}" scheduled for ${sendDate.toLocaleString()}`;
                const body = `This is a reminder that a ride announcement is scheduled to be sent in approximately 24 hours.\n\n` +
                    `Ride: ${rideName}\n` +
                    `Scheduled send time: ${sendDate.toLocaleString()}\n` +
                    `Document: ${docUrl}\n\n` +
                    `Please review the announcement document and make any necessary edits before it is sent.`;
                
                GmailApp.sendEmail(rsGroupEmail, subject, body, {
                    name: 'Ride Scheduler',
                    replyTo: rsGroupEmail
                });
                
                console.log(`AnnouncementManager: Sent reminder for row ${row.rowNum} to ${rsGroupEmail}`);
                return { success: true };
            } catch (error) {
                console.error(`AnnouncementManager.sendReminder error for row ${row.rowNum}:`, error);
                return { success: false, error: error.message };
            }
        }

        /**
         * Process all due announcements, reminders, and retries
         * Called by time-based trigger
         */
        processQueue() {
            // Load all rows from spreadsheet
            const adapter = new ScheduleAdapter();
            const allRows = adapter.loadAll();
            
            if (allRows.length === 0) {
                console.log('AnnouncementManager: No rows in spreadsheet');
                this._removeTrigger();
                return { sent: 0, reminded: 0, failed: 0, remaining: 0 };
            }

            const now = new Date().getTime();
            const dueItems = AnnouncementCore.getDueItems(allRows, now);
            
            console.log(`AnnouncementManager: Processing ${dueItems.dueToSend.length} announcements and ${dueItems.dueForReminder.length} reminders`);
            
            let sent = 0;
            let reminded = 0;
            let failed = 0;
            
            // Process announcements due to send
            dueItems.dueToSend.forEach(row => {
                try {
                    const result = this.sendAnnouncement(row);
                    
                    if (result.success) {
                        // Mark as sent
                        row.Status = 'sent';
                        row.LastAttemptAt = new Date(now);
                        sent++;
                    } else {
                        // Handle failure
                        const sendTime = row.SendAt.getTime();
                        const attempts = row.Attempts + 1;
                        const failureUpdate = AnnouncementCore.calculateFailureUpdate(attempts, sendTime, result.error, now);
                        
                        row.Status = failureUpdate.status;
                        row.Attempts = failureUpdate.attempts;
                        row.LastError = failureUpdate.lastError;
                        row.LastAttemptAt = new Date(now);
                        
                        if (failureUpdate.status === 'abandoned') {
                            failed++;
                            console.error(`AnnouncementManager: Announcement for row ${row.rowNum} abandoned after ${attempts} attempts`);
                            this._notifyFailure(row);
                        } else {
                            console.log(`AnnouncementManager: Announcement for row ${row.rowNum} failed, will retry (attempt ${attempts})`);
                        }
                    }
                } catch (error) {
                    console.error(`AnnouncementManager: Unexpected error processing announcement for row ${row.rowNum}:`, error);
                }
            });
            
            // Process reminders
            dueItems.dueForReminder.forEach(row => {
                try {
                    const result = this.sendReminder(row);
                    
                    if (result.success) {
                        // Mark reminder sent - we could add a ReminderSent column if needed
                        // For now, just log it
                        console.log(`AnnouncementManager: Sent reminder for row ${row.rowNum}`);
                        reminded++;
                    } else {
                        console.warn(`AnnouncementManager: Failed to send reminder for row ${row.rowNum}: ${result.error}`);
                    }
                } catch (error) {
                    console.error(`AnnouncementManager: Unexpected error sending reminder for row ${row.rowNum}:`, error);
                }
            });
            
            // Save all changes back to spreadsheet
            adapter.save();
            
            // Check if there are any pending announcements remaining
            const stats = AnnouncementCore.getStatistics(allRows);
            if (stats.total === 0) {
                console.log('AnnouncementManager: No pending announcements, removing trigger');
                this._removeTrigger();
            }
            
            return {
                sent: sent,
                reminded: reminded,
                failed: failed,
                remaining: stats.total
            };
        }

        /**
         * Remove announcement(s) for a ride by RideURL
         * Called when a ride is unscheduled or cancelled
         * @param {string} rideUrl - The RideURL to remove announcements for
         * @returns {number} Number of announcements removed
         */
        removeByRideUrl(rideUrl) {
            return this.removeByRideUrls([rideUrl]);
        }

        /**
         * Remove announcements for multiple rides by RideURL (batch operation)
         * More efficient than calling removeByRideUrl multiple times
         * @param {string[]} rideUrls - Array of RideURLs to remove announcements for
         * @returns {number} Number of announcements removed
         */
        removeByRideUrls(rideUrls) {
            try {
                const adapter = new ScheduleAdapter();
                const allRows = adapter.loadAll();
                const rideUrlSet = new Set(rideUrls);
                const rowsToRemove = allRows.filter(r => r.Announcement && rideUrlSet.has(r.RideURL));
                
                if (rowsToRemove.length === 0) {
                    console.log(`AnnouncementManager: No announcements found for ${rideUrls.length} ride(s)`);
                    return 0;
                }
                
                // Delete the announcement documents and clear row data
                rowsToRemove.forEach(row => {
                    try {
                        const documentId = this._extractDocId(row.Announcement);
                        if (documentId) {
                            const file = DriveApp.getFileById(documentId);
                            file.setTrashed(true);
                            console.log(`AnnouncementManager: Trashed document ${documentId} for ride ${row.RideURL}`);
                        }
                    } catch (error) {
                        console.warn(`AnnouncementManager: Could not trash document: ${error.message}`);
                    }
                    
                    // Clear announcement data using Row domain method
                    row.clearAnnouncement();
                });
                
                // Save changes once for all rows
                adapter.save();
                
                console.log(`AnnouncementManager: Removed ${rowsToRemove.length} announcement(s) for ${rideUrls.length} ride(s)`);
                return rowsToRemove.length;
            } catch (error) {
                console.error(`AnnouncementManager: Error removing announcements for ${rideUrls.length} rides:`, error);
                throw error;
            }
        }

        /**
         * Get queue statistics for monitoring
         * @returns {Object} Statistics object
         */
        getStatistics() {
            const adapter = new ScheduleAdapter();
            const allRows = adapter.loadAll();
            return AnnouncementCore.getStatistics(allRows);
        }

        /**
         * Clear all announcements from spreadsheet and trash all documents
         * @returns {number} Number of announcements cleared
         */
        clearAll() {
            try {
                const adapter = new ScheduleAdapter();
                const allRows = adapter.loadAll();
                const rowsWithAnnouncements = allRows.filter(r => r.Announcement);
                const count = rowsWithAnnouncements.length;
                
                if (count === 0) {
                    console.log('AnnouncementManager: No announcements to clear');
                    return 0;
                }
                
                // Trash all announcement documents
                let trashedCount = 0;
                let failedCount = 0;
                rowsWithAnnouncements.forEach(row => {
                    try {
                        const documentId = this._extractDocId(row.Announcement);
                        if (documentId) {
                            const file = DriveApp.getFileById(documentId);
                            file.setTrashed(true);
                            trashedCount++;
                            console.log(`AnnouncementManager: Trashed document ${documentId} for ride ${row.RideName}`);
                        }
                    } catch (error) {
                        failedCount++;
                        console.warn(`AnnouncementManager: Could not trash document: ${error.message}`);
                    }
                    
                    // Clear announcement columns
                    row.Announcement = '';
                    row.SendAt = undefined;
                    row.Status = '';
                    row.Attempts = 0;
                    row.LastError = '';
                    row.LastAttemptAt = undefined;
                });
                
                // Save all changes
                adapter.save();
                
                // Delete the trigger if it exists
                const triggerId = this.props.getProperty(this.TRIGGER_KEY);
                if (triggerId) {
                    try {
                        const triggers = ScriptApp.getProjectTriggers();
                        const trigger = triggers.find(t => t.getUniqueId() === triggerId);
                        if (trigger) {
                            ScriptApp.deleteTrigger(trigger);
                            console.log(`AnnouncementManager: Deleted trigger ${triggerId}`);
                        }
                        this.props.deleteProperty(this.TRIGGER_KEY);
                    } catch (error) {
                        console.warn(`AnnouncementManager: Could not delete trigger: ${error.message}`);
                    }
                }
                
                console.log(`AnnouncementManager: Cleared ${count} announcements (${trashedCount} docs trashed, ${failedCount} failed)`);
                return count;
            } catch (error) {
                console.error('AnnouncementManager.clearAll error:', error);
                throw error;
            }
        }

        // ========== PRIVATE HELPER METHODS ==========

        /**
         * Extract folder ID from URL
         * @private
         */
        _extractFolderId(url) {
            if (!url) throw new Error('Folder URL is required');
            
            // Extract from URL: https://drive.google.com/drive/folders/{ID}
            const match = url.match(/\/folders\/([a-zA-Z0-9-_]+)/);
            if (!match) throw new Error(`Invalid folder URL: ${url}`);
            return match[1];
        }

        /**
         * Extract document ID from URL or ID string
         * @private
         */
        _extractDocId(urlOrId) {
            if (!urlOrId) return null;
            
            // If it's already just an ID
            if (!urlOrId.includes('/')) return urlOrId;
            
            // Extract from URL: https://docs.google.com/document/d/{ID}/edit
            const match = urlOrId.match(/\/d\/([a-zA-Z0-9-_]+)/);
            return match ? match[1] : null;
        }

        /**
         * Append operator instructions to announcement document
         * These instructions will be automatically removed when the email is sent
         * @private
         */
        _appendInstructions(documentId, sendTime, rowData) {
            try {
                const doc = DocumentApp.openById(documentId);
                const body = doc.getBody();
                
                // Add special marker paragraph that we can search for later
                body.appendParagraph('')
                    .appendHorizontalRule();
                body.appendParagraph('━━━ OPERATOR INSTRUCTIONS (will be removed when email is sent) ━━━')
                    .setHeading(DocumentApp.ParagraphHeading.HEADING2)
                    .setForegroundColor('#990000');
                
                body.appendParagraph('⚠️ This section will be automatically removed when the announcement is sent.')
                    .setBold(true);
                
                // Send time information
                const sendTimeFormatted = new Date(sendTime).toLocaleString('en-US', {
                    timeZone: Session.getScriptTimeZone(),
                    dateStyle: 'full',
                    timeStyle: 'short'
                });
                body.appendParagraph(`Scheduled Send Time: ${sendTimeFormatted}`)
                    .setBold(true);
                
                // Template field explanation
                body.appendParagraph('Template Fields')
                    .setHeading(DocumentApp.ParagraphHeading.HEADING3);
                
                body.appendParagraph('Fields in curly braces (e.g., {RideName}) will be replaced with current ride data when the email is sent. You can edit the text around these fields, but keep the {FieldName} syntax intact.');
                
                // Available fields
                body.appendParagraph('Available Fields:')
                    .setBold(true);
                
                const fields = [
                    '{DateTime} - Full date and time (e.g., "Saturday, December 7, 2024 at 10:00 AM")',
                    '{Date} - Date only (e.g., "December 7, 2024")',
                    '{Day} - Day of week (e.g., "Saturday")',
                    '{Time} - Time only (e.g., "10:00 AM")',
                    '{RideLink} - Full hyperlink: RideName + RideURL',
                    '{RideLeader} - Name(s) of the ride leader(s)',
                    '{Group} - Ride group (e.g., Sat A, Sun B)',
                    '{RouteName} - Name of the route',
                    '{Length} - Route distance in miles (e.g., "45")',
                    '{Gain} - Route elevation gain in feet (e.g., "2500")',
                    '{FPM} - Feet per mile - climb difficulty (e.g., "56")',
                    '{Lat} - Ride start latitude (e.g., "37.7749")',
                    '{Long} - Ride start longitude (e.g., "-122.4194")',
                    '{StartPin} - Map links to ride start: Apple Maps / Google Maps'
                ];
                
                fields.forEach(field => {
                    body.appendListItem(field);
                });
                
                // Data update information
                body.appendParagraph('Data Updates')
                    .setHeading(DocumentApp.ParagraphHeading.HEADING3);
                
                body.appendParagraph('Template fields are populated with CURRENT ride data at send time. If you update ride details in the spreadsheet (time, location, leaders, etc.), those changes will automatically appear in the email. You do not need to update this document.');
                
                // Missing fields information
                body.appendParagraph('Missing Fields')
                    .setHeading(DocumentApp.ParagraphHeading.HEADING3);
                
                body.appendParagraph('If a field has no data, it will appear as {FieldName} in the final email and be highlighted in yellow. The email will still be sent. You can either:');
                body.appendListItem('Fill in the missing data in the spreadsheet before send time');
                body.appendListItem('Replace the field with custom text in this document');
                body.appendListItem('Leave it as-is if the field is optional');
                
                // Editing information
                body.appendParagraph('Editing This Document')
                    .setHeading(DocumentApp.ParagraphHeading.HEADING3);
                
                body.appendParagraph('You can edit any part of this document above the horizontal rule. Add personal messages, format text, include images, etc. Everything above the horizontal rule will be included in the email.');
                
                body.appendParagraph('The line starting with "Subject:" at the top of the document determines the email subject. You can customize it.');
                
                console.log(`AnnouncementManager: Appended instructions to document ${documentId}`);
            } catch (error) {
                console.error(`AnnouncementManager: Failed to append instructions to ${documentId}:`, error);
                // Don't throw - instructions are helpful but not critical
            }
        }

        /**
         * Convert Google Doc to HTML
         * Based on DocsService pattern from SCCCCMembershipManagement
         * @private
         */
        _convertDocToHtml(doc) {
            const body = doc.getBody();
            let html = '<html><body>';
            html += this._processElement(body);
            html += '</body></html>';
            return html;
        }

        /**
         * Process a document element recursively to HTML
         * @private
         */
        _processElement(element) {
            let html = '';
            
            switch (element.getType()) {
                case DocumentApp.ElementType.PARAGRAPH:
                    html += '<p>';
                    const numChildren = element.getNumChildren();
                    for (let i = 0; i < numChildren; i++) {
                        html += this._processElement(element.getChild(i));
                    }
                    html += '</p>';
                    break;
                    
                case DocumentApp.ElementType.TEXT:
                    html += this._processText(element);
                    break;
                    
                case DocumentApp.ElementType.LIST_ITEM:
                    html += '<li>';
                    const listChildren = element.getNumChildren();
                    for (let i = 0; i < listChildren; i++) {
                        html += this._processElement(element.getChild(i));
                    }
                    html += '</li>';
                    break;
                    
                case DocumentApp.ElementType.TABLE:
                    html += '<table border="1" style="border-collapse:collapse;">';
                    const numRows = element.getNumRows();
                    for (let i = 0; i < numRows; i++) {
                        html += this._processElement(element.getRow(i));
                    }
                    html += '</table>';
                    break;
                    
                case DocumentApp.ElementType.TABLE_ROW:
                    html += '<tr>';
                    const numCells = element.getNumCells();
                    for (let i = 0; i < numCells; i++) {
                        html += this._processElement(element.getCell(i));
                    }
                    html += '</tr>';
                    break;
                    
                case DocumentApp.ElementType.TABLE_CELL:
                    html += '<td>';
                    const cellChildren = element.getNumChildren();
                    for (let i = 0; i < cellChildren; i++) {
                        html += this._processElement(element.getChild(i));
                    }
                    html += '</td>';
                    break;
                    
                case DocumentApp.ElementType.BODY_SECTION:
                case DocumentApp.ElementType.BODY:
                    const bodyChildren = element.getNumChildren();
                    for (let i = 0; i < bodyChildren; i++) {
                        html += this._processElement(element.getChild(i));
                    }
                    break;
                    
                case DocumentApp.ElementType.HORIZONTAL_RULE:
                    html += '<hr/>';
                    break;
                    
                default:
                    // For other element types, try to process children if available
                    try {
                        if (typeof element.getNumChildren === 'function') {
                            const defaultChildren = element.getNumChildren();
                            for (let i = 0; i < defaultChildren; i++) {
                                html += this._processElement(element.getChild(i));
                            }
                        }
                    } catch (e) {
                        // If can't process children, just skip
                        console.warn('Could not process element type:', element.getType());
                    }
            }
            
            return html;
        }

        /**
         * Process text element with formatting
         * @private
         */
        _processText(element) {
            let html = '';
            const text = element.getText();
            if (!text) return '';
            
            const attributeIndices = element.getTextAttributeIndices();
            
            if (attributeIndices.length === 0) {
                return this._encodeHtmlEntities(text);
            }
            
            let lastIndex = 0;
            for (let i = 0; i < attributeIndices.length; i++) {
                const index = attributeIndices[i];
                const segmentText = this._encodeHtmlEntities(text.substring(lastIndex, index));
                
                if (segmentText) {
                    const linkUrl = element.getLinkUrl(lastIndex);
                    const attributes = element.getAttributes(lastIndex);
                    let styledSegment = this._applyTextAttributes(segmentText, attributes);
                    
                    if (linkUrl) {
                        html += '<a href="' + linkUrl + '">' + styledSegment + '</a>';
                    } else {
                        html += styledSegment;
                    }
                }
                
                lastIndex = index;
            }
            
            // Handle the last segment
            const lastSegmentText = text.substring(lastIndex);
            if (lastSegmentText) {
                const lastLinkUrl = element.getLinkUrl(lastIndex);
                const lastAttributes = element.getAttributes(lastIndex);
                let lastStyledSegment = this._applyTextAttributes(lastSegmentText, lastAttributes);
                
                if (lastLinkUrl) {
                    html += '<a href="' + lastLinkUrl + '">' + lastStyledSegment + '</a>';
                } else {
                    html += lastStyledSegment;
                }
            }
            
            return html;
        }

        /**
         * Apply text formatting attributes
         * @private
         */
        _applyTextAttributes(text, attributes) {
            let html = text;
            
            if (attributes[DocumentApp.Attribute.BOLD]) {
                html = '<b>' + html + '</b>';
            }
            if (attributes[DocumentApp.Attribute.ITALIC]) {
                html = '<i>' + html + '</i>';
            }
            if (attributes[DocumentApp.Attribute.UNDERLINE]) {
                html = '<u>' + html + '</u>';
            }
            if (attributes[DocumentApp.Attribute.FONT_SIZE]) {
                html = '<span style="font-size:' + attributes[DocumentApp.Attribute.FONT_SIZE] + 'px;">' + html + '</span>';
            }
            if (attributes[DocumentApp.Attribute.FOREGROUND_COLOR]) {
                html = '<span style="color:' + attributes[DocumentApp.Attribute.FOREGROUND_COLOR] + ';">' + html + '</span>';
            }
            if (attributes[DocumentApp.Attribute.BACKGROUND_COLOR]) {
                html = '<span style="background-color:' + attributes[DocumentApp.Attribute.BACKGROUND_COLOR] + ';">' + html + '</span>';
            }
            
            return html;
        }

        /**
         * Encode HTML entities
         * @private
         */
        _encodeHtmlEntities(text) {
            return text.replace(/[&<>'"]/g, function(c) {
                switch (c) {
                    case '&': return '&amp;';
                    case '<': return '&lt;';
                    case '>': return '&gt;';
                    case "'": return '&#39;';
                    case '"': return '&quot;';
                    default: return c;
                }
            });
        }

        /**
         * Remove operator instructions section from HTML
         * Removes everything from the horizontal rule with instruction marker onwards
         * @private
         */
        _removeInstructionsFromHtml(html) {
            // Find the HR followed by the instruction marker
            const marker = '━━━ OPERATOR INSTRUCTIONS';
            const markerIndex = html.indexOf(marker);
            
            if (markerIndex === -1) {
                console.log('AnnouncementManager: No instruction marker found in HTML');
                return html;
            }
            
            // Find the <hr/> or <hr> tag before the marker
            const beforeMarker = html.substring(0, markerIndex);
            const hrMatch = beforeMarker.lastIndexOf('<hr');
            
            if (hrMatch === -1) {
                // No HR found, just remove from marker onwards
                return html.substring(0, markerIndex);
            }
            
            // Remove from the HR tag onwards
            const cleaned = html.substring(0, hrMatch);
            console.log(`AnnouncementManager: Removed instructions from HTML (${html.length} -> ${cleaned.length} chars)`);
            return cleaned;
        }

        /**
         * Extract subject line from HTML content
         * Looks for "Subject: ..." at the beginning and removes it from body
         * @private
         */
        _extractSubjectFromHtml(html) {
            // Look for Subject: in the first paragraph, allowing for any HTML tags within
            const subjectMatch = html.match(/<p[^>]*>\s*Subject:\s*(.+?)<\/p>/is);
            
            if (subjectMatch) {
                const subject = subjectMatch[1].replace(/<[^>]+>/g, '').trim(); // Strip any HTML tags
                const body = html.replace(subjectMatch[0], ''); // Remove entire subject paragraph from body
                return { subject, body };
            }
            
            return { subject: null, body: html };
        }

        /**
         * Notify about a failed announcement
         * @private
         */
        _notifyFailure(row) {
            try {
                const globals = getGlobals();
                const rsGroupEmail = globals.RIDE_SCHEDULER_GROUP_EMAIL;
                
                if (!rsGroupEmail) return;
                
                const subject = `Failed: Ride announcement for "${row.RideName}" could not be sent`;
                const body = `The scheduled announcement for ride "${row.RideName}" (Row ${row.rowNum}) failed after ${row.Attempts} attempts.\n\n` +
                    `Last error: ${row.LastError}\n\n` +
                    `Please review and manually send if needed.\n` +
                    `Document: ${row.Announcement}`;
                
                GmailApp.sendEmail(rsGroupEmail, subject, body, {
                    name: 'Ride Scheduler',
                    replyTo: rsGroupEmail
                });
                
                console.log(`AnnouncementManager: Sent failure notification for row ${row.rowNum}`);
            } catch (error) {
                console.error(`AnnouncementManager: Failed to send failure notification:`, error);
            }
        }

        /**
         * Ensure hourly trigger exists for queue processing
         * @private
         */
        _ensureTriggerExists() {
            const existingTriggerId = this.props.getProperty(this.TRIGGER_KEY);
            
            if (existingTriggerId) {
                // Check if trigger still exists
                const triggers = ScriptApp.getProjectTriggers();
                const exists = triggers.some(t => t.getUniqueId() === existingTriggerId);
                if (exists) return;
            }
            
            // Create new hourly trigger
            const trigger = ScriptApp.newTrigger('processAnnouncementQueue')
                .timeBased()
                .everyHours(1)
                .create();
            
            this.props.setProperty(this.TRIGGER_KEY, trigger.getUniqueId());
            console.log(`AnnouncementManager: Created trigger ${trigger.getUniqueId()}`);
        }

        /**
         * Remove the queue processing trigger
         * @private
         */
        _removeTrigger() {
            const triggerId = this.props.getProperty(this.TRIGGER_KEY);
            if (!triggerId) return;
            
            const triggers = ScriptApp.getProjectTriggers();
            const trigger = triggers.find(t => t.getUniqueId() === triggerId);
            
            if (trigger) {
                ScriptApp.deleteTrigger(trigger);
                console.log(`AnnouncementManager: Deleted trigger ${triggerId}`);
            }
            
            this.props.deleteProperty(this.TRIGGER_KEY);
        }
    }
    
    return AnnouncementManager;
})();

// Node.js compatibility
if (typeof module !== 'undefined') {
    module.exports = AnnouncementManager;
}
