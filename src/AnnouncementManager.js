// @ts-check
/// <reference path="./gas-globals.d.ts" />

// gas-globals.d.ts declares all modules as global variables for GAS runtime
// No need for individual module references - they override global declarations!

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
    var TriggerManager = require('./TriggerManager');
}

var AnnouncementManager = (function () {

    class AnnouncementManager {
        constructor() {
            // TriggerManager is a class - instantiate it
            // @ts-expect-error - TriggerManager is global in GAS runtime, VS Code sees module type
            this.triggerManager = new TriggerManager();
        }

        /**
         * Create a ride announcement document and add to row's announcement columns
         * @param {InstanceType<typeof Row>} row - Row object from ScheduleAdapter
         * @returns {string} Document URL
         */
        createAnnouncement(row) {
            try {

                // Get template: check personal templates first, then fall back to master
                const templateInfo = this._getTemplateInfo();
                const templateId = templateInfo.id;



                if (!templateId) {
                    throw new Error('No announcement template configured (check Personal Templates or RIDE_ANNOUNCEMENT_MASTER_TEMPLATE in Globals)');
                }


                const newDoc = this._copyTemplate(templateInfo, row);
                const docUrl = newDoc.getUrl();
                row.Announcement = docUrl;
                console.log(`AnnouncementManager: Created document ${docUrl} from ${templateInfo.type} template (${templateId})`);

                // Set permissions: RS group can edit
                const rsGroupEmail = getGlobals().RIDE_SCHEDULER_GROUP_EMAIL || Session.getActiveUser().getEmail();
                if (rsGroupEmail !== Session.getActiveUser().getEmail()) {
                    try {
                        newDoc.addEditor(rsGroupEmail);
                        newDoc.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
                    } catch (permError) {
                        const err = permError instanceof Error ? permError : new Error(String(permError));
                        console.warn(`AnnouncementManager: Could not set sharing permissions: ${err.message}`);
                    }
                }

                // Calculate send time using core logic
                const timezone = Session.getScriptTimeZone();
                // @ts-expect-error - AnnouncementCore is a namespace object, TypeScript sees module type
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
                    // @ts-expect-error - _data is private but needed for complete template data
                    ...row._data
                };

                row.Status = 'pending';
                row.Attempts = 0;
                row.LastError = '';

                // @ts-ignore - Row._adapter is internal but needed for immediate save
                // Save the row (will mark columns as dirty and persist on adapter.save())
                row._adapter.save();

                // Schedule trigger for this announcement (owner-only, idempotent)
                this._scheduleNextAnnouncement();

                console.log(`AnnouncementManager: Set announcement for row ${row.rowNum}, scheduled for ${sendDate}`);
                return docUrl;
            } catch (error) {
                console.error('AnnouncementManager.createAnnouncement error:', error);
                throw error;
            }
        }

        /**
         * Send an announcement email for a row
         * @param {InstanceType<typeof Row>} row - Row object with announcement data
         * @returns {{success: boolean, error?: string}} Result object
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
                    RouteName: row.RouteName
                    // Note: Only including specific fields needed for template expansion
                };

                // Fetch route data for template enrichment (gain, length, fpm, startPin, lat, long)
                let route = null;
                if (row.RouteURL) {
                    try {
                        route = getRoute(row.RouteURL);
                    } catch (error) {
                        const err = error instanceof Error ? error : new Error(String(error));
                        console.warn(`AnnouncementManager: Could not fetch route data for enrichment: ${err.message}`);
                        // Continue without route data - fields will be missing but announcement will still send
                    }
                }

                // Convert document to HTML first (with template fields intact)
                let html = this._convertDocToHtml(doc);

                // Remove operator instructions section from HTML
                html = this._removeInstructionsFromHtml(html);

                // Expand template fields in the HTML (with route data for enrichment)
                // @ts-expect-error - AnnouncementCore is global namespace but VS Code sees module import type
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
                const err = error instanceof Error ? error : new Error(String(error));
                console.error(`AnnouncementManager.sendAnnouncement error for row ${row.rowNum}:`, error);
                return { success: false, error: err.message };
            }
        }

        /**
         * Send a reminder notification about an upcoming announcement
         * @param {InstanceType<typeof Row>} row - Row object with announcement data
         * @returns {{success: boolean, error?: string}} Result object
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

                if (!sendDate) {
                    throw new Error('SendAt date is not set for this announcement');
                }

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
                const err = error instanceof Error ? error : new Error(String(error));
                console.error(`AnnouncementManager.sendReminder error for row ${row.rowNum}:`, error);
                return { success: false, error: err.message };
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
                // @ts-expect-error - TriggerManager is global namespace but VS Code sees module import type
                this._removeTrigger();
                return { sent: 0, reminded: 0, failed: 0, remaining: 0 };
            }

            const now = new Date().getTime();
            // @ts-expect-error - AnnouncementCore is global namespace but VS Code sees module import type
            const dueItems = AnnouncementCore.getDueItems(allRows, now);

            // Debug console.log(`AnnouncementManager: Processing ${dueItems.dueToSend.length} announcements and ${dueItems.dueForReminder.length} reminders`);

            let sent = 0;
            let reminded = 0;
            let failed = 0;

            // Process announcements due to send
            dueItems.dueToSend.forEach((/** @type {any} */ row) => {
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
                        // @ts-expect-error - AnnouncementCore is global namespace but VS Code sees module import type
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
            dueItems.dueForReminder.forEach((/** @type {any} */ row) => {
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

            // Schedule next announcement trigger
            this._scheduleNextAnnouncement();

            // Get statistics for return
            // @ts-expect-error - AnnouncementCore is global namespace but VS Code sees module import type
            const stats = AnnouncementCore.getStatistics(allRows);

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
                        const err = error instanceof Error ? error : new Error(String(error));
                        console.warn(`AnnouncementManager: Could not trash document: ${err}`);
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
            // @ts-expect-error - AnnouncementCore is global namespace but VS Code sees module import type
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
                        const err = error instanceof Error ? error : new Error(String(error));
                        failedCount++;
                        console.warn(`AnnouncementManager: Could not trash document: ${err.message}`);
                    }

                    // Clear announcement columns
                    row.Announcement = '';
                    // @ts-expect-error - Clear other announcement-related columns
                    row.SendAt = undefined;
                    row.Status = '';
                    row.Attempts = 0;
                    row.LastError = '';
                    // @ts-expect-error - Clear last attempt timestamp
                    row.LastAttemptAt = undefined;
                });

                // Save all changes
                adapter.save();

                // Remove scheduled trigger (owner-only, idempotent)
                this._scheduleNextAnnouncement();

                console.log(`AnnouncementManager: Cleared ${count} announcements (${trashedCount} docs trashed, ${failedCount} failed)`);
                return count;
            } catch (error) {
                console.error('AnnouncementManager.clearAll error:', error);
                throw error;
            }
        }

        /**
         * Handle ride cancellation with announcement
         * @param {InstanceType<typeof Row>} row - Row object from ScheduleAdapter
         * @param {boolean} sendEmail - Whether to send cancellation email
         * @param {string} [reason=''] - User-provided cancellation reason
         * @returns {{announcementSent: boolean, error?: string}} Result object
         */
        handleCancellation(row, sendEmail, reason = '') {
            try {
                // Check if announcement exists
                if (!row.Announcement || !row.Status) {
                    console.log(`AnnouncementManager.handleCancellation: No announcement for row ${row.rowNum}, skipping`);
                    return { announcementSent: false };
                }

                if (sendEmail) {
                    // Send cancellation email
                    const emailResult = this._sendCancellationEmail(row, reason);
                    if (!emailResult.success) {
                        return { announcementSent: false, error: emailResult.error };
                    }
                }

                // Update status to cancelled regardless of whether email was sent
                row.Status = 'cancelled';
                // @ts-ignore - Row._adapter is internal but needed for immediate save
                row._adapter.save();

                console.log(`AnnouncementManager.handleCancellation: Row ${row.rowNum} cancelled, email sent: ${sendEmail}`);
                return { announcementSent: sendEmail };
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                console.error(`AnnouncementManager.handleCancellation error for row ${row.rowNum}:`, error);
                return { announcementSent: false, error: err.message };
            }
        }

        /**
         * Handle ride reinstatement with announcement
         * @param {InstanceType<typeof Row>} row - Row object from ScheduleAdapter
         * @param {boolean} sendEmail - Whether to send reinstatement email
         * @param {string} [reason=''] - User-provided reinstatement reason
         * @returns {{announcementSent: boolean, error?: string}} Result object
         */
        handleReinstatement(row, sendEmail, reason = '') {
            try {
                // Check if announcement exists
                if (!row.Announcement || !row.Status) {
                    console.log(`AnnouncementManager.handleReinstatement: No announcement for row ${row.rowNum}, skipping`);
                    return { announcementSent: false };
                }

                if (sendEmail) {
                    // Send reinstatement email
                    const emailResult = this._sendReinstatementEmail(row, reason);
                    if (!emailResult.success) {
                        return { announcementSent: false, error: emailResult.error };
                    }
                }

                // Update status to pending regardless of whether email was sent
                row.Status = 'pending';
                // @ts-ignore - Row._adapter is internal but needed for immediate save
                row._adapter.save();

                console.log(`AnnouncementManager.handleReinstatement: Row ${row.rowNum} reinstated, email sent: ${sendEmail}`);
                return { announcementSent: sendEmail };
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                console.error(`AnnouncementManager.handleReinstatement error for row ${row.rowNum}:`, error);
                return { announcementSent: false, error: err.message };
            }
        }

        /**
         * Update announcement when ride is updated
         * Automatically updates document name and sendAt based on new ride data
         * If no announcement exists, creates one
         * 
         * @param {InstanceType<typeof Row>} row - Row object with updated ride data
         * @returns {{success: boolean, error?: string}} Result object
         */
        updateAnnouncement(row) {
            try {
                // Check if row has announcement - if not, create one
                if (!row.Announcement || !row.Status) {
                    console.log(`AnnouncementManager.updateAnnouncement: No announcement for row ${row.rowNum}, creating one`);
                    try {
                        this.createAnnouncement(row);
                        console.log(`AnnouncementManager.updateAnnouncement: Created announcement for row ${row.rowNum}`);
                        return { success: true };
                    } catch (createError) {
                        const err = createError instanceof Error ? createError : new Error(String(createError));
                        console.error(`AnnouncementManager.updateAnnouncement: Failed to create announcement for row ${row.rowNum}:`, err);
                        return { success: false, error: `Failed to create announcement: ${err.message}` };
                    }
                }

                // Get current announcement document name
                const documentId = this._extractDocId(row.Announcement);
                if (!documentId) {
                    throw new Error(`Invalid announcement URL: ${row.Announcement}`);
                }

                const doc = DriveApp.getFileById(documentId);
                const currentDocName = doc.getName();

                // Calculate what updates are needed
                const timezone = Session.getScriptTimeZone();
                // @ts-expect-error - AnnouncementCore is global namespace but VS Code sees module import type
                const updates = AnnouncementCore.calculateAnnouncementUpdates(
                    {
                        documentName: currentDocName
                    },
                    {
                        rideName: row.RideName,
                        rideDate: row.StartDate
                    },
                    timezone
                );

                console.log(`AnnouncementManager.updateAnnouncement: Updates needed for row ${row.rowNum}:`, {
                    needsDocumentRename: updates.needsDocumentRename,
                    needsSendAtUpdate: updates.needsSendAtUpdate
                });

                // Always update sendAt to calculated time
                if (updates.needsSendAtUpdate && updates.calculatedSendAt) {
                    row.SendAt = updates.calculatedSendAt;
                    console.log(`AnnouncementManager.updateAnnouncement: Updated sendAt to ${updates.calculatedSendAt} for row ${row.rowNum}`);
                }

                // Rename document if needed
                if (updates.needsDocumentRename && updates.newDocumentName) {
                    try {
                        doc.setName(updates.newDocumentName);
                        console.log(`AnnouncementManager.updateAnnouncement: Renamed document to ${updates.newDocumentName} for row ${row.rowNum}`);
                    } catch (renameError) {
                        const err = renameError instanceof Error ? renameError : new Error(String(renameError));
                        console.error(`AnnouncementManager.updateAnnouncement: Failed to rename document for row ${row.rowNum}:`, err);
                        // Add to retry queue for document rename (future enhancement)
                        // For now, just log and continue - the announcement will still work
                    }
                }

                // Reschedule trigger if sendAt changed
                if (updates.needsSendAtUpdate) {
                    this._scheduleNextAnnouncement();
                }

                // @ts-ignore - Row._adapter is internal but needed for immediate save
                row._adapter.save();

                return { success: true };
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                console.error(`AnnouncementManager.updateAnnouncement error for row ${row.rowNum}:`, error);
                return { success: false, error: err.message };
            }
        }

        // ========== PRIVATE HELPER METHODS ==========

        /**
         * Extract folder ID from URL
         * @private
         * @param {string} url - Drive folder URL
         * @returns {string} Folder ID
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
         * @param {string} urlOrId - Document URL or ID
         * @returns {string|null} Document ID or null
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
         * Get a document from a template
         * @param {{type: string, id: string}} templateInfo - Template info object
         * @returns {GoogleAppsScript.Drive.File} Template file
         * @private
         */
        _getTemplateFile(templateInfo) {
            try {
                return DriveApp.getFileById(templateInfo.id);
            } catch (error) {
                if (templateInfo.type === 'personal') {
                    throw new Error(`Personal template not found: (${templateInfo.id})  - check your Personal Templates settings for ${Session.getActiveUser().getEmail()}`);
                } else {
                    throw new Error(`Master template not found: (${templateInfo.id}) - check RIDE_ANNOUNCEMENT_MASTER_TEMPLATE and RIDE_ANNOUNCEMENT_FOLDER_URL in Globals`);
                }
            }
        }

        /**
 * get Ride Announcement Folder
 * @private
 * @returns {GoogleAppsScript.Drive.Folder} Folder object
 */
        _getRideAnnouncementFolder() {
            const folderUrl = getGlobals().RIDE_ANNOUNCEMENT_FOLDER_URL;
            if (!folderUrl) {
                throw new Error('RIDE_ANNOUNCEMENT_FOLDER_URL not configured in Globals');
            }
            const folder = this._getFolderFromUrl(folderUrl);
            return folder;
        }

        /**
         * Get a folder from a folder URL
         * @param {string} folderUrl - Folder URL
         * @returns {GoogleAppsScript.Drive.Folder} Folder object
         * @private
         */
        _getFolderFromUrl(folderUrl) {
            const folderId = this._extractFolderId(folderUrl);
            try {
                return DriveApp.getFolderById(folderId);
            } catch (error) {
                throw new Error(`Could not access folder with ID ${folderId} from URL ${folderUrl}: ${error}`);
            }
        }

        /**
         * Copy a template and append operator instructions
         * @private
         * @param {{type: string, id:string}} templateInfo - Template info object
         * @param {any} row - Row data object
         * @returns {GoogleAppsScript.Drive.File} New document file
         */
        _copyTemplate(templateInfo, row) {
            const rideName = row.RideName || 'Unknown Ride';
            console.log(`AnnouncementManager: Creating announcement for ${rideName} (row ${row.rowNum})`);
            const templateFile = this._getTemplateFile(templateInfo)

            const folder = this._getRideAnnouncementFolder();
            const docName = `RA-${rideName}`;
            try { 
                return templateFile.makeCopy(docName, folder); 
            } catch (error) {
                const folderUrl = getGlobals().RIDE_ANNOUNCEMENT_FOLDER_URL;
                const err = error instanceof Error ? error : new Error(String(error));
                throw new Error(`Could not create a copy of the template file in the Ride Announcement Folder at ${folderUrl}. \n Check that user ${Session.getEffectiveUser().getEmail()} has edit access to the folder. \n Original error details  ${err.message}`);
            }
        }
        /**
         * Append operator instructions to announcement document
         * These instructions will be automatically removed when the email is sent
         * @private
         * @param {string} documentId - Document ID
         * @param {Date|number} sendTime - Scheduled send time
         * @param {any} rowData - Row data object
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
                    // @ts-expect-error - setForegroundColor exists but not in TypeScript defs
                    .setForegroundColor('#990000');

                body.appendParagraph('⚠️ This section will be automatically removed when the announcement is sent.')
                    // @ts-expect-error - setForegroundColor exists but not in TypeScript defs
                    .setBold(true);

                // Send time information
                const sendTimeFormatted = new Date(sendTime).toLocaleString('en-US', {
                    timeZone: Session.getScriptTimeZone(),
                    dateStyle: 'full',
                    timeStyle: 'short'
                });
                body.appendParagraph(`Scheduled Send Time: ${sendTimeFormatted}`)
                    // @ts-expect-error - setForegroundColor exists but not in TypeScript defs
                    .setBold(true);

                // Template field explanation
                body.appendParagraph('Template Fields')
                    .setHeading(DocumentApp.ParagraphHeading.HEADING3);

                body.appendParagraph('Fields in curly braces (e.g., {RideName}) will be replaced with current ride data when the email is sent. You can edit the text around these fields, but keep the {FieldName} syntax intact.');

                // Available fields
                body.appendParagraph('Available Fields:')
                    // @ts-expect-error - setForegroundColor exists but not in TypeScript defs
                    .setBold(true);

                const fields = [
                    '{DateTime} - Full date and time (e.g., "Saturday, December 7, 2024 at 10:00 AM")',
                    '{Date} - Date only (e.g., "December 7, 2024")',
                    '{Day} - Day of week (e.g., "Saturday")',
                    '{Time} - Time only (e.g., "10:00 AM")',
                    '{RideLink} - Full hyperlink: RideName + RideURL',
                    '{RideLeader} - Name(s) of the ride leader(s)',
                    '{Group} - Ride group (e.g., A, B, C etc)',
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
                const err = error instanceof Error ? error : new Error(String(error));
                console.error(`AnnouncementManager: Failed to append instructions to ${documentId}:`, err.message);
                // Don't throw - instructions are helpful but not critical
            }
        }

        /**
         * Convert Google Doc to HTML
         * Based on DocsService pattern from SCCCCMembershipManagement
         * @param {GoogleAppsScript.Document.Document} doc - Document object
         * @returns {string} HTML string
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
         * @param {any} element - Document element
         * @returns {string} HTML string
         * @private
         */
        _processElement(element) {
            let html = '';

            switch (element.getType()) {
                case DocumentApp.ElementType.PARAGRAPH:
                    const para = /** @type {GoogleAppsScript.Document.Paragraph} */ (element);
                    html += '<p>';
                    const numChildren = para.getNumChildren();
                    for (let i = 0; i < numChildren; i++) {
                        html += this._processElement(para.getChild(i));
                    }
                    html += '</p>';
                    break;

                case DocumentApp.ElementType.TEXT:
                    html += this._processText(/** @type {GoogleAppsScript.Document.Text} */(element));
                    break;

                case DocumentApp.ElementType.INLINE_IMAGE:
                    html += this._processInlineImage(/** @type {GoogleAppsScript.Document.InlineImage} */(element));
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
         * Process inline image element to HTML with base64 encoding
         * Converts image to data URL for email embedding
         * 
         * Note: Gmail and other email clients may have issues with:
         * - Images larger than ~100KB when base64 encoded
         * - Certain image formats (prefer PNG, JPG, GIF)
         * - Total email size > 25MB
         * @param {any} imageElement - Inline image element
         * @returns {string} HTML img tag with base64 data URL
         * @private
         */
        _processInlineImage(imageElement) {
            try {
                // Get basic image info first
                const width = imageElement.getWidth();
                const height = imageElement.getHeight();
                const altText = imageElement.getAltDescription() || imageElement.getAltTitle() || '';

                // Check if this is likely an emoji (small icon-sized image)
                // Emoji images from Google Docs are typically 17x17 or similar small sizes
                const isLikelyEmoji = width <= 20 && height <= 20;

                if (isLikelyEmoji && altText) {
                    // For emoji-sized images with alt text, just use the Unicode character
                    // This preserves emojis that were pasted into the doc
                    // Debug - console.log(`AnnouncementManager: Skipping emoji-sized image (${width}x${height}), using alt text: "${altText}"`);
                    return altText;
                }

                // Get image blob for actual images
                const blob = imageElement.getBlob();
                const contentType = blob.getContentType();
                const bytes = blob.getBytes();

                // Log image details for debugging
                const sizeKB = bytes.length / 1024;
                console.log(`AnnouncementManager: Processing image - Type: ${contentType}, Size: ${Math.round(sizeKB)}KB, Dimensions: ${width}x${height}, Alt: "${altText}"`);

                // Warn about large images (base64 encoding increases size by ~33%)
                if (sizeKB > 100) {
                    console.warn(`AnnouncementManager: Large image detected (${Math.round(sizeKB)}KB). Email clients may not display images >100KB. Consider resizing images in the document.`);
                }

                // Encode to base64
                const base64Data = Utilities.base64Encode(bytes);

                // Get link URL if image is clickable
                const linkUrl = imageElement.getLinkUrl();

                // Build data URL for embedded image
                const dataUrl = `data:${contentType};base64,${base64Data}`;

                // Use simple alt text or empty string
                const cleanAltText = altText || '';

                // Build img tag with dimensions - use standard HTML syntax for email compatibility
                let imgTag = `<img src="${dataUrl}" alt="${this._encodeHtmlEntities(cleanAltText)}"`;
                if (width) {
                    imgTag += ` width="${width}"`;
                }
                if (height) {
                    imgTag += ` height="${height}"`;
                }
                imgTag += ` style="max-width:100%; height:auto; display:inline-block;"`;
                imgTag += ` border="0"`; // Prevent border in some email client imgTag += `>`;  // Use > instead of /> for better email client compatibility

                // Wrap in link if clickable
                if (linkUrl) {
                    return `<a href="${linkUrl}">${imgTag}</a>`;
                }

                return imgTag;
            } catch (error) {
                console.error('AnnouncementManager: Error processing inline image:', error);
                return '[Image could not be loaded]';
            }
        }

        /**
         * Process text element with formatting
         * @private
         * @param {GoogleAppsScript.Document.Text} element - Text element
         * @returns {string} HTML formatted text
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
         * @param {string} text - Text to format
         * @param {any} attributes - Text attributes object
         * @returns {string} Formatted HTML
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
         * Get template ID for current user
         * Checks Personal Templates sheet first, falls back to master template
         * @private
         * @returns {{type:string, id: string}} Object representing the type (personal/master) and template ID
         */
        _getTemplateInfo() {
            const globals = getGlobals();
            const userEmail = Session.getActiveUser().getEmail().toLowerCase();

            // Try personal templates first
            // @ts-expect-error - getPersonalTemplates is global but VS Code sees module import type
            const personalTemplates = getPersonalTemplates();
            console.log('Personal templates loaded:', personalTemplates);
            if (personalTemplates[userEmail]) {
                console.log(`AnnouncementManager: Using personal template for ${userEmail}`);
                const templateId = this._extractDocId(personalTemplates[userEmail]);
                if (templateId) return { type: 'personal', id: templateId };
                console.warn(`AnnouncementManager: Invalid personal template URL for ${userEmail}, falling back to master`);
            }

            // Fall back to master template
            console.log(`AnnouncementManager: Using master template`);
            const docId = this._extractDocId(globals.RIDE_ANNOUNCEMENT_MASTER_TEMPLATE);
            if (docId) return { type: 'master', id: docId };
            throw new Error('AnnouncementManager: Invalid master template URL');
        }

        /**
         * Encode HTML entities
         * Replaces &, <, >, ', " with corresponding HTML entities
         * @param {string} text - Input text
         * @returns {string} Encoded text
         * @private
         */
        _encodeHtmlEntities(text) {
            return text.replace(/[&<>'"]/g, function (/** @type {string} */ c) {
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
         * @param {string} html - HTML content
         * @returns {string} Cleaned HTML content
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
            // Debug console.log(`AnnouncementManager: Removed instructions from HTML (${html.length} -> ${cleaned.length} chars)`);
            return cleaned;
        }

        /**
         * Extract subject line from HTML content
         * Looks for "Subject: ..." at the beginning and removes it from body
         * @param {string} html - HTML content
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
         * Sends email to Ride Scheduler group with details
         * @param {InstanceType<typeof Row>} row - Row instance
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
                const err = error instanceof Error ? error : new Error(String(error));
                console.error(`AnnouncementManager: Failed to send failure notification:`, err.message);
            }
        }

        /**
         * Schedule the next announcement trigger based on pending announcements
         * Uses TriggerManager to create scheduled trigger for earliest pending announcement
         * Removes trigger if no pending announcements
         * @private
         */
        _scheduleNextAnnouncement() {
            try {
                // Only owner can manage triggers
                if (!this.triggerManager.isOwner()) {
                    console.log('AnnouncementManager: Skipping trigger scheduling (not owner)');
                    return;
                }

                // Load all rows to find next pending announcement
                const adapter = new ScheduleAdapter();
                const allRows = adapter.loadAll();

                // Find earliest pending announcement
                const pendingRows = allRows.filter(r =>
                    r.Announcement &&
                    r.Status === 'pending' &&
                    r.SendAt
                );

                if (pendingRows.length === 0) {
                    // No pending announcements - remove trigger
                    this.triggerManager.removeAnnouncementTrigger();
                    console.log('AnnouncementManager: No pending announcements, trigger removed');
                    return;
                }

                // Find earliest send time
                const earliestRow = pendingRows.reduce((earliest, row) => {
                    if (!row.SendAt || !earliest.SendAt) return earliest;
                    return row.SendAt.getTime() < earliest.SendAt.getTime() ? row : earliest;
                });

                if (!earliestRow.SendAt) {
                    console.warn('AnnouncementManager: Earliest row has no SendAt time');
                    return;
                }
                const nextSendTime = earliestRow.SendAt.getTime();

                // Schedule trigger for earliest announcement
                this.triggerManager.scheduleAnnouncementTrigger(nextSendTime);
                console.log(`AnnouncementManager: Scheduled trigger for ${earliestRow.SendAt.toLocaleString()} (row ${earliestRow.rowNum})`);

            } catch (error) {
                console.error('AnnouncementManager._scheduleNextAnnouncement error:', error);
                // Don't throw - trigger scheduling failures shouldn't break announcement creation
            }
        }

        /**
         * Send cancellation email
         * @private
         * @param {InstanceType<typeof Row>} row - Row instance
         * @param {string} reason - Cancellation reason
         * @returns {{success: boolean, error?: string}} Result object
         */
        _sendCancellationEmail(row, reason) {
            try {
                const globals = getGlobals();
                const templateUrl = globals.CANCELLATION_TEMPLATE;

                if (!templateUrl) {
                    throw new Error('CANCELLATION_TEMPLATE not configured in Globals');
                }

                // Load and expand template
                const { html, subject } = this._loadAndExpandTemplate(templateUrl, row, reason, 'Reason');

                // Send email
                const recipientEmail = globals.RIDE_ANNOUNCEMENT_EMAIL;
                if (!recipientEmail) {
                    throw new Error('RIDE_ANNOUNCEMENT_EMAIL not configured in Globals');
                }

                MailApp.sendEmail(recipientEmail, subject, '', {
                    htmlBody: html,
                    name: 'Ride Scheduler',
                    replyTo: globals.RIDE_SCHEDULER_GROUP_EMAIL || Session.getActiveUser().getEmail()
                });

                console.log(`AnnouncementManager: Sent cancellation email for row ${row.rowNum} to ${recipientEmail}`);
                return { success: true };
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                console.error(`AnnouncementManager._sendCancellationEmail error for row ${row.rowNum}:`, err);
                return { success: false, error: err.message };
            }
        }

        /**
         * Send reinstatement email
         * @private
         * @param {InstanceType<typeof Row>} row - Row instance
         * @param {string} reason - Reinstatement reason
         * @returns {{success: boolean, error?: string}} Result object
         */
        _sendReinstatementEmail(row, reason) {
            try {
                const globals = getGlobals();
                const templateUrl = globals.REINSTATEMENT_TEMPLATE;

                if (!templateUrl) {
                    throw new Error('REINSTATEMENT_TEMPLATE not configured in Globals');
                }

                // Load and expand template
                const { html, subject } = this._loadAndExpandTemplate(templateUrl, row, reason, 'Reason');

                // Send email
                const recipientEmail = globals.RIDE_ANNOUNCEMENT_EMAIL;
                if (!recipientEmail) {
                    throw new Error('RIDE_ANNOUNCEMENT_EMAIL not configured in Globals');
                }

                MailApp.sendEmail(recipientEmail, subject, '', {
                    htmlBody: html,
                    name: 'Ride Scheduler',
                    replyTo: globals.RIDE_SCHEDULER_GROUP_EMAIL || Session.getActiveUser().getEmail()
                });

                console.log(`AnnouncementManager: Sent reinstatement email for row ${row.rowNum} to ${recipientEmail}`);
                return { success: true };
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                console.error(`AnnouncementManager._sendReinstatementEmail error for row ${row.rowNum}:`, err);
                return { success: false, error: err.message };
            }
        }

        /**
         * Load template document and expand with row data
         * @private
         * @param {string} templateUrl - Template document URL
         * @param {InstanceType<typeof Row>} row - Row instance
         * @param {string} reason - Cancellation/reinstatement reason
         * @param {string} reasonFieldName - Field name for reason (always 'Reason')
         * @returns {{html: string, subject: string}} HTML and subject
         */
        _loadAndExpandTemplate(templateUrl, row, reason, reasonFieldName) {
            // Extract document ID from template URL
            const documentId = this._extractDocId(templateUrl);
            if (!documentId) {
                throw new Error(`Invalid template URL: ${templateUrl}`);
            }

            // Open the template document
            const doc = DocumentApp.openById(documentId);

            // Build rowData object for template expansion
            // Use "No reason given" if reason is empty or not provided
            const reasonText = reason && reason.trim() ? reason : 'No reason given';

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
                [reasonFieldName]: reasonText, // Add the reason field with default
                // @ts-expect-error - _data is private but needed for complete template expansion
                ...row._data
            };

            // Fetch route data for template enrichment (gain, length, fpm, startPin, lat, long)
            let route = null;
            if (row.RouteURL) {
                try {
                    route = getRoute(row.RouteURL);
                } catch (error) {
                    const err = error instanceof Error ? error : new Error(String(error));
                    console.warn(`AnnouncementManager: Could not fetch route data for enrichment: ${err.message}`);
                }
            }

            // Convert document to HTML
            let html = this._convertDocToHtml(doc);

            // Expand template fields in the HTML (with route data for enrichment)
            // @ts-expect-error - AnnouncementCore is global namespace but VS Code sees module import type
            const expandResult = AnnouncementCore.expandTemplate(html, rowData, route);
            html = expandResult.expandedText;

            // Extract subject from HTML
            const emailContent = this._extractSubjectFromHtml(html);
            const subject = emailContent.subject || `Ride ${reasonFieldName === 'CancellationReason' ? 'Cancellation' : 'Reinstatement'}: ${row.RideName || 'Unknown Ride'}`;
            const htmlBody = emailContent.body;

            return { html: htmlBody, subject };
        }
    }

    return AnnouncementManager;
})();

// Node.js compatibility
if (typeof module !== 'undefined') {
    module.exports = AnnouncementManager;
}
