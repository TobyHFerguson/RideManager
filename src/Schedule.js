if (typeof require !== 'undefined') {
    HyperlinkUtils = require('./HyperlinkUtils.js'); // Import the utility module
}

const Schedule = function () {
    function log(nm, msg) {
        // console.log(`Schedule.${nm}: ${msg}`)
    }

    class Schedule {
        constructor() {
            this.crSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Consolidated Rides');
            this.columnNames = this.crSheet.getRange(1, 1, 1, this.crSheet.getLastColumn()).getValues()[0];
            this.rows = new Set();
        }

        _getColumnRange(columnName, rowNum = 2, numCols = 0) {
            numCols = numCols || this.crSheet.getLastColumn() - 1;
            const columnIndex = this.getColumnIndex(columnName) + 1;
            return this.crSheet.getRange(rowNum, columnIndex, numCols);
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
                const range = row.range;
                const values = row.values;
                const formulas = row.formulas;
                const merged = values[0].map((v, i) => formulas[0][i] ? formulas[0][i] : v); 
                range.setValues([merged])
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
            this.myRowValues = values[offset];
            this.myRowFormulas = formulas[offset];
            this.myRowValues[this.schedule.getColumnIndex(getGlobals().ROUTECOLUMNNAME)] = this.myRowFormulas[this.schedule.getColumnIndex(getGlobals().ROUTECOLUMNNAME)];
            this.myRowValues[this.schedule.getColumnIndex(getGlobals().RIDECOLUMNNAME)] = this.myRowFormulas[this.schedule.getColumnIndex(getGlobals().RIDECOLUMNNAME)];
        }

        get StartDate() { return this.schedule.getStartDate(this.myRowValues) }
        get StartTime() { return this.schedule.getStartTime(this.myRowValues); }
        get Group() { return this.schedule.getGroup(this.myRowValues); }

        get RouteName() {
            const cellValue = this.myRowValues[this.schedule.getColumnIndex(getGlobals().ROUTECOLUMNNAME)];
            const { name } = parseHyperlinkFormula(cellValue);
            return name;
        }

        get RouteURL() {
            const cellValue = this.myRowValues[this.schedule.getColumnIndex(getGlobals().ROUTECOLUMNNAME)];
            const { url } = parseHyperlinkFormula(cellValue);
            return url;
        }

        get RideLeaders() {
            let rls = this.schedule.getRideLeader(this.myRowValues);
            return rls ? rls.split(',').map(rl => rl.trim()).filter(rl => rl) : [];
        }

        get RideName() {
            const cellValue = this.myRowValues[this.schedule.getColumnIndex(getGlobals().RIDECOLUMNNAME)];
            const { name } = parseHyperlinkFormula(cellValue);
            return name;
        }

        get RideURL() {
            const cellValue = this.myRowValues[this.schedule.getColumnIndex(getGlobals().RIDECOLUMNNAME)];
            const { url } = parseHyperlinkFormula(cellValue);
            return url;
        }
        get GoogleEventId() { return this.myRowValues[this.schedule.getColumnIndex(getGlobals().GOOGLEEVENTIDCOLUMNNAME)]; }
        set GoogleEventId(id) { this.myRowValues[this.schedule.getColumnIndex(getGlobals().GOOGLEEVENTIDCOLUMNNAME)] = id; this.schedule.saveRow(this);}
        get Location() { return this.schedule.getLocation(this.myRowValues); }
        get Address() { return this.schedule.getAddress(this.myRowValues); }

        highlightRideLeader(onoff) {
            this.schedule.highlightCell(this.rowNum, getGlobals().RIDELEADERCOLUMNNAME, onoff);
            return this;
        }

        setRideLink(name, url) {
            let formula = createHyperlinkFormula(name, url);
            this.myRowFormulas[this.schedule.getColumnIndex(getGlobals().RIDECOLUMNNAME)] = formula;
            this.myRowValues[this.schedule.getColumnIndex(getGlobals().RIDECOLUMNNAME)] = formula;
            this.schedule.saveRow(this);
        }

        deleteRideLink() {
            this.myRowFormulas[this.schedule.getColumnIndex(getGlobals().RIDECOLUMNNAME)] = '';
            this.myRowValues[this.schedule.getColumnIndex(getGlobals().RIDECOLUMNNAME)] = '';
            this.schedule.saveRow(this);
        }

        setRouteLink(name, url) {
            let formula = createHyperlinkFormula(name, url);
            this.myRowFormulas[this.schedule.getColumnIndex(getGlobals().ROUTECOLUMNNAME)] = formula;
            this.myRowValues[this.schedule.getColumnIndex(getGlobals().ROUTECOLUMNNAME)] = formula;
            // Logger.log(`Row ${this.rowNum}: Setting route link to ${name} at ${url} with formula ${formula}`);
            this.schedule.saveRow(this);
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
                    let name = `${(route.user_id !== getGlobals().SCCCC_USER_ID) ? getGlobals().FOREIGN_PREFIX + ' ': ''}` + route.name;
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