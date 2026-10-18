// @ts-check

var CalendarAuditCore = (function() {

class CalendarAuditCore {
    /**
    * @param {Array<{startDateTime?: Date|null, rideName?: string, rideURL?: string, googleEventId?: string}>} rows
     * @param {Date} now
    * @returns {Array<{startDateTime?: Date|null, rideName?: string, rideURL?: string, googleEventId?: string}>}
     */
    static getUpcomingScheduledRows(rows, now) {
        if (!Array.isArray(rows)) {
            throw new Error('Rows must be an array');
        }

        const today = new Date(now);
        if (Number.isNaN(today.getTime())) {
            throw new Error('Current date is invalid');
        }
        today.setHours(0, 0, 0, 0);

        return rows.filter((row) => {
            if (!row || !String(row.rideName || '').trim()) {
                return false;
            }

            if (!row.startDateTime) {
                return true;
            }

            const startDate = new Date(row.startDateTime);
            return Number.isNaN(startDate.getTime()) || startDate >= today;
        });
    }

    /**
     * True when the date is valid and falls before the start of today.
     * @param {Date|string|null|undefined} date
     * @param {Date} now
     * @returns {boolean}
     */
    static isBeforeToday(date, now) {
        if (!date) {
            return false;
        }
        const value = new Date(date);
        if (Number.isNaN(value.getTime())) {
            return false;
        }
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        return value < today;
    }

    /**
     * @param {Array<{rowNum: number, group: string, rideDate: Date|string|null, rideName: string, rideURL: string, calendarUrl?: string, issues: string[]}>} findings
     * @returns {{subject: string, body: string}}
     */
    static formatFindingsEmail(findings) {
        if (!Array.isArray(findings)) {
            throw new Error('Calendar audit findings must be an array');
        }

        const subject = `ACTION REQUIRED - Error detected: ${findings.length} upcoming Google Calendar issue(s)`;
        const entries = findings.map((finding, index) => {
            const rideDate = finding.rideDate ? new Date(finding.rideDate) : null;
            const rideDateText = rideDate && !Number.isNaN(rideDate.getTime())
                ? rideDate.toLocaleString()
                : '(missing or invalid spreadsheet date)';
            return [
            `${index + 1}. Row: ${finding.rowNum}`,
            `Group: ${finding.group || '(unknown)'}`,
            `Ride date: ${rideDateText}`,
            `Ride: ${finding.rideName || '(unnamed)'}`,
            `Issues: ${finding.issues.join(', ')}`,
            `Calendar link: ${finding.calendarUrl || '(missing)'}`,
            `Ride URL: ${finding.rideURL || '(missing)'}`
            ].join('\n');
        });
        const body = [
            'The daily audit detected one or more problems with upcoming scheduled rides in Google Calendar.',
            'Please review the listed rows and correct or reschedule the affected rides. The audit will run again tomorrow.',
            '',
            entries.join('\n\n')
        ].join('\n');

        return { subject, body };
    }

    /**
    * @param {{googleEventId: string, googleEventIdCell?: {url?: string}, rideName: string, rideURL: string, startDateTime?: Date|null}} row
     * @param {{title?: string, description?: string}|null} event
     * @param {string} expectedCalendarUrl
     * @returns {string[]}
     */
    static inspectEvent(row, event, expectedCalendarUrl) {
        const issues = [];

        if (!row.startDateTime || Number.isNaN(new Date(row.startDateTime).getTime())) {
            return ['No audit performed: spreadsheet date is missing; insert a date.'];
        }

        if (!row.googleEventId) {
            issues.push('missing_event_id');
            return issues;
        }
        if (!event) {
            issues.push('event_not_found');
            return issues;
        }

        const title = typeof event.title === 'string' ? event.title.replace(/\s+/g, ' ').trim() : '';
        const description = typeof event.description === 'string' ? event.description.trim() : '';
        const rideName = typeof row.rideName === 'string' ? row.rideName.replace(/\s+/g, ' ').trim() : '';
        const rideURL = typeof row.rideURL === 'string' ? row.rideURL.replace(/\s/g, '') : '';

        if (!title) {
            issues.push('blank_title');
        } else if (rideName && title !== rideName) {
            issues.push('title_mismatch');
        }

        if (!description) {
            issues.push('blank_description');
        } else if (rideURL && !description.replace(/\s/g, '').includes(rideURL)) {
            issues.push('description_missing_ride_url');
        }

        if (expectedCalendarUrl &&
            (row.googleEventIdCell?.url || '').replace(/\s/g, '') !== expectedCalendarUrl.replace(/\s/g, '')) {
            issues.push('malformed_event_url');
        }

        return issues;
    }
}

return CalendarAuditCore;
})();

/* istanbul ignore next */
if (typeof module !== 'undefined') {
    module.exports = CalendarAuditCore;
}
