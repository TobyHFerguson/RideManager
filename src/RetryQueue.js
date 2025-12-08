/**
 * RetryQueue - GAS adapter for RetryQueueCore
 * 
 * This is a thin GAS-specific wrapper around RetryQueueCore.
 * All business logic is in RetryQueueCore (pure JavaScript, fully tested).
 * This layer only handles GAS APIs: SpreadsheetApp, Utilities, CalendarApp, etc.
 * 
 * REFACTORED: Now uses RetryQueueSpreadsheetAdapter for persistence instead of PropertiesService.
 * This provides operator visibility into queued retry operations.
 */

// Node.js compatibility
if (typeof require !== 'undefined') {
    var RetryQueueCore = require('./RetryQueueCore');
    var RetryQueueSpreadsheetAdapter = require('./RetryQueueSpreadsheetAdapter');
}

var RetryQueue = (function() {
    
    class RetryQueue {
        constructor() {
            this.props = PropertiesService.getScriptProperties();
            this.TRIGGER_KEY = 'calendarRetryTriggerId';
            
            // Use spreadsheet adapter for queue persistence (operator-visible)
            this.adapter = new RetryQueueSpreadsheetAdapter('Calendar Retry Queue');
            this.PROCESSING_KEY = 'RETRY_QUEUE_PROCESSING';
        }

        /**
         * Add a failed calendar operation to the retry queue
         * @param {Object} operation - Operation details
         * @param {string} operation.type - 'create' | 'update' | 'delete'
         * @param {string} operation.calendarId - Calendar ID
         * @param {string} operation.rideUrl - Stable ride URL identifier
         * @param {Object} operation.params - Operation-specific parameters
         * @param {string} operation.userEmail - User who initiated the operation
         */
        enqueue(operation) {
            // Use core logic to create queue item
            const queueItem = RetryQueueCore.createQueueItem(
                operation,
                () => Utilities.getUuid(),
                () => new Date().getTime()
            );
            
            // Set initial status
            queueItem.status = 'pending';
            
            // Add to spreadsheet
            this.adapter.enqueue(queueItem);
            this._ensureTriggerExists();
            
            console.log(`RetryQueue: Enqueued operation ${queueItem.id} for ride ${operation.rideUrl}`);
            return queueItem.id;
        }

        /**
         * Process all due retry operations
         * Called by time-based trigger
         */
        processQueue() {
            // Prevent concurrent processing
            if (this._isProcessing()) {
                console.log('RetryQueue: Already processing, skipping run');
                return { processed: 0, succeeded: 0, failed: 0, remaining: 0, skipped: true };
            }
            
            try {
                this._setProcessing(true);
                
                const queue = this.adapter.loadAll();
                if (queue.length === 0) {
                    console.log('RetryQueue: Queue empty, removing trigger');
                    this._removeTrigger();
                    return { processed: 0, succeeded: 0, failed: 0, remaining: 0 };
                }

                const now = new Date().getTime();
                const dueItems = RetryQueueCore.getDueItems(queue, now);
                
                console.log(`RetryQueue: Processing ${dueItems.length} due items out of ${queue.length} total`);
                
                let succeeded = 0;
                let failed = 0;
                
                dueItems.forEach(item => {
                    try {
                        // Mark as retrying (visual feedback in spreadsheet)
                        item.status = 'retrying';
                        this.adapter.update(item);
                        
                        const result = this._executeOperation(item);
                        
                        if (result.success) {
                            // Mark as succeeded and remove from queue immediately
                            item.status = 'succeeded';
                            this.adapter.remove(item.id);
                            succeeded++;
                            console.log(`RetryQueue: Operation ${item.id} succeeded on attempt ${item.attemptCount + 1}`);
                            
                            // Notify user of success
                            this._notifySuccess(item);
                        } else {
                            // Use core logic to update after failure
                            const updateResult = RetryQueueCore.updateAfterFailure(item, result.error, now);
                            
                            if (updateResult.shouldRetry) {
                                // Mark as failed and keep in queue for retry
                                updateResult.updatedItem.status = 'failed';
                                this.adapter.update(updateResult.updatedItem);
                                console.log(`RetryQueue: Operation ${item.id} failed, will retry at ${new Date(updateResult.updatedItem.nextRetryAt)}`);
                            } else {
                                // Max retries exceeded - mark as abandoned and keep in queue for investigation
                                updateResult.updatedItem.status = 'abandoned';
                                this.adapter.update(updateResult.updatedItem);
                                failed++;
                                console.error(`RetryQueue: Operation ${item.id} abandoned after ${updateResult.updatedItem.attemptCount} attempts`);
                                this._notifyFailure(updateResult.updatedItem);
                            }
                        }
                    } catch (error) {
                        console.error(`RetryQueue: Unexpected error processing item ${item.id}:`, error);
                        item.lastError = error.message;
                        item.status = 'failed';
                        this.adapter.update(item);
                    }
                });
                
                const remainingQueue = this.adapter.loadAll();
                if (remainingQueue.length === 0) {
                    this._removeTrigger();
                }
                
                return {
                    processed: dueItems.length,
                    succeeded: succeeded,
                    failed: failed,
                    remaining: remainingQueue.length
                };
            } finally {
                this._setProcessing(false);
            }
        }

        /**
         * Check if test mode is enabled (for testing)
         * @private
         */
        _isTestMode() {
            return this.props.getProperty('RETRY_QUEUE_TEST_MODE') === 'true';
        }

        /**
         * Check if failures should be forced (for testing)
         * @private
         */
        _shouldForceFailure() {
            return this.props.getProperty('RETRY_QUEUE_FORCE_FAILURE') === 'true';
        }

        /**
         * Execute a queued operation (GAS-specific)
         * @private
         * @returns {Object} { success: boolean, error?: string, eventId?: string }
         */
        _executeOperation(item) {
            // Test mode: Force failures if requested
            if (this._isTestMode() && this._shouldForceFailure()) {
                console.log('RetryQueue [TEST MODE]: Forcing failure');
                return { success: false, error: 'Calendar Not Found - Forced Test Failure' };
            }

            try {
                switch (item.type) {
                    case 'create':
                        return this._executeCreate(item);
                    case 'update':
                        return this._executeUpdate(item);
                    case 'delete':
                        return this._executeDelete(item);
                    default:
                        return { success: false, error: `Unknown operation type: ${item.type}` };
                }
            } catch (error) {
                return { success: false, error: error.message };
            }
        }

        /**
         * Execute calendar event creation (GAS-specific)
         * @private
         */
        _executeCreate(item) {
            const { calendarId, params } = item;
            const { title, startTime, endTime, location, description } = params;
            
            try {
                const calendar = CalendarApp.getCalendarById(calendarId);
                if (!calendar) {
                    return { success: false, error: 'Calendar not found' };
                }
                
                const event = calendar.createEvent(
                    title,
                    new Date(startTime),
                    new Date(endTime),
                    { description, location }
                );
                
                const eventId = event.getId();
                
                // Update the spreadsheet row with the event ID
                this._updateSpreadsheetRow(item.rideUrl, eventId);
                
                return { success: true, eventId };
            } catch (error) {
                return { success: false, error: error.message };
            }
        }

        /**
         * Execute calendar event update (GAS-specific)
         * @private
         */
        _executeUpdate(item) {
            const { calendarId, params } = item;
            const { eventId, title, startTime, endTime, location, description } = params;
            
            try {
                const calendar = CalendarApp.getCalendarById(calendarId);
                if (!calendar) {
                    return { success: false, error: 'Calendar not found' };
                }
                
                const event = calendar.getEventById(eventId);
                if (!event) {
                    return { success: false, error: 'Event not found' };
                }
                
                event.setTitle(title);
                event.setTime(new Date(startTime), new Date(endTime));
                event.setLocation(location);
                event.setDescription(description);
                
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        }

        /**
         * Execute calendar event deletion (GAS-specific)
         * @private
         */
        _executeDelete(item) {
            const { calendarId, params } = item;
            const { eventId } = params;
            
            try {
                const calendar = CalendarApp.getCalendarById(calendarId);
                if (!calendar) {
                    return { success: false, error: 'Calendar not found' };
                }
                
                const event = calendar.getEventById(eventId);
                if (event) {
                    event.deleteEvent();
                }
                // Consider missing event as success for delete operations
                return { success: true };
            } catch (error) {
                // Handle specific "already deleted" errors as success
                if (error.message.includes('does not exist') || error.message.includes('already been deleted')) {
                    return { success: true };
                }
                return { success: false, error: error.message };
            }
        }

        /**
         * Update spreadsheet row with successful event ID (GAS-specific)
         * @private
         */
        _updateSpreadsheetRow(rideUrl, eventId) {
            try {
                const adapter = new ScheduleAdapter();
                const rows = adapter.getAllRows();
                const row = rows.find(r => r.RideURL === rideUrl);
                
                if (row) {
                    row.GoogleEventId = eventId;
                    row._markDirty('GoogleEventId');
                    adapter.save();
                    console.log(`RetryQueue: Updated ride ${rideUrl} (row ${row.rowNum}) with event ID ${eventId}`);
                } else {
                    console.warn(`RetryQueue: Could not find ride ${rideUrl} in spreadsheet - may have been deleted`);
                }
            } catch (error) {
                console.error(`RetryQueue: Failed to update spreadsheet for ride ${rideUrl}:`, error);
            }
        }

        /**
         * Notify user of successful retry (GAS-specific)
         * @private
         */
        _notifySuccess(item) {
            const rideInfo = `"${item.rideTitle || 'Unknown'}" (Row ${item.rowNum || 'Unknown'})`;
            const message = `Calendar event created successfully for ride ${rideInfo} after ${item.attemptCount + 1} attempt(s).\n\nRide URL: ${item.rideUrl}`;
            console.log(`RetryQueue SUCCESS: ${message} - User: ${item.userEmail}`);
            
            // TODO: Could send email notification if needed
            // MailApp.sendEmail(item.userEmail, 'Calendar Event Created', message);
        }

        /**
         * Notify user of permanent failure (GAS-specific)
         * @private
         */
        _notifyFailure(item) {
            const rideInfo = `"${item.rideTitle || 'Unknown'}" (Row ${item.rowNum || 'Unknown'})`;
            const message = `Failed to create calendar event for ride ${rideInfo} after ${item.attemptCount} attempts over 48 hours. Last error: ${item.lastError}`;
            console.error(`RetryQueue FAILURE: ${message} - User: ${item.userEmail}`);
            
            // Send email notification
            try {
                MailApp.sendEmail({
                    to: item.userEmail,
                    subject: 'Calendar Event Creation Failed',
                    body: `${message}\n\nRide URL: ${item.rideUrl}\nUser email: ${item.userEmail}\n\nPlease manually create the calendar event for this ride.`
                });
                console.log(`RetryQueue: Failure notification email sent to ${item.userEmail}`);
            } catch (error) {
                console.error(`RetryQueue: Failed to send failure notification email to ${item.userEmail}:`, error);
            }
        }

        /**
         * Ensure time-based trigger exists for queue processing (GAS-specific)
         * @private
         */
        _ensureTriggerExists() {
            const existingTriggerId = this.props.getProperty(this.TRIGGER_KEY);
            
            if (existingTriggerId) {
                // Check if trigger still exists
                const triggers = ScriptApp.getProjectTriggers();
                const triggerExists = triggers.some(t => t.getUniqueId() === existingTriggerId);
                if (triggerExists) {
                    return; // Trigger already exists
                }
            }
            
            // Create new trigger - runs every 5 minutes
            const trigger = ScriptApp.newTrigger('processRetryQueue')
                .timeBased()
                .everyMinutes(5)
                .create();
            
            this.props.setProperty(this.TRIGGER_KEY, trigger.getUniqueId());
            console.log('RetryQueue: Created new trigger:', trigger.getUniqueId());
        }

        /**
         * Remove time-based trigger when queue is empty (GAS-specific)
         * @private
         */
        _removeTrigger() {
            const triggerId = this.props.getProperty(this.TRIGGER_KEY);
            if (!triggerId) return;
            
            const triggers = ScriptApp.getProjectTriggers();
            triggers.forEach(trigger => {
                if (trigger.getUniqueId() === triggerId) {
                    ScriptApp.deleteTrigger(trigger);
                    console.log('RetryQueue: Deleted trigger:', triggerId);
                }
            });
            
            this.props.deleteProperty(this.TRIGGER_KEY);
        }

        /**
         * Check if queue is currently being processed (for concurrent lock)
         * @private
         */
        _isProcessing() {
            return this.props.getProperty(this.PROCESSING_KEY) === 'true';
        }

        /**
         * Set or clear processing lock
         * @private
         * @param {boolean} value - True to set lock, false to clear
         */
        _setProcessing(value) {
            if (value) {
                this.props.setProperty(this.PROCESSING_KEY, 'true');
            } else {
                this.props.deleteProperty(this.PROCESSING_KEY);
            }
        }

        /**
         * Remove queue item by event ID (for cancellation)
         * Used when a ride is cancelled to remove pending calendar creation from retry queue
         * @param {string} eventId - Google Calendar event ID
         */
        removeByEventId(eventId) {
            const queue = this.adapter.loadAll();
            const itemToRemove = queue.find(item => item.params && item.params.eventId === eventId);
            
            if (itemToRemove) {
                this.adapter.remove(itemToRemove.id);
                console.log(`RetryQueue: Removed item for event ${eventId}`);
            } else {
                console.log(`RetryQueue: No item found for event ${eventId}`);
            }
        }

        /**
         * Get current queue status for debugging
         */
        getStatus() {
            const queue = this.adapter.loadAll();
            const now = new Date().getTime();
            
            const stats = RetryQueueCore.getStatistics(queue, now);
            const items = RetryQueueCore.formatItems(queue, now);
            
            return {
                ...stats,
                items
            };
        }

        /**
         * Clear entire queue (for testing/debugging)
         */
        clearQueue() {
            this.adapter.clear();
            this._removeTrigger();
            console.log('RetryQueue: Queue cleared');
        }
    }
    
    return RetryQueue;
})();

/**
 * Global function called by time-based trigger
 * Must be at global scope for GAS to invoke it
 */
function processRetryQueue() {
    try {
        const queue = new RetryQueue();
        const result = queue.processQueue();
        console.log('processRetryQueue completed:', result);
    } catch (error) {
        console.error('processRetryQueue error:', error);
    }
}

// Export for Node.js testing
if (typeof module !== 'undefined') {
    module.exports = RetryQueue;
}
