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
            this.QUEUE_KEY = 'announcementQueue';
            this.TRIGGER_KEY = 'announcementTriggerId';
        }

        /**
         * Create a ride announcement document and queue it for sending
         * @param {Object} rowData - Row data from Consolidated Rides sheet
         * @param {string} rideUrl - Stable ride URL identifier
         * @returns {string} Queue item ID
         */
        createAnnouncement(rowData, rideUrl) {
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
                console.log(`AnnouncementManager: Getting template file with ID: ${templateId}`);
                const templateFile = DriveApp.getFileById(templateId);
                console.log(`AnnouncementManager: Got template file: ${templateFile.getName()}`);
                
                const folderId = this._extractFolderId(folderUrl);
                console.log(`AnnouncementManager: Getting folder with ID: ${folderId}`);
                const folder = DriveApp.getFolderById(folderId);
                console.log(`AnnouncementManager: Got folder: ${folder.getName()}`);
                
                const rideName = rowData.RideName || 'Unknown Ride';
                const docName = `RA-${rideName}`;
                console.log(`AnnouncementManager: Making copy with name: ${docName}`);
                const newDoc = templateFile.makeCopy(docName, folder);
                const documentId = newDoc.getId();
                console.log(`AnnouncementManager: Created document with ID: ${documentId}`);
                
                // Set permissions: RS group can edit
                const rsGroupEmail = globals.RIDE_SCHEDULER_GROUP_EMAIL || Session.getActiveUser().getEmail();
                console.log(`AnnouncementManager: Setting permissions for: ${rsGroupEmail}`);
                if (rsGroupEmail !== Session.getActiveUser().getEmail()) {
                    try {
                        newDoc.addEditor(rsGroupEmail);
                        console.log(`AnnouncementManager: Added editor, now setting link sharing`);
                        // Enable link sharing for anyone with the link
                        newDoc.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
                        console.log(`AnnouncementManager: Link sharing enabled`);
                    } catch (permError) {
                        // If we can't set sharing (e.g., org-owned folder), log but continue
                        console.warn(`AnnouncementManager: Could not set sharing permissions (this is OK if folder is org-owned): ${permError.message}`);
                    }
                }
                
                console.log(`AnnouncementManager: Created document ${documentId} for ride ${rideUrl}`);
                
                // Calculate send time using core logic
                const timezone = Session.getScriptTimeZone();
                console.log(`AnnouncementManager: Calculating send time for date: ${rowData.Date} (type: ${typeof rowData.Date})`);
                const sendTime = AnnouncementCore.calculateSendTime(rowData.Date, timezone);
                console.log(`AnnouncementManager: Calculated send time: ${sendTime}`);
                
                // Append instructions for the operator
                this._appendInstructions(documentId, sendTime, rowData);
                
                // Create queue item using core logic
                const queueItem = AnnouncementCore.createQueueItem(
                    rideUrl,
                    documentId,
                    sendTime,
                    rsGroupEmail,
                    rowData._rowNum || null,
                    rowData.RideName || 'Unknown Ride',
                    () => Utilities.getUuid(),
                    () => new Date().getTime()
                );
                
                // Add to queue
                const queue = this._getQueue();
                queue.push(queueItem);
                this._saveQueue(queue);
                this._ensureTriggerExists();
                
                console.log(`AnnouncementManager: Queued announcement ${queueItem.id} for sending at ${sendTime}`);
                return queueItem.id;
            } catch (error) {
                console.error('AnnouncementManager.createAnnouncement error:', error);
                throw error;
            }
        }

        /**
         * Send an announcement email
         * @param {Object} item - Queue item with announcement details
         * @returns {Object} {success: boolean, error?: string}
         */
        sendAnnouncement(item) {
            try {
                const globals = getGlobals();
                const recipientEmail = globals.RIDE_ANNOUNCEMENT_EMAIL;
                
                if (!recipientEmail) {
                    throw new Error('RIDE_ANNOUNCEMENT_EMAIL not configured in Globals');
                }
                
                // Open the document
                const doc = DocumentApp.openById(item.documentId);
                
                // Convert document to HTML first (with template fields intact)
                let html = this._convertDocToHtml(doc);
                
                // Remove operator instructions section from HTML
                html = this._removeInstructionsFromHtml(html);
                
                // Expand template fields in the HTML
                const expandResult = AnnouncementCore.expandTemplate(html, item.rowData);
                html = expandResult.expandedText;
                
                // Extract subject from HTML (look for Subject: line at start)
                const emailContent = this._extractSubjectFromHtml(html);
                const subject = emailContent.subject || `Ride Announcement: ${item.rowData.RideName || 'Unknown Ride'}`;
                const htmlBody = emailContent.body;
                
                // Send HTML email
                MailApp.sendEmail(recipientEmail, subject, '', {
                    htmlBody: htmlBody,
                    name: 'Ride Scheduler',
                    replyTo: globals.RIDE_SCHEDULER_GROUP_EMAIL || Session.getActiveUser().getEmail()
                });
                
                console.log(`AnnouncementManager: Sent announcement ${item.id} to ${recipientEmail}`);
                
                // Show popup notification
                const docUrl = doc.getUrl();
                const ui = SpreadsheetApp.getUi();
                ui.alert(
                    'Announcement Sent',
                    `Ride announcement for "${item.rowData.RideName}" has been sent to ${recipientEmail}.\n\nDocument: ${docUrl}`,
                    ui.ButtonSet.OK
                );
                
                return { success: true };
            } catch (error) {
                console.error(`AnnouncementManager.sendAnnouncement error for item ${item.id}:`, error);
                return { success: false, error: error.message };
            }
        }

        /**
         * Send a reminder notification about an upcoming announcement
         * @param {Object} item - Queue item with announcement details
         * @returns {Object} {success: boolean, error?: string}
         */
        sendReminder(item) {
            try {
                const globals = getGlobals();
                const rsGroupEmail = globals.RIDE_SCHEDULER_GROUP_EMAIL;
                
                if (!rsGroupEmail) {
                    throw new Error('RIDE_SCHEDULER_GROUP_EMAIL not configured in Globals');
                }
                
                const doc = DocumentApp.openById(item.documentId);
                const docUrl = doc.getUrl();
                const rideName = item.rowData.RideName || 'Unknown Ride';
                const sendDate = new Date(item.sendTime);
                
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
                
                console.log(`AnnouncementManager: Sent reminder for announcement ${item.id} to ${rsGroupEmail}`);
                return { success: true };
            } catch (error) {
                console.error(`AnnouncementManager.sendReminder error for item ${item.id}:`, error);
                return { success: false, error: error.message };
            }
        }

        /**
         * Process all due announcements, reminders, and retries
         * Called by time-based trigger
         */
        processQueue() {
            const queue = this._getQueue();
            if (queue.length === 0) {
                console.log('AnnouncementManager: Queue empty, removing trigger');
                this._removeTrigger();
                return { sent: 0, reminded: 0, failed: 0, remaining: 0 };
            }

            const now = new Date().getTime();
            const dueItems = AnnouncementCore.getDueItems(queue, now);
            
            console.log(`AnnouncementManager: Processing ${dueItems.dueToSend.length} announcements and ${dueItems.dueForReminder.length} reminders`);
            
            let sent = 0;
            let reminded = 0;
            let failed = 0;
            
            // Load current spreadsheet data once for all announcements
            const adapter = new ScheduleAdapter();
            const allRows = adapter.loadAll();
            
            // Process announcements due to send
            dueItems.dueToSend.forEach(item => {
                try {
                    // Load current row data from spreadsheet
                    const row = allRows.find(r => r.RideURL === item.rideURL);
                    if (!row) {
                        throw new Error(`Could not find ride with URL: ${item.rideURL}`);
                    }
                    
                    // Build current row data object (same as in RideManager and testSendAnnouncement)
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
                    
                    // Add current row data to item
                    const itemWithData = { ...item, rowData };
                    
                    // Check if document still exists
                    const docExists = this._checkDocumentExists(item.documentId);
                    if (!docExists) {
                        console.warn(`AnnouncementManager: Document ${item.documentId} no longer exists, recreating...`);
                        // Recreate the document
                        const newDocId = this._recreateDocument(item);
                        item.documentId = newDocId;
                        itemWithData.documentId = newDocId;
                    }
                    
                    const result = this.sendAnnouncement(itemWithData);
                    
                    if (result.success) {
                        // Mark as sent using core logic
                        const updated = AnnouncementCore.markAsSent(item, now);
                        const newQueue = AnnouncementCore.updateItem(this._getQueue(), item.id, updated);
                        this._saveQueue(newQueue);
                        sent++;
                    } else {
                        // Use core logic to handle failure
                        const updated = AnnouncementCore.updateAfterFailure(item, result.error, now);
                        
                        if (updated.nextRetry) {
                            // Still retrying
                            const newQueue = AnnouncementCore.updateItem(this._getQueue(), item.id, updated);
                            this._saveQueue(newQueue);
                            console.log(`AnnouncementManager: Announcement ${item.id} failed, will retry at ${new Date(updated.nextRetry)}`);
                        } else {
                            // Abandoned after 24 hours
                            failed++;
                            console.error(`AnnouncementManager: Announcement ${item.id} abandoned after ${updated.attemptCount} attempts`);
                            this._notifyFailure(updated);
                        }
                    }
                } catch (error) {
                    console.error(`AnnouncementManager: Unexpected error processing announcement ${item.id}:`, error);
                }
            });
            
            // Process reminders
            dueItems.dueForReminder.forEach(item => {
                try {
                    const result = this.sendReminder(item);
                    
                    if (result.success) {
                        // Mark reminder as sent using core logic
                        const updated = AnnouncementCore.markReminderSent(item, now);
                        const newQueue = AnnouncementCore.updateItem(this._getQueue(), item.id, updated);
                        this._saveQueue(newQueue);
                        reminded++;
                    } else {
                        console.warn(`AnnouncementManager: Failed to send reminder for ${item.id}: ${result.error}`);
                    }
                } catch (error) {
                    console.error(`AnnouncementManager: Unexpected error sending reminder for ${item.id}:`, error);
                }
            });
            
            const remainingQueue = this._getQueue();
            if (remainingQueue.length === 0) {
                this._removeTrigger();
            }
            
            return {
                sent: sent,
                reminded: reminded,
                failed: failed,
                remaining: remainingQueue.length
            };
        }

        /**
         * Get formatted view of scheduled announcements for UI display
         * @returns {string} Formatted text for display
         */
        viewScheduled() {
            const queue = this._getQueue();
            if (queue.length === 0) {
                return 'No announcements currently scheduled.';
            }
            
            const now = new Date().getTime();
            const formatted = AnnouncementCore.formatItems(queue, now);
            
            return formatted.map(item => {
                const doc = DocumentApp.openById(item.documentId);
                const docUrl = doc.getUrl();
                return `Ride: ${item.rideName} (Row ${item.rowNum})\nSend Time: ${item.sendTime}\nStatus: ${item.status}\nAttempts: ${item.attemptCount}\nDocument: ${docUrl}`;
            }).join('\n\n');
        }

        /**
         * Remove announcement(s) for a ride by RideURL
         * Called when a ride is unscheduled or cancelled
         * @param {string} rideUrl - The RideURL to remove announcements for
         * @returns {number} Number of announcements removed
         */
        removeByRideUrl(rideUrl) {
            try {
                const queue = this._getQueue();
                const itemsToRemove = queue.filter(item => item.rideURL === rideUrl);
                
                if (itemsToRemove.length === 0) {
                    console.log(`AnnouncementManager: No announcements found for ride ${rideUrl}`);
                    return 0;
                }
                
                // Delete the announcement documents
                itemsToRemove.forEach(item => {
                    try {
                        const file = DriveApp.getFileById(item.documentId);
                        file.setTrashed(true);
                        console.log(`AnnouncementManager: Trashed document ${item.documentId} for ride ${rideUrl}`);
                    } catch (error) {
                        console.warn(`AnnouncementManager: Could not trash document ${item.documentId}: ${error.message}`);
                        // Continue anyway - remove from queue even if doc delete fails
                    }
                });
                
                // Remove from queue
                const newQueue = queue.filter(item => item.rideURL !== rideUrl);
                this._saveQueue(newQueue);
                
                console.log(`AnnouncementManager: Removed ${itemsToRemove.length} announcement(s) for ride ${rideUrl}`);
                return itemsToRemove.length;
            } catch (error) {
                console.error(`AnnouncementManager: Error removing announcements for ${rideUrl}:`, error);
                throw error;
            }
        }

        /**
         * Get queue statistics for monitoring
         * @returns {Object} Statistics object
         */
        getStatistics() {
            const queue = this._getQueue();
            return AnnouncementCore.getStatistics(queue);
        }

        /**
         * Clear all announcements from queue and trash all documents
         * @returns {number} Number of announcements cleared
         */
        clearAll() {
            try {
                const queue = this._getQueue();
                const count = queue.length;
                
                if (count === 0) {
                    console.log('AnnouncementManager: Queue already empty');
                    return 0;
                }
                
                // Trash all announcement documents
                let trashedCount = 0;
                let failedCount = 0;
                queue.forEach(item => {
                    try {
                        const file = DriveApp.getFileById(item.documentId);
                        file.setTrashed(true);
                        trashedCount++;
                        console.log(`AnnouncementManager: Trashed document ${item.documentId} for ride ${item.rideName}`);
                    } catch (error) {
                        failedCount++;
                        console.warn(`AnnouncementManager: Could not trash document ${item.documentId}: ${error.message}`);
                    }
                });
                
                // Clear the queue
                this._saveQueue([]);
                
                // Delete the trigger if it exists
                const props = PropertiesService.getScriptProperties();
                const triggerId = props.getProperty('announcementTriggerId');
                if (triggerId) {
                    try {
                        const triggers = ScriptApp.getProjectTriggers();
                        const trigger = triggers.find(t => t.getUniqueId() === triggerId);
                        if (trigger) {
                            ScriptApp.deleteTrigger(trigger);
                            console.log(`AnnouncementManager: Deleted trigger ${triggerId}`);
                        }
                        props.deleteProperty('announcementTriggerId');
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
                    '{Location} - Ride meeting location name',
                    '{Address} - Full address of meeting location',
                    '{Group} - Ride group (e.g., Sat A, Sun B)',
                    '{RouteName} - Name of the route'
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
         * Check if a document exists
         * @private
         */
        _checkDocumentExists(documentId) {
            try {
                DriveApp.getFileById(documentId);
                return true;
            } catch (error) {
                return false;
            }
        }

        /**
         * Recreate a document that was deleted
         * @private
         */
        _recreateDocument(item) {
            const globals = getGlobals();
            const templateId = this._extractDocId(globals.RIDE_ANNOUNCEMENT_MASTER_TEMPLATE);
            const folderUrl = globals.RIDE_ANNOUNCEMENT_FOLDER_URL;
            
            const templateFile = DriveApp.getFileById(templateId);
            const folderId = this._extractFolderId(folderUrl);
            const folder = DriveApp.getFolderById(folderId);
            
            const docName = `RA-${item.rideName}`;
            const newDoc = templateFile.makeCopy(docName, folder);
            
            console.log(`AnnouncementManager: Recreated document ${newDoc.getId()} for ride ${item.rideURL}`);
            return newDoc.getId();
        }

        /**
         * Notify about a failed announcement
         * @private
         */
        _notifyFailure(item) {
            try {
                const globals = getGlobals();
                const rsGroupEmail = globals.RIDE_SCHEDULER_GROUP_EMAIL;
                
                if (!rsGroupEmail) return;
                
                const subject = `Failed: Ride announcement for "${item.rideName}" could not be sent`;
                const body = `The scheduled announcement for ride "${item.rideName}" (Row ${item.rowNum}) failed after ${item.attemptCount} attempts.\n\n` +
                    `Last error: ${item.lastError}\n\n` +
                    `Please review and manually send if needed.\n` +
                    `Document: ${DocumentApp.openById(item.documentId).getUrl()}`;
                
                GmailApp.sendEmail(rsGroupEmail, subject, body, {
                    name: 'Ride Scheduler',
                    replyTo: rsGroupEmail
                });
                
                console.log(`AnnouncementManager: Sent failure notification for ${item.id}`);
            } catch (error) {
                console.error(`AnnouncementManager: Failed to send failure notification:`, error);
            }
        }

        /**
         * Get queue from properties
         * @private
         */
        _getQueue() {
            const json = this.props.getProperty(this.QUEUE_KEY);
            return json ? JSON.parse(json) : [];
        }

        /**
         * Save queue to properties
         * @private
         */
        _saveQueue(queue) {
            this.props.setProperty(this.QUEUE_KEY, JSON.stringify(queue));
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
