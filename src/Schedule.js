if (typeof require !== 'undefined') {
    Globals = require('./Globals.js');
    HyperlinkUtils = require('./HyperlinkUtils.js'); // Import the utility module
}

const Schedule = function () {
    function log(nm, msg) {
        // console.log(`Schedule.${nm}: ${msg}`)
    }

    class Schedule {
        constructor() {
            this.activeSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Consolidated Rides');
            this.columnNames = this.activeSheet.getRange(1, 1, 1, this.activeSheet.getLastColumn()).getValues()[0];
            this.rows = new Set();
        }

        _getRideColumnRange() {
            const rideColumnIndex = this.getColumnIndex(Globals.RIDECOLUMNNAME) + 1;
            return this.activeSheet.getRange(2, rideColumnIndex, this.activeSheet.getLastRow() - 1)
        }
        storeOriginalFormulas() {
            const formulas = this._getRideColumnRange().getFormulas();
            // Logger.log(`Formulas retrieved from range: ${JSON.stringify(formulas)}`);
            PropertiesService.getDocumentProperties().setProperty('rideColumnFormulas', JSON.stringify(formulas));
        }

        restoreOriginalFormula() {
            const formulas = JSON.parse(PropertiesService.getDocumentProperties().getProperty('rideColumnFormulas'));
            // Logger.log(`Formulas being restored: ${JSON.stringify(formulas)}`);
            this._getRideColumnRange().setFormulas(formulas);
        }
        /**
         * Find and return all rows that are scheduled after the given day
         * @param {Date} date the day after which rows should be returned
         * @return {Row[]} the rows that are younger than the given date
         */
        getYoungerRows(date) {
            const i = this.findLastRowBeforeYesterday();
            const rows = this.convertRangeToRows(this.activeSheet.getRange(i, 1, this.activeSheet.getLastRow() - i + 1, this.activeSheet.getLastColumn()));
            return rows;
        }

        findLastRowBeforeYesterday() {
            // Get the spreadsheet object
            var sheet = this.activeSheet;

            // Get the data range including the header row
            var dataRange = sheet.getDataRange();
            var values = dataRange.getValues();

            // Identify the date column index (assuming the date is in the first column)
            var dateColumnIndex = this.getColumnIndex(Globals.STARTDATETIMECOLUMNNAME);

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

        getStartDate(values) { return values[this.getColumnIndex(Globals.STARTDATETIMECOLUMNNAME)]; }
        getStartTime(values) { return values[this.getColumnIndex(Globals.STARTDATETIMECOLUMNNAME)]; }
        getGroup(values) { return values[this.getColumnIndex(Globals.GROUPCOLUMNNAME)]; }
        getRideLeader(values) { return values[this.getColumnIndex(Globals.RIDELEADERCOLUMNNAME)]; }
        getLocation(values) { return values[this.getColumnIndex(Globals.LOCATIONCOLUMNNAME)]; }
        getAddress(values) { return values[this.getColumnIndex(Globals.ADDRESSCOLUMNNAME)]; }

        highlightCell(rowNum, colName, onoff) {
            let cell = this.activeSheet.getRange(rowNum, this.getColumnIndex(colName) + 1);
            cell.setFontColor(onoff ? "red" : null);
        }

        saveRow(row) {
            this.rows.add(row);
            this.save();
            this.storeOriginalFormulas(); // Ensure formulas are persisted after saving the row
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
                console.log(`Saving row: ${row.rowNum} with values: ${values}`);
                range.setValues(values);
            });
            SpreadsheetApp.flush();

            this.rows = new Set();
        }

        deleteRideLink(rowNum) {
            this.activeSheet.getRange(rowNum, this.getColumnIndex(Globals.RIDECOLUMNNAME) + 1).clear({ contentsOnly: true });
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
            let activeSheet = this.activeSheet;

            /**
             * Convert the given ranges (assumed to be single cell ranges) to ranges
             * that cover entire rows
             * @param {Range[]} cellRangeList List of ranges to be converted
             * @returns list of converted ranges
             */
            function convertCellRangesToRowRanges(cellRangeList) {
                const cellRanges = cellRangeList.getRanges();
                const lastColumn = `C${activeSheet.getMaxColumns()}`;
                const rowRangeExpression = cellRanges.map(r => `R${r.getRow()}C1:R${r.getRow() + r.getNumRows() - 1}${lastColumn}`);
                const rowRangeList = activeSheet.getRangeList(rowRangeExpression);
                const rowRanges = rowRangeList.getRanges();
                return rowRanges;
            }

            function getRowRanges() {
                let selection = activeSheet.getSelection();
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
            var ss = SpreadsheetApp.getActiveSpreadsheet();
            var sheet = ss.getSheetByName('Consolidated Rides');
            let rownum = sheet.getLastRow();
            let colnum = 1;
            let numrows = 1;
            let numcols = sheet.getLastColumn();
            let range = sheet.getRange(rownum, colnum, numrows, numcols);
            return this.convertRangeToRows(range)[0];
        }

        onEdit(e) {
            
            /**
            * Checks if a given range contains a specific column index.
            * @param {Range} range The range to check.
            * @param {number} columnIndex The column index (1-based) to check for.
            * @return {boolean} True if the range contains the column, false otherwise.
            */
            function rangeContainsColumn(range, columnIndex) {
                const startColumn = range.getColumn();
                const endColumn = range.getLastColumn();

                return columnIndex >= startColumn && columnIndex <= endColumn;
            }
            const editedRange = e.range;
            const editedColumn = editedRange.getColumn();
            const rideColumnIndex = this.getColumnIndex(Globals.RIDECOLUMNNAME) + 1;
            const routeColumnIndex = this.getColumnIndex(Globals.ROUTECOLUMNNAME) + 1;

            // Logger.log(`onEdit triggered: editedColumn=${editedColumn}, rideColumnIndex=${rideColumnIndex}, routeColumnIndex=${routeColumnIndex}`);

            if (rangeContainsColumn(editedRange, rideColumnIndex)) {    
                const rowNum = editedRange.getRow();
                SpreadsheetApp.getUi().alert('The Ride cell must not be modified. It will be reverted to its previous value.');
                this.restoreOriginalFormula(rowNum);
            } else if (editedColumn === routeColumnIndex) {
                // Logger.log(`Editing route column for event: ${JSON.stringify(e)}`);
                this._editRouteColumn(e);
            }
        }

        _editRouteColumn(event) {
            // The value could be an rtv.
            // if the url & text are defined and equal then this rtv has been auto-linked and we need to look up the url
            // if the url & text are defined and unequal then linking has occurred. Return false
            // if the text is defined it contains an url (that's why we have an RTV!). Return it.
            // otherwise return whatever the url has

            function _rtvNeedingFetch(rtv) {
                console.log(`rtv.getLinkUrl(): ${rtv.getLinkUrl()}, rtv.getText(): ${rtv.getText()}`)
                if (!rtv) return false;
                let result;
                const url = rtv.getLinkUrl();
                const text = rtv.getText();
                result = (url && text) ? ((url == text) ? url : false) : text ? text : url

                console.log(`result: ${result}`)
                return result
            }
            let url = event.value || _rtvNeedingFetch(event.range.getRichTextValue())
            if (url) {
                const options = {
                    headers: {
                        Accept: "application/json" // Return json, not html
                    },
                }
                try {
                    const response = UrlFetchApp.fetch(url, options)
                    const route = JSON.parse(response.getContentText());
                    const name = `${(route.user_id !== Globals.SCCCC_USER_ID) ? Globals.FOREIGN_PREFIX : ''}` + route.name;
                    event.range.setValue(`=hyperlink("${url}", "${name}")`)
                } catch (e) {
                    console.log(`onEdit._editRouteColumn() - fetching ${url} got exception: ${e}`)
                }
            }
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
            this.myRowValues[this.schedule.getColumnIndex(Globals.ROUTECOLUMNNAME)] = this.myRowFormulas[this.schedule.getColumnIndex(Globals.ROUTECOLUMNNAME)];
            this.myRowValues[this.schedule.getColumnIndex(Globals.RIDECOLUMNNAME)] = this.myRowFormulas[this.schedule.getColumnIndex(Globals.RIDECOLUMNNAME)];
        }

        get StartDate() { return this.schedule.getStartDate(this.myRowValues); }
        get StartTime() { return this.schedule.getStartTime(this.myRowValues); }
        get Group() { return this.schedule.getGroup(this.myRowValues); }

        get RouteName() {
            const cellValue = this.myRowValues[this.schedule.getColumnIndex(Globals.ROUTECOLUMNNAME)];
            const { name } = parseHyperlinkFormula(cellValue);
            return name;
        }

        get RouteURL() {
            const cellValue = this.myRowValues[this.schedule.getColumnIndex(Globals.ROUTECOLUMNNAME)];
            const { url } = parseHyperlinkFormula(cellValue);
            return url;
        }

        get RideLeaders() {
            let rls = this.schedule.getRideLeader(this.myRowValues);
            return rls ? rls.split(',').map(rl => rl.trim()).filter(rl => rl) : [];
        }

        get RideName() {
            const cellValue = this.myRowValues[this.schedule.getColumnIndex(Globals.RIDECOLUMNNAME)];
            const { name } = parseHyperlinkFormula(cellValue);
            return name;
        }

        get RideURL() {
            const cellValue = this.myRowValues[this.schedule.getColumnIndex(Globals.RIDECOLUMNNAME)];
            const { url } = parseHyperlinkFormula(cellValue);
            return url;
        }

        get Location() { return this.schedule.getLocation(this.myRowValues); }
        get Address() { return this.schedule.getAddress(this.myRowValues); }

        highlightRideLeader(onoff) {
            this.schedule.highlightCell(this.rowNum, Globals.RIDELEADERCOLUMNNAME, onoff);
            return this;
        }

        setRideLink(name, url) {
            let formula = createHyperlinkFormula(name, url);
            this.myRowFormulas[this.schedule.getColumnIndex(Globals.RIDECOLUMNNAME)] = formula;
            this.myRowValues[this.schedule.getColumnIndex(Globals.RIDECOLUMNNAME)] = formula;
            this.schedule.saveRow(this);
        }

        deleteRideLink() {
            this.schedule.deleteRideLink(this.rowNum);
        }

        setRouteLink(name, url) {
            let formula = createHyperlinkFormula(name, url);
            this.myRowFormulas[this.schedule.getColumnIndex(Globals.ROUTECOLUMNNAME)] = formula;
            this.myRowValues[this.schedule.getColumnIndex(Globals.ROUTECOLUMNNAME)] = formula;
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
                    let name = `${(route.user_id !== Globals.SCCCC_USER_ID) ? Globals.FOREIGN_PREFIX : ''}` + route.name;
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