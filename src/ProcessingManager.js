class ProcessingManager {
  constructor(processFunction) {
    this.props = PropertiesService.getScriptProperties();
    this.processFunction = processFunction;
    this.clearErrors();
    this.clearProgress();
    this.addProgress('Starting processing...');
    ProcessingManager.showModalDialog();
    this.startProcessing();
  }

  static showModalDialog() {
    const html = HtmlService.createHtmlOutputFromFile('Sidebar')
      .setWidth(300)
      .setHeight(200)
    SpreadsheetApp.getUi().showModalDialog(html, 'Processing Progress');
  }


  addProgress(message) {
    let messages = this.getProgress();
    messages.push(message);
    this.props.setProperty('messages', JSON.stringify(messages));
  }

  getProgress() {
    return JSON.parse(this.props.getProperty('messages') || '[]');
  }

  clearProgress() {
    this.props.deleteProperty('messages');
  }

  addError(message) {
    let errors = this.getErrors();
    errors.push(message);
    this.props.setProperty('errors', JSON.stringify(errors));
  }

  getErrors() {
    return JSON.parse(this.props.getProperty('errors') || '[]');
  }

  clearErrors() {
    this.props.deleteProperty('errors');
  }

  endProcessing() {
    this.addProgress('Processing complete!');
  }

  startProcessing() {
    try {
      this.processFunction(this); // Call the provided function
    } catch (error) {
      this.addError(`Unexpected error: ${error.message}`);
    }
    this.finalizeProcessing();
  }

  finalizeProcessing() {
    this.addProgress(this.getErrors().length === 0 ? 'Processing complete! Closing...' : 'Processing complete with errors.');
  }

  acknowledgeErrors() {
    this.clearErrors();
    // Replace the sidebar with an empty HTML output that calls google.script.host.close()
    const emptyHtml = HtmlService.createHtmlOutput('<script>google.script.host.close();</script>');
    SpreadsheetApp.getUi().showSidebar(emptyHtml); // This "closes" the sidebar
  }
}

// Entry point: Start process with a custom function
function startProcessWithErrors() {
  new ProcessingManager((manager) => exampleProcess(manager, [5, 8]));
}
function startProcessWithoutErrors() {
  new ProcessingManager((manager) => exampleProcess(manager, []));
}

// Example processing function (simulated)
function exampleProcess(manager, errorSteps) {
  for (let i = 1; i <= 10; i++) {
    Utilities.sleep(500); // Simulated work
    manager.addProgress(`Processing: ${i * 10}%`);

    if (errorSteps.includes(i)) {
      manager.addError(`Error at step ${i}`);
    }
  }
}

// Sidebar UI-related functions
function getProgress() {
  let progress = JSON.parse(PropertiesService.getScriptProperties().getProperty('messages') || '[]');
  console.log('getProgress returned: ', progress)
  return progress;
}

function getErrors() {
  return JSON.parse(PropertiesService.getScriptProperties().getProperty('errors') || '[]');
}

function acknowledgeErrors() {
  PropertiesService.getScriptProperties().deleteProperty('errors');
  PropertiesService.getScriptProperties().deleteProperty('messages');
}
