declare class CalendarAuditCore {
    static getUpcomingScheduledRows<T extends {startDateTime?: Date | null; rideURL?: string; googleEventId?: string}>(rows: T[], now: Date): T[];

    static formatFindingsEmail(findings: Array<{
        rowNum: number;
        group: string;
        rideDate: Date | string | null;
        rideName: string;
        rideURL: string;
        googleEventId: string;
        calendarId: string;
        issues: string[];
    }>): {subject: string; body: string};

    static inspectEvent(
        row: {
            googleEventId: string;
            googleEventIdCell?: {url?: string};
            rideName: string;
            rideURL: string;
            startDateTime?: Date | null;
        },
        event: {title?: string; description?: string} | null,
        expectedCalendarUrl: string
    ): string[];
}

export default CalendarAuditCore;
