class ProcessingManager {
    constructor(processFunction) {
      this.props = PropertiesService.getScriptProperties();
      this.processFunction = processFunction; // Store the provided function
      this.clearProgress();
      this.clearError();
      this.setProgress('Starting processing...');
      this.showSidebar();
      this.startProcessing();
    }
  
    showSidebar() {
      const html = HtmlService.createHtmlOutputFromFile('Sidebar')
        .setTitle('Processing Progress')
        .setWidth(300);
      SpreadsheetApp.getUi().showSidebar(html);
    }
  
    setProgress(message) {
      this.props.setProperty('progress', message);
    }
  
    getProgress() {
      return this.props.getProperty('progress') || '';
    }
  
    clearProgress() {
      this.props.deleteProperty('progress');
    }
  
    setError(message) {
      this.props.setProperty('error', message);
    }
  
    getError() {
      return this.props.getProperty('error') || '';
    }
  
    clearError() {
      this.props.deleteProperty('error');
    }
  
    endProcessing() {
      this.setProgress('Processing complete!');
    }
  
    startProcessing() {
      try {
        this.processFunction(this); // Call the provided function with this instance
      } catch (error) {
        this.setError(`Unexpected error: ${error.message}`);
      }
    }
  
    resumeProcessing() {
      this.clearError();
      this.startProcessing();
    }
  }
  
  // Entry point: Start process with a custom function
  function startProcess() {
    new ProcessingManager(exampleProcess);
  }
  
  // Example processing function (replace with actual logic)
  function exampleProcess(manager) {
    for (let i = 1; i <= 10; i++) {
      Utilities.sleep(1000); // Simulated work
      manager.setProgress(`Processing: ${i * 10}%`);
  
      if (i === 5) {
        manager.setError('An issue occurred at step 5.');
        return; // Stop execution until user acknowledges
      }
    }
    manager.endProcessing();
  }
  
  // Functions for Sidebar UI
  function getProgress() {
    return PropertiesService.getScriptProperties().getProperty('progress');
  }
  
  function getError() {
    return PropertiesService.getScriptProperties().getProperty('error');
  }
  
  function acknowledgeError() {
    const manager = new ProcessingManager(exampleProcess);
    manager.resumeProcessing();
  }
  