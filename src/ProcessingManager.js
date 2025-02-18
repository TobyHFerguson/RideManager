class ProcessingManager {
    constructor(processFunction) {
        this.props = PropertiesService.getScriptProperties();
        this.processFunction = processFunction;
        this.clearErrors();
        this.clearProgress();
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
        this.setProgress('Processing complete!');
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
        this.setProgress(this.getErrors().length === 0 ? 'Processing complete! Closing...' : 'Processing complete with errors.');
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
        manager.setProgress(`Processing: ${i * 10}%`);

        if (errorSteps.includes(i)) {
            manager.addError(`Error at step ${i}`);
        }
    }
}

// Sidebar UI-related functions
function getProgress() {
    return PropertiesService.getScriptProperties().getProperty('progress');
}

function getErrors() {
    return JSON.parse(PropertiesService.getScriptProperties().getProperty('errors') || '[]');
}

function acknowledgeErrors() {
    PropertiesService.getScriptProperties().deleteProperty('errors');
    SpreadsheetApp.getUi().showSidebar(null);
}
