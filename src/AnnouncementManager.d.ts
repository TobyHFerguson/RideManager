/**
 * AnnouncementManager - GAS adapter for AnnouncementCore
 * 
 * Type definitions for Google Apps Script announcement operations.
 * This is a thin wrapper around AnnouncementCore that handles GAS APIs.
 */

import { AnnouncementQueueItem, AnnouncementStatistics } from './AnnouncementCore';

/**
 * Result of announcement or reminder send operation
 */
export interface SendResult {
    /** Whether the operation succeeded */
    success: boolean;
    /** Error message if success is false */
    error?: string;
}

/**
 * Result of queue processing
 */
export interface ProcessResult {
    /** Number of announcements successfully sent */
    sent: number;
    /** Number of reminders sent */
    reminded: number;
    /** Number of announcements that failed permanently */
    failed: number;
    /** Number of items remaining in queue */
    remaining: number;
}

/**
 * Row data from Consolidated Rides spreadsheet
 * Contains all column data plus metadata fields
 */
export interface RowData {
    /** Row number in spreadsheet (1-based) */
    _rowNum?: number;
    /** Ride name */
    RideName?: string;
    /** Ride date */
    Date?: Date | string;
    /** Ride start time */
    StartTime?: string;
    /** Ride end time */
    EndTime?: Date | string;
    /** Route URL */
    RouteURL?: string;
    /** Ride URL (RWGPS event) */
    RideURL?: string;
    /** Ride leaders */
    RideLeaders?: string;
    /** Group name */
    Group?: string;
    /** Location */
    Location?: string;
    /** Address */
    Address?: string;
    /** Duration */
    Duration?: string;
    /** Distance */
    Distance?: string;
    /** Elevation gain */
    ElevationGain?: string;
    /** Google Calendar event ID */
    GoogleEventId?: string;
    /** Any other columns as key-value pairs */
    [key: string]: any;
}

/**
 * AnnouncementManager class for managing ride announcements
 * Delegates business logic to AnnouncementCore
 */
declare class AnnouncementManager {
    /**
     * Create a new AnnouncementManager instance
     */
    constructor();

    /**
     * Create a ride announcement document and schedule it for sending
     * 
     * @param row - Row object from ScheduleAdapter
     * @returns URL of created announcement document
     * @throws Error if required globals are not configured
     */
    createAnnouncement(row: RowData): string;

    /**
     * Handle ride cancellation with announcement
     * 
     * @param row - Row object from ScheduleAdapter
     * @param sendEmail - Whether to send cancellation email
     * @param reason - Optional cancellation reason
     * @returns Result with announcementSent flag and optional error
     */
    handleCancellation(row: RowData, sendEmail: boolean, reason?: string): {announcementSent: boolean, error?: string};

    /**
     * Handle ride reinstatement with announcement
     * 
     * @param row - Row object from ScheduleAdapter
     * @param sendEmail - Whether to send reinstatement email
     * @param reason - Optional reinstatement reason
     * @returns Result with announcementSent flag and optional error
     */
    handleReinstatement(row: RowData, sendEmail: boolean, reason?: string): {announcementSent: boolean, error?: string};

    /**
     * Update announcement when ride is updated
     * Automatically updates document name and sendAt based on new ride data
     * If no announcement exists, creates one
     * 
     * @param row - Row object with updated ride data
     * @returns Result with success flag and optional error
     */
    updateAnnouncement(row: RowData): {success: boolean, error?: string};

    /**
     * Remove announcements by ride URLs
     * 
     * @param rideUrls - Array of ride URLs
     * @returns Number of announcements removed
     */
    removeByRideUrls(rideUrls: string[]): number;

    /**
     * Send an announcement email
     * 
     * @param item - Queue item with announcement details
     * @returns Result indicating success or failure
     */
    sendAnnouncement(item: AnnouncementQueueItem): SendResult;

    /**
     * Send a reminder notification about an upcoming announcement
     * 
     * @param item - Queue item with announcement details
     * @returns Result indicating success or failure
     */
    sendReminder(item: AnnouncementQueueItem): SendResult;

    /**
     * Process all due announcements, reminders, and retries
     * Called by time-based trigger
     * 
     * @returns Statistics about processing results
     */
    processQueue(): ProcessResult;

    /**
     * Get formatted view of scheduled announcements for UI display
     * 
     * @returns Formatted text for display in alert dialog
     */
    viewScheduled(): string;

    /**
     * Get queue statistics for monitoring
     * 
     * @returns Statistics object
     */
    getStatistics(): AnnouncementStatistics;
}

export default AnnouncementManager;
