/**
 * AnnouncementCore - Pure JavaScript announcement logic with no GAS dependencies
 * 
 * Type definitions for announcement queue operations, template expansion, and retry logic.
 * All functions are exported as static methods in the AnnouncementCore module.
 */

/**
 * Queue item representing a scheduled announcement
 */
export interface AnnouncementQueueItem {
    /** Unique identifier for this queue item */
    id: string;
    /** RWGPS ride URL */
    rideURL: string;
    /** Google Doc ID containing the announcement */
    documentId: string;
    /** Timestamp when announcement should be sent */
    sendTime: number;
    /** Email address of ride scheduler group */
    rsEmail: string;
    /** Row number in spreadsheet */
    rowNum: number | null;
    /** Ride name for display */
    rideName: string;
    /** Status: 'pending' | 'sent' | 'failed' */
    status: string;
    /** Timestamp when item was created */
    createdAt: number;
    /** Number of send attempts made */
    attemptCount: number;
    /** Last error message (null if no failure yet) */
    lastError: string | null;
    /** Whether 24-hour reminder has been sent */
    reminderSent: boolean;
    /** Next retry time (only present if retrying) */
    nextRetry?: number;
}

/**
 * Result of template expansion
 */
export interface TemplateExpansionResult {
    /** Template text with fields replaced */
    expandedText: string;
    /** Array of field names that were missing/null/empty */
    missingFields: string[];
}

/**
 * Email content extracted from template
 */
export interface EmailContent {
    /** Email subject line (from "Subject: text" in template) */
    subject: string;
    /** Email body (rest of template after subject line) */
    body: string;
}

/**
 * Items due for processing
 */
export interface DueItems {
    /** Items due to be sent (within 1 hour of sendTime) */
    dueToSend: AnnouncementQueueItem[];
    /** Items due for 24-hour reminder (24 hours ±1 hour before sendTime) */
    dueForReminder: AnnouncementQueueItem[];
}

/**
 * Queue statistics
 */
export interface AnnouncementStatistics {
    /** Total items in queue */
    total: number;
    /** Items pending send */
    pending: number;
    /** Items successfully sent */
    sent: number;
    /** Items that failed and are retrying */
    retrying: number;
    /** Items abandoned after 24 hours */
    abandoned: number;
}

/**
 * Formatted queue item for display
 */
export interface FormattedAnnouncementItem {
    /** Formatted text for UI display */
    text: string;
    /** Document ID (for generating links) */
    documentId: string;
}

/**
 * AnnouncementCore module containing all pure JavaScript business logic
 */
declare class AnnouncementCore {
    /**
     * Calculate when announcement should be sent
     * Returns 6 PM local time, 2 calendar days before ride date
     * 
     * @param rideDate - Ride date (Date object or ISO string)
     * @param timezone - IANA timezone identifier (e.g., 'America/Los_Angeles')
     * @returns Date object for send time
     */
    static calculateSendTime(rideDate: Date | string, timezone: string): Date;

    /**
     * Create a new announcement queue item
     * 
     * @param rideURL - RWGPS ride URL
     * @param documentId - Google Doc ID
     * @param sendTime - When to send (Date or timestamp)
     * @param rsEmail - Ride scheduler group email
     * @param rowNum - Spreadsheet row number
     * @param rideName - Ride name for display
     * @param generateId - Function to generate unique ID
     * @param getCurrentTime - Function to get current timestamp
     * @returns New queue item
     */
    static createQueueItem(
        rideURL: string,
        documentId: string,
        sendTime: Date | number,
        rsEmail: string,
        rowNum: number | null,
        rideName: string,
        generateId: () => string,
        getCurrentTime: () => number
    ): AnnouncementQueueItem;

    /**
     * Calculate next retry time using exponential backoff
     * Intervals: 5min, 15min, 30min, 1hr, 2hr, 4hr, 8hr
     * Max retry window: 24 hours from scheduled send time
     * 
     * @param attemptCount - Number of failed attempts
     * @param sendTime - Scheduled send time timestamp
     * @param lastAttemptTime - Last attempt time timestamp
     * @returns Next retry time in ms, or null if should stop retrying
     */
    static calculateNextRetry(attemptCount: number, sendTime: number, lastAttemptTime: number): number | null;

    /**
     * Get rows due for sending or reminder
     * 
     * @param rows - Array of Row objects from spreadsheet
     * @param currentTime - Current timestamp
     * @returns Rows due to send and rows due for reminder
     */
    static getDueItems(rows: any[], currentTime: number): { dueToSend: any[], dueForReminder: any[] };

    /**
     * Calculate updated values after send failure
     * Returns object with status, attempts, and lastError to update on the row
     * 
     * @param attempts - Current attempt count
     * @param sendTime - Scheduled send time
     * @param error - Error message
     * @param currentTime - Current timestamp
     * @returns Object with status, attempts, lastError fields
     */
    static calculateFailureUpdate(attempts: number, sendTime: number, error: string, currentTime: number): {
        status: string;
        attempts: number;
        lastError: string;
    };

    /**
     * Get announcement statistics from rows
     * 
     * @param rows - Array of Row objects
     * @returns Statistics object
     */
    static getStatistics(rows: any[]): AnnouncementStatistics;

    /**
     * Expand template by replacing {FieldName} placeholders with rowData values
     * Missing/null/empty fields are tracked but placeholders remain in text
     * 
     * @param template - Template text with {FieldName} placeholders
     * @param rowData - Object with field values (keys are column names)
     * @returns Expanded text and array of missing field names
     */
    static expandTemplate(template: string, rowData: Record<string, any>): TemplateExpansionResult;

    /**
     * Extract subject line from template
     * Looks for "Subject: text" at start of template
     * 
     * @param template - Template text (possibly with Subject line)
     * @returns Subject and body (body is template with subject removed)
     */
    static extractSubject(template: string): EmailContent;
}

export default AnnouncementCore;
