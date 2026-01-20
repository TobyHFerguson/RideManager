/**
 * Typedefs etc for objects defined elsewhere
 */

// Import types from RWGPSEvent module for re-export
import type {
    RWGPSEventSummary,
    RWGPSEvent,
    RWGPSEventInput,
    RWGPSEventPayload,
    RWGPSEventResult,
    RWGPSOrganizer,
    RWGPSRoute
} from './rwgpslib/RWGPSEvent';

// Re-export the imported types (augments what's available from this module)
export type {
    RWGPSEventSummary,
    RWGPSEvent,
    RWGPSEventInput,
    RWGPSEventPayload,
    RWGPSEventResult,
    RWGPSOrganizer,
    RWGPSRoute
};

/*----------------------- RWGPSLIB -----------------------*/
/**
   * Library for RWGPS services.
   */
  declare namespace RWGPSLib {
    function newRWGPSService(username: string, password: string, globals: any): RWGPSService;
    function newRWGPS(service: RWGPSService): RWGPS;
  }

/*----------------------- RWGPS -----------------------*/
/**
   * Provides methods for interacting with RWGPS data.
   */
  interface RWGPS {
    /**
     * Retrieves a single event from RWGPS.
     * @param eventUrl The URL of the event to retrieve.
     * @returns {RWGPSEvent} The RWGPS event object.
     */
    get_event(eventUrl: string): RWGPSEvent;

    /**
     * Retrieves multiple events based on scheduled row URLs.
     * @param scheduledRowURLs An array of URLs for scheduled rows.
     * @returns Array of RWGPS event objects.
     */
    get_events(scheduledRowURLs: string[]): RWGPSEvent[];

    /**
     * Edits a single event on RWGPS.
     * @param eventUrl The URL of the event to edit.
     * @param event The event input object with updated data.
     */
    edit_event(eventUrl: string, event: RWGPSEventInput): void;

    /**
     * Edits multiple events on RWGPS.
     * @param edits An array of edits to be applied.
     */
    edit_events(edits: { url: string; event: RWGPSEventInput }[]): Promise<any>;

    /**
     * Retrieves RSVP counts for events.
     * @param scheduledRowURLs An array of URLs for scheduled rows.
     * @param scheduledRowLeaders An array of leaders associated with the rows.
     * @returns Array of RSVP counts.
     */
    getRSVPCounts(scheduledRowURLs: string[], scheduledRowLeaders: string[][]): number[];

    /**
     * Imports a route to the club's RWGPS account.
     * @param route Route object with url, expiry, tags, and optional name.
     * @returns The URL of the imported route.
     */
    importRoute(route: { url: string; expiry: string; tags: string[]; name?: string }): string;

    /**
     * Copies a template event to create a new event.
     * @param templateUrl The URL of the template event.
     * @returns The URL of the newly created event.
     */
    copy_template_(templateUrl: string): string;

    /**
     * Gets organizer objects for the given ride leader names.
     * @param rideLeaders Array of ride leader names or comma-separated string.
     * @returns Array of Organizer objects with id and text properties.
     */
    getOrganizers(rideLeaders: string[] | string): Organizer[];

    /**
     * Sets the expiration date for a route.
     * @param routeUrl The URL of the route.
     * @param expiryDate The expiration date.
     * @param forceUpdate Whether to force the update.
     */
    setRouteExpiration(routeUrl: string, expiryDate: Date, forceUpdate: boolean): void;

    /**
     * Removes tags from events.
     * @param eventUrls Array of event URLs.
     * @param tags Array of tag names to remove.
     */
    unTagEvents(eventUrls: string[], tags: string[]): void;

    /**
     * Batch deletes multiple events from RWGPS.
     * @param eventUrls Array of event URLs to delete.
     */
    batch_delete_events(eventUrls: string[]): void;
  }

/**
 * Represents an organizer entry with an identifier and display text.
 * 
 * @remarks
 * - Keep `text` concise (a short name or title).
 * - `id` is recommended to be immutable once assigned.
 * 
 * @example
 * // const organizer: Organizer = { id: 302732, text: "Toby Ferguson" };
 */
interface Organizer {
  /** Unique numeric identifier for the organizer */
  id: number;
  
  /** Human-readable label or name for the organizer */
  text: string;
}


/*---------------------- dates --------------------------*/
/**
 * Declares the 'dates' global namespace.
 * This is the standard TypeScript way to define an external library.
 */
declare namespace dates {
  /**
   * Adds a specified number of days to a given date.
   * @param date The starting date.
   * @param days The number of days to add.
   * @returns A new Date object with the added days, or NaN if invalid.
   */
  function add(date: Date | string | number, days: number): Date | typeof NaN;

  /**
   * Formats a given Date object into a 'MM/DD' string.
   * @param date The date object to format.
   * @returns A string in the format "MM/DD".
   */
  function MMDD(date: Date): string;

  /**
   * Formats a given Date object into a 'MM/DD/YYYY' string.
   * @param date The date object to format.
   * @returns A string in the format "MM/DD/YYYY".
   */
  function MMDDYYYY(date: Date): string;

  /**
   * Returns the full weekday name (e.g., 'Monday') from a given Date object.
   * @param date The date object.
   * @returns The full weekday name as a string.
   */
  function weekday(date: Date): string;

  /**
   * Formats the time portion of a Date object into a 12-hour string (e.g., '1:00 PM').
   * @param date The date object.
   * @returns A string in the format "h:mm A".
   */
  function T12(date: Date): string;

  /**
   * Formats the time portion of a Date object into a 24-hour string (e.g., '13:00').
   * @param date The date object.
   * @returns A string in the format "HH:mm".
   */
  function T24(date: Date): string;
}

// Export types for use in other modules
// Note: RWGPSEvent and related types are imported and re-exported at the top of the file
export { RWGPS, Organizer, dates };