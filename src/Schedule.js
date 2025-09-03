if (typeof require !== 'undefined') {
    HyperlinkUtils = require('./HyperlinkUtils.js'); // Import the utility module
}

// @ts-check

const Schedule = function () {
    function log(nm, msg) {
        // console.log(`Schedule.${nm}: ${msg}`)
    }

    /**
     * The Schedule class provides methods to interact with and manipulate ride scheduling data
     * stored in the "Consolidated Rides" sheet of a Google Spreadsheet. It supports operations
     * such as storing/restoring formulas, highlighting cells, saving and retrieving rows, and
     * handling ride and route information.
     *
     * @class
     *
     * @property {GoogleAppsScript.Spreadsheet.Sheet} crSheet - Reference to the "Consolidated Rides" sheet.
     * @property {string[]} columnNames - Array of column names from the sheet header.
     * @property {Set<Row>} rows - Set of Row objects to be saved.
     *
     * @method _getColumnRange Gets a range object for a specified column and rows.
     * @method _getRideColumnRange Gets a range object for the ride column.
     * @method _getRouteColumnRange Gets a range object for the route column.
     * @method storeFormulas Stores ride and route formulas in document properties.
     * @method storeRouteFormulas Stores route column formulas.
     * @method storeRideFormulas Stores ride column formulas.
     * @method restoreFormula Restores ride and route formulas for a given row.
     * @method restoreRouteFormula Restores route formula for a given row.
     * @method restoreRideFormula Restores ride formula for a given row.
     * @method getYoungerRows Returns all rows scheduled after a given date.
     * @method findLastRowBeforeYesterday Finds the last row before yesterday's date.
     * @method getColumnIndex Returns the index of a column by name.
     * @method getStartDate Gets the start date from a row's values.
     * @method getStartTime Gets the start time from a row's values.
     * @method getGroup Gets the group from a row's values.
     * @method getRideLeader Gets the ride leader from a row's values.
     * @method getLocation Gets the location from a row's values.
     * @method getAddress Gets the address from a row's values.
     * @method highlightCell Highlights or unhighlights a cell in the sheet.
     * @method saveRow Adds a row to the set of rows to be saved.
     * @method getRowSet Reduces a set of rows to those with disjoint ranges.
     * @method save Saves all rows in the set to the sheet and persists formulas.
     * @method deleteRideLink Clears the ride link cell for a given row.
     * @method convertRangeToRows Converts a sheet range to an array of Row objects.
     * @method getSelectedRows Gets the selected rows from the sheet.
     * @method getLastRow Gets the last row in the sheet as a Row object.
     */
    class Schedule {
        constructor() {
            this.crSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Consolidated Rides');
            this.columnNames = this.crSheet.getRange(1, 1, 1, this.crSheet.getLastColumn()).getValues()[0];
            this.rows = new Set();
        }

        /**
         * Returns a range object for the specified column and rows in the sheet.
         *
         * @param {string} columnName - The name of the column to get the range for.
         * @param {number} [rowNum=2] - The starting row number (default is 2).
         * @param {number} [numRows=0] - The number of rows to include in the range. If 0, uses all rows from rowNum to the last row.
         * @returns {GoogleAppsScript.Spreadsheet.Range} The range object for the specified column and rows.
         */
        _getColumnRange(columnName, rowNum = 2, numRows = 0) {
            numRows = numRows || this.crSheet.getLastRow() - 1;
            const columnIndex = this.getColumnIndex(columnName) + 1;
            return this.crSheet.getRange(rowNum, columnIndex, numRows);
        }

        _getRideColumnRange(rowNum = 2, numCols = 0) {
            return this._getColumnRange(getGlobals().RIDECOLUMNNAME, rowNum, numCols);
        }

        _getRouteColumnRange(rowNum = 2, numCols = 0) {
            return this._getColumnRange(getGlobals().ROUTECOLUMNNAME, rowNum, numCols);
        }
        storeFormulas() {
            this.storeRideFormulas();
            this.storeRouteFormulas();
        }
        storeRouteFormulas() {
            const routeFormulas = this._getRouteColumnRange().getFormulas();
            // Logger.log(`Route Formulas retrieved from range: ${JSON.stringify(routeFormulas)}`);
            PropertiesService.getDocumentProperties().setProperty('routeColumnFormulas', JSON.stringify(routeFormulas));
        }
        storeRideFormulas() {
            const rideFormulas = this._getRideColumnRange().getFormulas();
            // Logger.log(`Ride Formulas retrieved from range: ${JSON.stringify(rideFormulas)}`);
            PropertiesService.getDocumentProperties().setProperty('rideColumnFormulas', JSON.stringify(rideFormulas));
        }

        restoreFormula(rowNum) {
            this.restoreRideFormula(rowNum);
            this.restoreRouteFormula(rowNum);
        }
        restoreRouteFormula(rowNum) {
            const indexNum = rowNum - 2; // -2 because the first row is the header row & the first row of data is row 2
            const routeFormula = JSON.parse(PropertiesService.getDocumentProperties().getProperty('routeColumnFormulas'))[indexNum];
            // Logger.log(`route Formula being restored to row ${rowNum}: ${JSON.stringify(routeFormula)}`);
                this._getRouteColumnRange(rowNum, 1).setFormula(routeFormula);
        }

        restoreRideFormula(rowNum) {
            const indexNum = rowNum - 2; // -2 because the first row is the header row & the first row of data is row 2
            const rideFormula = JSON.parse(PropertiesService.getDocumentProperties().getProperty('rideColumnFormulas'))[indexNum];
            Logger.log(`ride Formula being restored to row ${rowNum}: ${JSON.stringify(rideFormula)}`);
            this._getRideColumnRange(rowNum, 1).setFormula(rideFormula);
        }

        /**
         * Find and return all rows that are scheduled after the given day
         * @param {Date} date the day after which rows should be returned
         * @return {Row[]} the rows that are younger than the given date
         */
        getYoungerRows(date) {
            const i = this.findLastRowBeforeYesterday();
            const rows = this.convertRangeToRows(this.crSheet.getRange(i, 1, this.crSheet.getLastRow() - i + 1, this.crSheet.getLastColumn()));
            return rows;
        }

        findLastRowBeforeYesterday() {
            // Get the spreadsheet object
            var sheet = this.crSheet;

            // Get the data range including the header row
            var dataRange = sheet.getDataRange();
            var values = dataRange.getValues();

            // Identify the date column index (assuming the date is in the first column)
            var dateColumnIndex = this.getColumnIndex(getGlobals().STARTDATETIMECOLUMNNAME);

            // Sort the data based on the date column
            values.sort(function (row1, row2) {
                return new Date(row1[dateColumnIndex]) - new Date(row2[dateColumnIndex]);
            });

            // Get yesterday's date
            var yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            // Find the last row number before yesterday by iterating backwards
            var lastRowBeforeYesterday = values.length - 1;
            while (lastRowBeforeYesterday >= 0 && new Date(values[lastRowBeforeYesterday][dateColumnIndex]) >= yesterday) {
                lastRowBeforeYesterday--;
            }

            // Return the row number (excluding header row)
            return lastRowBeforeYesterday;
        }

        isColumn(name, columnNum) {
            return this.getColumnIndex(name) + 1 === columnNum;
        }

        getColumnIndex(name) {
            let ix = this.columnNames.indexOf(name);
            if (ix !== -1) {
                return ix;
            }
            throw new Error(`Column name: ${name} is not known`);
        }

        getStartDate(values) { return values[this.getColumnIndex(getGlobals().STARTDATETIMECOLUMNNAME)]; }
        getStartTime(values) { return values[this.getColumnIndex(getGlobals().STARTDATETIMECOLUMNNAME)]; }
        getGroup(values) { return values[this.getColumnIndex(getGlobals().GROUPCOLUMNNAME)]; }
        getRideLeader(values) { return values[this.getColumnIndex(getGlobals().RIDELEADERCOLUMNNAME)]; }
        getLocation(values) { return values[this.getColumnIndex(getGlobals().LOCATIONCOLUMNNAME)]; }
        getAddress(values) { return values[this.getColumnIndex(getGlobals().ADDRESSCOLUMNNAME)]; }

        highlightCell(rowNum, colName, onoff) {
            let cell = this.crSheet.getRange(rowNum, this.getColumnIndex(colName) + 1);
            cell.setFontColor(onoff ? "red" : null);
        }

        saveRow(row) {
            this.rows.add(row);
        }

        /**
         * Given a set of rows reduce it to those rows which have disjoint ranges
         * @param {Set(Row)} rows 
        */
        getRowSet(rows) {
            let rrs = Array.from(rows).reduce((p, row) => {
                if (!p.ranges.has(row.range)) {
                    p.ranges.add(row.range);
                    p.rows.add(row);
                }
                return p;
            },
                { ranges: new Set(), rows: new Set() }
            );
            return rrs.rows;
        }

        save() {
            this.getRowSet(this.rows).forEach(row => {
                for (let rn = row.offset; rn < row.values.length; rn++) {
                    const range = row.range.offset(rn, 0, 1);
                    const values = row.values[rn];
                    const formulas = row.formulas[rn];
                    const merged = values.map((v, i) => formulas[i] ? formulas[i] : v);
                    range.setValues([merged])
                }
            });
            this.storeFormulas(); // Ensure formulas are persisted after saving the row
            SpreadsheetApp.flush();
            this.rows = new Set();
        }

        deleteRideLink(rowNum) {
            this.crSheet.getRange(rowNum, this.getColumnIndex(getGlobals().RIDECOLUMNNAME) + 1).clear();
        }

        convertRangeToRows(range) {
            let rows = [];
            let values = range.getValues();
            let formulas = range.getFormulas();

            for (var offset = 0; offset < values.length; offset++) {
                rows.push(new Row(this, range, offset, values, formulas));
            }
            return rows;
        }

        /**
         * Get the selected rows - assumed to be in the 'Consolidated Rides' Sheet
         * @returns {[Row]} rows - an array of row objects, each one having been selected
         */
        getSelectedRows() {
            let sheet = this.crSheet;

            /**
             * Convert the given ranges (assumed to be single cell ranges) to ranges
             * that cover entire rows
             * @param {Range[]} cellRangeList List of ranges to be converted
             * @returns list of converted ranges
             */
            function convertCellRangesToRowRanges(cellRangeList) {
                const cellRanges = cellRangeList.getRanges();
                const lastColumn = `C${sheet.getMaxColumns()}`;
                const rowRangeExpression = cellRanges.map(r => `R${r.getRow()}C1:R${r.getRow() + r.getNumRows() - 1}${lastColumn}`);
                const rowRangeList = sheet.getRangeList(rowRangeExpression);
                const rowRanges = rowRangeList.getRanges();
                return rowRanges;
            }

            function getRowRanges() {
                let selection = sheet.getSelection();
                const rangeList = selection.getActiveRangeList();
                // The rangeList is a list of single celled ranges
                // We need to convert these ranges ranges that capture a whole row.
                const rowRanges = convertCellRangesToRowRanges(rangeList);
                return rowRanges;
            }

            let rows = [];
            let rr = getRowRanges();
            rr.forEach(range => {
                let rowsFromRange = this.convertRangeToRows(range);
                rows.push(...rowsFromRange);
            });
            return rows;
        }

        /**
         * Get the last row in the spreadsheet
         * @returns {Row}
         */
        getLastRow() {
            let rownum = sheet.getLastRow();
            let colnum = 1;
            let numrows = 1;
            let numcols = this.crSheet.getLastColumn();
            let range = this.crSheet.getRange(rownum, colnum, numrows, numcols);
            return this.convertRangeToRows(range)[0];
        }



    }

    class Row {
        constructor(schedule, range, offset, values, formulas) {
            this.schedule = schedule;
            this.range = range;
            this.offset = offset;
            this.rowNum = range.getRow() + offset;
            this.values = values;
            this.formulas = formulas;
            this.values[offset][this.schedule.getColumnIndex(getGlobals().ROUTECOLUMNNAME)] = this.formulas[offset][this.schedule.getColumnIndex(getGlobals().ROUTECOLUMNNAME)];
            this.values[offset][this.schedule.getColumnIndex(getGlobals().RIDECOLUMNNAME)] = this.formulas[offset][this.schedule.getColumnIndex(getGlobals().RIDECOLUMNNAME)];
        }

        get StartDate() { return this.schedule.getStartDate(this.values[this.offset]) }
        get StartTime() { return this.schedule.getStartTime(this.values[this.offset]); }
        get EndTime() {
            const duration = this.values[this.offset][this.schedule.getColumnIndex(getGlobals().DURATIONCOLUMNNAME)] || getGlobals().DEFAULTRIDEDURATION;
            const end = new Date(this.StartTime.getTime() + duration * 60 * 60 * 1000);
            return end;
        }
        get Group() { return this.schedule.getGroup(this.values[this.offset]); }

        get RouteName() {
            const cellValue = this.values[this.offset][this.schedule.getColumnIndex(getGlobals().ROUTECOLUMNNAME)];
            const { name } = parseHyperlinkFormula(cellValue);
            return name;
        }

        get RouteURL() {
            const cellValue = this.values[this.offset][this.schedule.getColumnIndex(getGlobals().ROUTECOLUMNNAME)];
            const { url } = parseHyperlinkFormula(cellValue);
            return url;
        }

        get RideLeaders() {
            let rls = this.schedule.getRideLeader(this.values[this.offset]);
            return rls ? rls.split(',').map(rl => rl.trim()).filter(rl => rl) : [];
        }

        get RideName() {
            const cellValue = this.values[this.offset][this.schedule.getColumnIndex(getGlobals().RIDECOLUMNNAME)];
            const { name } = parseHyperlinkFormula(cellValue);
            return name;
        }

        get RideURL() {
            const cellValue = this.values[this.offset][this.schedule.getColumnIndex(getGlobals().RIDECOLUMNNAME)];
            const { url } = parseHyperlinkFormula(cellValue);
            return url;
        }
        get GoogleEventId() { return this.values[this.offset][this.schedule.getColumnIndex(getGlobals().GOOGLEEVENTIDCOLUMNNAME)]; }
        set GoogleEventId(id) { this.values[this.offset][this.schedule.getColumnIndex(getGlobals().GOOGLEEVENTIDCOLUMNNAME)] = id; this.schedule.saveRow(this); }
        get Location() { return this.schedule.getLocation(this.values[this.offset]); }
        get Address() { return this.schedule.getAddress(this.values[this.offset]); }

        highlightRideLeader(onoff) {
            this.schedule.highlightCell(this.rowNum, getGlobals().RIDELEADERCOLUMNNAME, onoff);
            return this;
        }

        setRideLink(name, url) {
            let formula = createHyperlinkFormula(name, url);
            this.formulas[this.offset][this.schedule.getColumnIndex(getGlobals().RIDECOLUMNNAME)] = formula;
            this.values[this.offset][this.schedule.getColumnIndex(getGlobals().RIDECOLUMNNAME)] = formula;
            this.schedule.saveRow(this);
        }

        deleteRideLink() {
            this.formulas[this.offset][this.schedule.getColumnIndex(getGlobals().RIDECOLUMNNAME)] = '';
            this.values[this.offset][this.schedule.getColumnIndex(getGlobals().RIDECOLUMNNAME)] = '';
            this.schedule.saveRow(this);
        }

        setRouteLink(name, url) {
            let formula = createHyperlinkFormula(name, url);
            this.formulas[this.offset][this.schedule.getColumnIndex(getGlobals().ROUTECOLUMNNAME)] = formula;
            this.values[this.offset][this.schedule.getColumnIndex(getGlobals().ROUTECOLUMNNAME)] = formula;
            // Logger.log(`Row ${this.rowNum}: Setting route link to ${name} at ${url} with formula ${formula}`);
            this.schedule.saveRow(this);
        }

        /**
         * Determines if the schedule row is planned by checking if StartDate, Group, and RouteURL are set.
         * @returns {boolean} True if all required properties are present; otherwise, false.
         */
        isPlanned() {
            // console.log('row.isPlanned()', 'start date: ', this.StartDate, 'group: ', this.Group, 'route: ', this.RouteURL);
            // @ts-ignore
            return this.StartDate && this.Group && this.RouteURL;
        }

        /**
         * Determines if the ride is scheduled.
         * @returns {boolean} Returns true if the ride has a name, otherwise false.
         */
        isScheduled() {
            return this.RideName !== '';
        }

        /**
         * Resolve and link the name and the url in the Route column
         * @param {Row} row - row whose route url is to be resolved and linked
         * @returns {Row} the row
         */
        linkRouteURL() {
            // Skip the header column
            if (this.rowNum === 1) return;

            const row = this;
            function getRouteJson() {
                const error = rowCheck.badRoute(row);
                if (error) {
                    throw new Error(error);
                }
                let url = row.RouteURL;
                const response = UrlFetchApp.fetch(`${url}.json`, { muteHttpExceptions: true });
                switch (response.getResponseCode()) {
                    case 403:
                        throw new Error(`This route: ${url} is not publicly accessible`);
                    case 404:
                        throw new Error(`This route: ${url} cannot be found on the server`);
                    case 200:
                        break;
                    default:
                        throw new Error(`Unknown error retrieving data for ${url}`);
                }
                const json = JSON.parse(response.getContentText());
                return json;
            }
            let url = this.RouteURL;
            let text = this.RouteName;

            // Its possible to not have an URL but to have the text, and that text be an URL string! 
            // In that case then make the url be the text and set both parts of the RichTextValue to be that url string
            if (!url) {
                url = text;
                this.setRouteLink(text, url);
            }
            // However we got here then the url and the text are the same - the Route Name is not being displayed to
            // the user. So lets try and put in the correct route name.  if the route is foreign we'll prefix the name
            // to make that clear to the user.
            if (url === text) {
                try {
                    let route = getRouteJson();
                    let name = `${(route.user_id !== getGlobals().SCCCC_USER_ID) ? getGlobals().FOREIGN_PREFIX + ' ' : ''}` + route.name;
                    // Logger.log(`Row ${this.rowNum}: Linking ${name} to ${url}`);
                    this.setRouteLink(name, url);
                } catch (e) {
                    Logger.log(`Row ${this.rowNum}: ${e.message}`);
                }
            }
        }

        restoreRideLink() {
            const name = this.RideName;
            const url = this.RideURL;
            this.setRideLink(name, url);
        }
    }

    return new Schedule();
}()

if (typeof module !== 'undefined') {
    module.exports = Schedule;
}

// ======== TESTS ============
// getRowSet returns 2 when 3 rows are provided, two of which reference the same row. In the 
// returned set the 2 distinct rows are returned. 
function testGetRowSetWithThreeRows() {
    const r1 = { f: 'boo' };
    const r2 = { f: 'bark' };
    const row1 = { range: r1 };
    const row2 = { range: r2 };
    const row3 = { range: r1 };
    const actual = Schedule.getRowSet(new Set([row1, row2, row3]));
    if (actual.size !== 2) console.log(`Expected 2 - Actual ${actual.size}`);
    if (!actual.has(row1)) console.log(`Expected to get row1 back, but didn't`);
    if (!actual.has(row2)) console.log(`Expected to get row2 back, but didn't`)
}
// getRowSet returns 1 when only one row is provided, and the returned set contains that row
function testGetRowSetOnSingletonSet() {
    const row = { range: { fargle: 'fargle' } };
    const actual = Schedule.getRowSet(new Set([row]));
    if (actual.size !== 1) console.log(`Expected 1 - Actual ${actual.size}`);
    if (!actual.has(row)) console.log(`Expected to get the original row back, but didn't`);
}
// getRowSet returns 0 when no rows are provided
function testGetRowSetOnEmptySet() {
    const actual = Schedule.getRowSet(new Set());
    if (actual.size !== 0) console.log(`Expected 0 - Actual ${actual.size}`);
}