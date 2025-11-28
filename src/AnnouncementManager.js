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
                
                // Open the document and get template content
                const doc = DocumentApp.openById(item.documentId);
                const templateText = doc.getBody().getText();
                
                // Expand template using core logic
                const expandResult = AnnouncementCore.expandTemplate(templateText, item.rowData);
                
                // Highlight missing fields in the document if any
                if (expandResult.missingFields.length > 0) {
                    this._highlightMissingFields(doc, expandResult.missingFields);
                    console.log(`AnnouncementManager: Highlighted ${expandResult.missingFields.length} missing fields in ${item.documentId}`);
                }
                
                // Extract subject using core logic
                const emailContent = AnnouncementCore.extractSubject(expandResult.expandedText);
                const subject = emailContent.subject || `Ride Announcement: ${item.rowData.RideName || 'Unknown Ride'}`;
                const body = emailContent.body;
                
                // Get document URL for footer
                const docUrl = doc.getUrl();
                const footer = `\n\n---\nView/edit this announcement: ${docUrl}`;
                
                // Send email
                GmailApp.sendEmail(recipientEmail, subject, body + footer, {
                    name: 'Ride Scheduler',
                    replyTo: globals.RIDE_SCHEDULER_GROUP_EMAIL || Session.getActiveUser().getEmail()
                });
                
                console.log(`AnnouncementManager: Sent announcement ${item.id} to ${recipientEmail}`);
                
                // Show popup notification
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
            
            // Process announcements due to send
            dueItems.dueToSend.forEach(item => {
                try {
                    // Check if document still exists
                    const docExists = this._checkDocumentExists(item.documentId);
                    if (!docExists) {
                        console.warn(`AnnouncementManager: Document ${item.documentId} no longer exists, recreating...`);
                        // Recreate the document
                        const newDocId = this._recreateDocument(item);
                        item.documentId = newDocId;
                    }
                    
                    const result = this.sendAnnouncement(item);
                    
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
         * Get queue statistics for monitoring
         * @returns {Object} Statistics object
         */
        getStatistics() {
            const queue = this._getQueue();
            return AnnouncementCore.getStatistics(queue);
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
         * Highlight missing fields in the document body
         * @private
         */
        _highlightMissingFields(doc, missingFields) {
            const body = doc.getBody();
            missingFields.forEach(field => {
                const placeholder = `{${field}}`;
                // Search for the placeholder text and highlight it yellow
                const searchResult = body.findText(placeholder);
                if (searchResult) {
                    const element = searchResult.getElement();
                    const startOffset = searchResult.getStartOffset();
                    const endOffset = searchResult.getEndOffsetInclusive();
                    element.asText().setBackgroundColor(startOffset, endOffset, '#FFFF00'); // Yellow
                }
            });
            doc.saveAndClose();
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
         * Recreate a deleted document
         * @private
         */
        _recreateDocument(item) {
            const globals = getGlobals();
            const templateId = this._extractDocId(globals.RIDE_ANNOUNCEMENT_MASTER_TEMPLATE);
            const folderUrl = globals.RIDE_ANNOUNCEMENT_FOLDER_URL;
            
            const templateFile = DriveApp.getFileById(templateId);
            const folderId = this._extractFolderId(folderUrl);
            const folder = DriveApp.getFolderById(folderId);
            const rideName = item.rowData.RideName || 'Unknown Ride';
            const docName = `RA-${rideName}`;
            const newDoc = templateFile.makeCopy(docName, folder);
            
            // Set permissions
            const rsGroupEmail = globals.RIDE_SCHEDULER_GROUP_EMAIL;
            if (rsGroupEmail) {
                newDoc.addEditor(rsGroupEmail);
                newDoc.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            }
            
            console.log(`AnnouncementManager: Recreated document ${newDoc.getId()} (original was ${item.documentId})`);
            return newDoc.getId();
        }

        /**
         * Notify RS group of permanent announcement failure
         * @private
         */
        _notifyFailure(item) {
            try {
                const globals = getGlobals();
                const rsGroupEmail = globals.RIDE_SCHEDULER_GROUP_EMAIL;
                
                if (!rsGroupEmail) return;
                
                const rideName = item.rowData.RideName || 'Unknown Ride';
                const subject = `Failed: Ride announcement for "${rideName}"`;
                const body = `The scheduled ride announcement failed after ${item.attemptCount} attempts.\n\n` +
                    `Ride: ${rideName}\n` +
                    `Scheduled send time: ${new Date(item.sendTime).toLocaleString()}\n` +
                    `Document ID: ${item.documentId}\n` +
                    `Last error: ${item.lastError}\n\n` +
                    `Please send this announcement manually.`;
                
                GmailApp.sendEmail(rsGroupEmail, subject, body, {
                    name: 'Ride Scheduler',
                    replyTo: rsGroupEmail
                });
            } catch (error) {
                console.error('Failed to send failure notification:', error);
            }
        }

        /**
         * Get queue from PropertiesService
         * @private
         */
        _getQueue() {
            const queueJson = this.props.getProperty(this.QUEUE_KEY);
            return queueJson ? JSON.parse(queueJson) : [];
        }

        /**
         * Save queue to PropertiesService
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
            console.log('AnnouncementManager: Created hourly trigger for queue processing');
        }

        /**
         * Remove the trigger when queue is empty
         * @private
         */
        _removeTrigger() {
            const triggerId = this.props.getProperty(this.TRIGGER_KEY);
            if (!triggerId) return;
            
            const triggers = ScriptApp.getProjectTriggers();
            triggers.forEach(trigger => {
                if (trigger.getUniqueId() === triggerId) {
                    ScriptApp.deleteTrigger(trigger);
                    console.log('AnnouncementManager: Removed trigger');
                }
            });
            
            this.props.deleteProperty(this.TRIGGER_KEY);
        }
    }
    
    return AnnouncementManager;
})();

// Node.js export
if (typeof module !== 'undefined') {
    module.exports = AnnouncementManager;
}
