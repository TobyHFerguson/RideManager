// @ts-check
declare const Schedule: ScheduleInstance;

interface ScheduleInstance {
    crSheet: GoogleAppsScript.Spreadsheet.Sheet;
    columnNames: string[];
    rows: Set<Row>;

    constructor();

    _getColumnRange(columnName: string, rowNum?: number, numRows?: number): GoogleAppsScript.Spreadsheet.Range;
    _getRideColumnRange(rowNum?: number, numCols?: number): GoogleAppsScript.Spreadsheet.Range;
    _getRouteColumnRange(rowNum?: number, numCols?: number): GoogleAppsScript.Spreadsheet.Range;
    storeFormulas(): void;
    storeRouteFormulas(): void;
    storeRideFormulas(): void;
    restoreFormula(rowNum: number): void;
    restoreRouteFormula(rowNum: number): void;
    restoreRideFormula(rowNum: number): void;
    getYoungerRows(date: Date): Row[];
    findLastRowBeforeYesterday(): number;
    getColumnIndex(name: string): number;
    getStartDate(values: any[]): Date;
    getStartTime(values: any[]): Date;
    getGroup(values: any[]): string;
    getRideLeader(values: any[]): string;
    getLocation(values: any[]): string;
    getAddress(values: any[]): string;
    highlightCell(rowNum: number, colName: string, onoff: boolean): void;
    saveRow(row: Row): void;
    getRowSet(rows: Set<Row>): Set<Row>;
    save(): void;
    deleteRideLink(rowNum: number): void;
    convertRangeToRows(range: GoogleAppsScript.Spreadsheet.Range): Row[];
    getSelectedRows(): Row[];
    getLastRow(): Row;
}

declare class Row {
    schedule: Schedule;
    range: GoogleAppsScript.Spreadsheet.Range;
    offset: number;
    values: any[];
    formulas: any[];
    rowNum: number;

    constructor(schedule: Schedule, range: GoogleAppsScript.Spreadsheet.Range, offset: number, values: any[], formulas: any[]);

    get StartDate(): Date;
    get StartTime(): Date;
    get EndTime(): Date;
    get Group(): string;
    get RouteName(): string;
    get RouteURL(): string;
    get RideLeaders(): string[];
    get RideName(): string;
    get RideURL(): string;
    get GoogleEventId(): string;
    set GoogleEventId(id: string);
    get Location(): string;
    get Address(): string;

    highlightRideLeader(onoff: boolean): Row;
    setRideLink(name: string, url: string): void;
    deleteRideLink(): void;
    setRouteLink(name: string, url: string): void;
    linkRouteURL(): Row;
    restoreRideLink(): void;
}