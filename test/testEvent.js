const Event = require("../src/Event");

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}. Expected ${expected}, but got ${actual}`);
  }
}

function assertTrue(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertFalse(condition, message) {
  if (condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function runTests() {
  console.log("Running tests...");

  const managedEventCases = [
    { name: "Tue 'B' Ride (1/1 10:00 AM) [3] fargle", expected: true },
    { name: "CANCELLED Tue 'B' Ride (1/1 10:00 AM) [3] fargle", expected: true },
    { name: "Tue 'B' Ride (11/15 10:00 AM)", expected: true },
    { name: "CANCELLED Tue 'B' Ride (11/15 10:00 AM)", expected: true },
    { name: "Sat A (12/31 10:00)", expected: true },
    { name: "CANCELLED Sat A (12/31 10:00)", expected: true },
    { name: "O1 Ride (12/31 10:00)", expected: true },
    { name: "CANCELLED O1 Ride (12/31 10:00)", expected: true },
    { name: "O2 Ride (12/31 10:00)", expected: true },
    { name: "CANCELLED O2 Ride (12/31 10:00)", expected: true },
    { name: "O3 Ride (12/31 10:00)", expected: true },
    { name: "CANCELLED O3 Ride (12/31 10:00)", expected: true },
    { name: "FARGLE Sat A (12/31 10:00)", expected: false },
    { name: "My Non Managed Ride", expected: false },
    { name: "", expected: true },
    { name: undefined, expected: true },
    { name: "foobar [12]", expected: false }
  ];

  managedEventCases.forEach(testCase => {
    assertEqual(Event.managedEventName(testCase.name, ['A', 'B', 'C', 'D']), testCase.expected, `managedEventName failed for '${testCase.name}'`);
  });

  // Test makeUnmanagedRideName
  assertEqual(Event.makeUnmanagedRideName("Name", 10), "Name [10]", "makeUnmanagedRideName failed for 'Name'");
  assertEqual(Event.makeUnmanagedRideName("Name [1]", 12), "Name [12]", "makeUnmanagedRideName failed for 'Name [1]'");

  // Test updateCountInName
  assertEqual(Event.updateCountInName("foobar [12]", 9, ['A', 'B', 'C', 'D']), "foobar [9]", "updateCountInName failed for 'foobar [12]'");
  assertEqual(Event.updateCountInName("Sun A (1/1 10:00) [0] SCP - Seascape/Corralitos", 12, ['A', 'B', 'C', 'D']), "Sun A (1/1 10:00) [12] SCP - Seascape/Corralitos", "updateCountInName failed for 'Sun A (1/1 10:00) [0] SCP - Seascape/Corralitos'");

  // Test updateRiderCount
  const updateRiderCountCases = [
    { name: "foobar [12]", newCount: 9, expectedName: "foobar [9]", expectedChanged: true },
    { name: "CANCELLED foobar [12]", newCount: 9, expectedName: "CANCELLED foobar [9]", expectedChanged: true },
    { name: "foobar [12]", newCount: 12, expectedName: "foobar [12]", expectedChanged: false },
    { name: "Sun A (1/1 10:00) [0] SCP - Seascape/Corralitos", newCount: 12, expectedName: "Sun A (1/1 10:00) [12] SCP - Seascape/Corralitos", expectedChanged: true },
    { name: "CANCELLED Sun A (1/1 10:00) [0] SCP - Seascape/Corralitos", newCount: 12, expectedName: "CANCELLED Sun A (1/1 10:00) [12] SCP - Seascape/Corralitos", expectedChanged: true },
    { name: "Sun A (1/1 10:00) [11] SCP - Seascape/Corralitos", newCount: 11, expectedName: "Sun A (1/1 10:00) [11] SCP - Seascape/Corralitos", expectedChanged: false }
  ];

  updateRiderCountCases.forEach(testCase => {
    const event = new Event();
    event.name = testCase.name;
    const changed = event.updateRiderCount(testCase.newCount);
    assertEqual(event.name, testCase.expectedName, `updateRiderCount failed to update name for '${testCase.name}'`);
    assertEqual(changed, testCase.expectedChanged, `updateRiderCount failed for '${testCase.name}'`);
  });

  // Test cancel
  const cancelCases = [
    { name: "Some Name", expectedName: "CANCELLED: Some Name" },
    { name: "CANCELLED: Some Name", expectedName: "CANCELLED: Some Name" }
  ];

  cancelCases.forEach(testCase => {
    const event = new Event();
    event.name = testCase.name;
    event.cancel();
    assertEqual(event.name, testCase.expectedName, `cancel failed for '${testCase.name}'`);
  });

  // Test reinstate
  const reinstateCases = [
    { name: "CANCELLED: Some Name", expectedName: "Some Name" }
  ];

  reinstateCases.forEach(testCase => {
    const event = new Event();
    event.name = testCase.name;
    event.reinstate();
    assertEqual(event.name, testCase.expectedName, `reinstate failed for '${testCase.name}'`);
  });

  console.log("All tests passed!");
}

runTests();