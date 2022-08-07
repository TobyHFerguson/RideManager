function create_sidebar(events) {
    var html = HtmlService.createHtmlOutput().setTitle("Scheduled Events Errors and Warnings");
    if (events.length > 0) {
      html.append('<table rules="all">');
      html.append(`<thead><tr>${tableColumns("d", "Row", "Errors", "Warnings")}</tr><thead>`);
      html.append("<tbody>");
      events.forEach(event => {
        let firstRow = zip('', event.errors.slice(0, 1), event.warnings.slice(0, 1));
        let cols = firstRow.map(r => tableColumns("d", ...r));
        Logger.log(`firstRow length: ${firstRow.length} ${firstRow}`);
        html.append(`<tr><td rowspan=${Math.max(event.errors.length, event.warnings.length)}>${event.rowNum}</td>${cols}</tr>`)
        let row_contents = zip("", event.errors.slice(1), event.warnings.slice(1));
        if (row_contents.length > 0) {
          cols = row_contents.map(r => tableColumns("d", ...r));
          let html_rows = tableColumns("r", ...cols);
          html.append(html_rows);
        }
      });
      html.append("</tbody></table>");
      Logger.log(html.getContent());
    }
    SpreadsheetApp.getUi() // Or DocumentApp or SlidesApp or FormApp.
      .showSidebar(html);
  }
  
  function clear_sidebar() {
    create_sidebar([]);
  }