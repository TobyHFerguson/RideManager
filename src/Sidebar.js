const sidebar = {
  create: function (rows) {
    // No rows - close sidebar
    if (!rows || !rows.length) return this.close();

    // Rows - if no errors, close sidebar
    const problemRows = rows.filter(r => (r.errors && r.errors.length) || (r.warnings && r.warnings.length));
    if (!problemRows.length) return this.close();

    // Now we have some rows to display in the sidebar.
    const html = HtmlService.createHtmlOutput().setTitle("Scheduled Events Errors and Warnings");
    html.append('<table rules="all">');
    html.append(`<thead><tr>${tableColumns("d", "Row", "Errors", "Warnings")}</tr><thead>`);
    html.append("<tbody>");
    problemRows.forEach(event => {
      let firstRow = zip('', event.errors.slice(0, 1), event.warnings.slice(0, 1));
      let cols = firstRow.map(r => tableColumns("d", ...r));
      html.append(`<tr><td rowspan=${Math.max(event.errors.length, event.warnings.length)}>${event.rowNum}</td>${cols}</tr>`)
      let row_contents = zip("", event.errors.slice(1), event.warnings.slice(1));
      if (row_contents.length > 0) {
        cols = row_contents.map(r => tableColumns("d", ...r));
        let html_rows = tableColumns("r", ...cols);
        html.append(html_rows);
      }
    });
    html.append("</tbody></table>");
    SpreadsheetApp.getUi() // Or DocumentApp or SlidesApp or FormApp.
      .showSidebar(html);
  },
  close: function () {
    SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutput("<script>google.script.host.close();</script>"));
  }
}



