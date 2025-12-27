/**
 * AnnouncementCore - Pure JavaScript announcement logic with no GAS dependencies
 * 
 * Type definitions for announcement queue operations and template expansion.
 * All functions are exported as static methods in the AnnouncementCore module.
 * 
 * Note: Retry logic removed - failures are reported immediately to users
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
 * Queue statistics
 */
export interface AnnouncementStatistics {
    /** Total items in queue */
    total: number;
    /** Items pending send */
    pending: number;
    /** Items successfully sent */
    sent: number;
    /** Items that failed (no retries) */
    failed: number;
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
declare namespace AnnouncementCore {
    /**
     * Calculate when announcement should be sent
     * Returns 6 PM local time, 2 calendar days before ride date
     * 
     * @param rideDate - Ride date (Date object or ISO string)
     * @param timezone - IANA timezone identifier (e.g., 'America/Los_Angeles')
     * @returns Date object for send time
     */
    function calculateSendTime(rideDate: Date | string, timezone: string): Date;

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
    function createQueueItem(
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
     * Get rows due for sending
     * 
     * @param rows - Array of Row objects from spreadsheet
     * @param currentTime - Current timestamp
     * @returns Array of rows due to send (within 1 hour window)
     */
    function getDueItems(rows: any[], currentTime: number): any[];

    /**
     * Get announcement statistics from rows
     * 
     * @param rows - Array of Row objects
     * @returns Statistics object
     */
    function getStatistics(rows: any[]): AnnouncementStatistics;

    /**
     * Expand template by replacing {FieldName} placeholders with rowData values
     * Missing/null/empty fields are tracked but placeholders remain in text
     * 
     * @param template - Template text with {FieldName} placeholders
     * @param rowData - Object with field values (keys are column names)
     * @param route - Optional RWGPS route object with distance, elevation_gain, first_lat, first_lng
     * @returns Expanded text and array of missing field names
     */
    function expandTemplate(template: string, rowData: Record<string, any>, route?: any | null): TemplateExpansionResult;

    /**
     * Extract subject line from template
     * Looks for "Subject: text" at start of template
     * 
     * @param template - Template text (possibly with Subject line)
     * @returns Subject and body (body is template with subject removed)
     */
    function extractSubject(template: string): EmailContent;

    /**
     * Calculate new announcement document name based on ride name
     * Format: "RA-{RideName}"
     * 
     * @param rideName - New ride name
     * @returns New document name
     */
    function calculateAnnouncementDocName(rideName: string): string;

    /**
     * Determine what updates are needed for an announcement when ride is updated
     * Returns an object describing what needs to be updated
     * 
     * @param currentAnnouncement - Current announcement data
     * @param newRideData - New ride data
     * @param timezone - IANA timezone identifier (e.g., 'America/Los_Angeles')
     * @returns Update decision object
     */
    function calculateAnnouncementUpdates(
        currentAnnouncement: {
            documentName: string;
        },
        newRideData: {
            rideName: string;
            rideDate: Date | string;
        },
        timezone?: string
    ): {
        needsDocumentRename: boolean;
        newDocumentName: string | null;
        needsSendAtUpdate: boolean;
        calculatedSendAt: Date | null;
    };
}

export default AnnouncementCore;
