/**
 * Typedefs etc for objects defined elsewhere
 */
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
     * Retrieves events based on scheduled row URLs.
     * @param scheduledRowURLs An array of URLs for scheduled rows.
     */
    get_events(scheduledRowURLs: string[]): Event[];

    /**
     * Retrieves RSVP counts for events.
     * @param scheduledRowURLs An array of URLs for scheduled rows.
     * @param scheduledRowLeaders An array of leaders associated with the rows.
     */
    getRSVPCounts(scheduledRowURLs: string[], scheduledRowLeaders: string[][]): number[]; // Update 'any' with the specific return type

    /**
     * Edits events.
     * @param edits An array of edits to be applied.
     */
    edit_events(edits: { url: string; event: Event }[]): Promise<any>; // Update 'any' with the specific return type
  }
/**
 * Represents an organizer entry with an identifier and display text.
 *
 * @typedef {Object} Organizer
 *
 * @property {number} id - Unique numeric identifier for the organizer. Typically a non-negative integer.
 *   This value is used for lookups and comparisons and should remain stable for the lifetime of the organizer.
 *
 * @property {string} text - Human-readable label or name for the organizer.
 *   Intended for display in UI lists, dropdowns, and other text-based contexts.
 *
 * @example
 * // Example usage (TypeScript):
 * // const organizer: Organizer = { id: 1, text: "Conference Host" };
 *
 * @remarks
 * - Keep `text` concise (a short name or title).
 * - `id` is recommended to be immutable once assigned.
 *
 * @public
 */


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
   * @returns A new Date object with the added days.
   */
  function add(date: Date, days: number): Date;

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