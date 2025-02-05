const sidebar = {
  create: function (rows) {
    // No rows - close sidebar
    if (!rows || !rows.length)  return this.close();
      
     // Rows - if no errors, close sidebar
    const problemRows = rows.filter(r => (r.errors && r.errors.length));
    if (!problemRows.length) return this.close();

    // Now we have some rows to display in the sidebar.
    const html = HtmlService.createHtmlOutput().setTitle("Errors were found");
    html.append('<table rules="all">');
    html.append(`<thead><tr>${tableColumns("d", "Row", "Errors")}</tr><thead>`);
    html.append("<tbody>");
    problemRows.forEach(event => {
      let firstRow = event.errors.slice(0, 1);
      let cols = firstRow.map(r => tableColumns("d", ...r));
      html.append(`<tr><td rowspan=${Math.max(event.errors.length)}>${event.rowNum}</td>${cols}</tr>`)
      let row_contents = event.errors.slice(1);
      if (row_contents.length > 0) {
        cols = row_contents.map(r => tableColumns("d", ...r));
        let html_rows = tableColumns("r", ...cols);
        html.append(html_rows);
      }
    });
    html.append("</tbody></table>");
    SpreadsheetApp.getUi() // Or DocumentApp or SlidesApp or FormApp.
      .showSidebar(html);
    this.sidebarOpen = true;
  },
  close: function () {
    if (this.isOpen()) {
      SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutput("<script>google.script.host.close();</script>"));
      this.sidebarOpen = false;
    }
  },
  isOpen: function () {
    return !!this.sidebarOpen;
  }

}




