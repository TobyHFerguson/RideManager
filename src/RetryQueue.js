/**
 * RetryQueue - GAS adapter for RetryQueueCore
 * 
 * This is a thin GAS-specific wrapper around RetryQueueCore.
 * All business logic is in RetryQueueCore (pure JavaScript, fully tested).
 * This layer only handles GAS APIs: PropertiesService, Utilities, CalendarApp, etc.
 */

// Node.js compatibility
if (typeof require !== 'undefined') {
    var RetryQueueCore = require('./RetryQueueCore');
}

var RetryQueue = (function() {
    
    class RetryQueue {
        constructor() {
            this.props = PropertiesService.getScriptProperties();
            this.QUEUE_KEY = 'calendarRetryQueue';
            this.TRIGGER_KEY = 'calendarRetryTriggerId';
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
            const queue = this._getQueue();
            
            // Use core logic to create queue item
            const queueItem = RetryQueueCore.createQueueItem(
                operation,
                () => Utilities.getUuid(),
                () => new Date().getTime()
            );
            
            queue.push(queueItem);
            this._saveQueue(queue);
            this._ensureTriggerExists();
            
            console.log(`RetryQueue: Enqueued operation ${queueItem.id} for ride ${operation.rideUrl}`);
            return queueItem.id;
        }

        /**
         * Process all due retry operations
         * Called by time-based trigger
         */
        processQueue() {
            const queue = this._getQueue();
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
                    const result = this._executeOperation(item);
                    
                    if (result.success) {
                        // Remove from queue on success
                        const newQueue = RetryQueueCore.removeItem(this._getQueue(), item.id);
                        this._saveQueue(newQueue);
                        succeeded++;
                        console.log(`RetryQueue: Operation ${item.id} succeeded on attempt ${item.attemptCount + 1}`);
                        
                        // Notify user of success
                        this._notifySuccess(item);
                    } else {
                        // Use core logic to update after failure
                        const updateResult = RetryQueueCore.updateAfterFailure(item, result.error, now);
                        
                        if (updateResult.shouldRetry) {
                            const newQueue = RetryQueueCore.updateItem(this._getQueue(), updateResult.updatedItem);
                            this._saveQueue(newQueue);
                            console.log(`RetryQueue: Operation ${item.id} failed, will retry at ${new Date(updateResult.updatedItem.nextRetryAt)}`);
                        } else {
                            // Max retries exceeded
                            const newQueue = RetryQueueCore.removeItem(this._getQueue(), item.id);
                            this._saveQueue(newQueue);
                            failed++;
                            console.error(`RetryQueue: Operation ${item.id} failed permanently after ${updateResult.updatedItem.attemptCount} attempts`);
                            this._notifyFailure(updateResult.updatedItem);
                        }
                    }
                } catch (error) {
                    console.error(`RetryQueue: Unexpected error processing item ${item.id}:`, error);
                    item.lastError = error.message;
                    const newQueue = RetryQueueCore.updateItem(this._getQueue(), item);
                    this._saveQueue(newQueue);
                }
            });
            
            const remainingQueue = this._getQueue();
            if (remainingQueue.length === 0) {
                this._removeTrigger();
            }
            
            return {
                processed: dueItems.length,
                succeeded: succeeded,
                failed: failed,
                remaining: remainingQueue.length
            };
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
         * Get current queue from PropertiesService (GAS-specific)
         * @private
         */
        _getQueue() {
            const queueJson = this.props.getProperty(this.QUEUE_KEY);
            return queueJson ? JSON.parse(queueJson) : [];
        }

        /**
         * Save queue to PropertiesService (GAS-specific)
         * @private
         */
        _saveQueue(queue) {
            this.props.setProperty(this.QUEUE_KEY, JSON.stringify(queue));
        }

        /**
         * Remove queue item by event ID (for cancellation)
         * Used when a ride is cancelled to remove pending calendar creation from retry queue
         * @param {string} eventId - Google Calendar event ID
         */
        removeByEventId(eventId) {
            const queue = this._getQueue();
            const itemToRemove = queue.find(item => item.params && item.params.eventId === eventId);
            
            if (itemToRemove) {
                const newQueue = RetryQueueCore.removeItem(queue, itemToRemove.id);
                this._saveQueue(newQueue);
                console.log(`RetryQueue: Removed item for event ${eventId}`);
            } else {
                console.log(`RetryQueue: No item found for event ${eventId}`);
            }
        }

        /**
         * Get current queue status for debugging
         */
        getStatus() {
            const queue = this._getQueue();
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
            this._saveQueue([]);
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
