// @ts-check

function assertEqual_(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}. Expected ${expected}, but got ${actual}`);
  }
}

function assertTrue_(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertFalse_(condition, message) {
  if (condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function runTestEvent() {
  console.log("Running tests...");

  const groups = ['A', 'B', 'C', 'D', 'O1', 'O2', 'O3'];
  // Test managedEventName
  const testCases = [
    { input: "Tue B (1/1 10:00 AM) [3] fargle", expected: true },
    { input: "CANCELLED: Tue B (1/1 10:00 AM) [3] fargle", expected: true },
    { input: "Tue O1 (1/1 10:00 AM) [3] fargle", expected: true },
    { input: "CANCELLED: Tue O1 (1/1 10:00 AM) [3] fargle", expected: true },
    { input: "Tue B (11/15 10:00 AM)", expected: false },
    { input: "CANCELLED: Tue B (11/15 10:00 AM)", expected: false },
    { input: "Sat A (12/31 10:00)", expected: false },
    { input: "CANCELLED: Sat A (12/31 10:00)", expected: false },
    { input: "O1 (12/31 10:00)", expected: false },
    { input: "CANCELLED: O1 (12/31 10:00)", expected: false },
    { input: "O2 (12/31 10:00)", expected: false },
    { input: "CANCELLED: O2 (12/31 10:00)", expected: false },
    { input: "O3 (12/31 10:00)", expected: false },
    { input: "CANCELLED: O3 (12/31 10:00)", expected: false },
    { input: "FARGLE Sat A (12/31 10:00)", expected: false },
    { input: "My Non Managed Ride", expected: false },
    { input: "", expected: true },
    { input: undefined, expected: true },
    { input: "foobar [12]", expected: false }
  ];

  testCases.forEach(({ input, expected }) => {
    const result = Event.managedEventName(input, groups);
    if (expected) {
      assertTrue_(result, `managedEventName failed for '${input}'`);
    } else {
      assertFalse_(result, `managedEventName failed for '${input}'`);
    }
  });

  // Test makeUnmanagedRideName
  assertEqual_(Event.makeUnmanagedRideName("Name", 10), "Name [10]", "makeUnmanagedRideName failed for 'Name'");
  assertEqual_(Event.makeUnmanagedRideName("Name [1]", 12), "Name [12]", "makeUnmanagedRideName failed for 'Name [1]'");

  // Test updateCountInName
  const foobar = "foobar [12]";
  const sunA = "Sun A (1/1 10:00) [0] SCP - Seascape/Corralitos";
  const cancelledSunA = "CANCELLED: " + sunA;

  assertEqual_(Event.updateCountInName(foobar, 9, groups), "foobar [9]", `updateCountInName failed for '${foobar}'`);
  assertEqual_(Event.updateCountInName(sunA, 12, groups), "Sun A (1/1 10:00) [12] SCP - Seascape/Corralitos", `updateCountInName failed for '${sunA}'`);
  assertEqual_(Event.updateCountInName(cancelledSunA, 12, groups), "CANCELLED: Sun A (1/1 10:00) [12] SCP - Seascape/Corralitos", `updateCountInName failed for '${cancelledSunA}'`);

  // Test updateRiderCount
  let event = new Event();
  const updateRiderCountTestCases = [
    { input: { name: "foobar [12]", count: 9 }, expected: true, updatedName: "foobar [9]" },
    { input: { name: "CANCELLED: foobar [12]", count: 9 }, expected: true, updatedName: "CANCELLED: foobar [9]" },
    { input: { name: "foobar [12]", count: 12 }, expected: false, updatedName: "foobar [12]" },
    { input: { name: "Sun A (1/1 10:00) [0] SCP - Seascape/Corralitos", count: 12 }, expected: true, updatedName: "Sun A (1/1 10:00) [12] SCP - Seascape/Corralitos" },
    { input: { name: "CANCELLED: Sun A (1/1 10:00) [0] SCP - Seascape/Corralitos", count: 12 }, expected: true, updatedName: "CANCELLED: Sun A (1/1 10:00) [12] SCP - Seascape/Corralitos" },
    { input: { name: "Sun A (1/1 10:00) [11]", count: 11 }, expected: false, updatedName: "Sun A (1/1 10:00) [11]" }
  ];

  updateRiderCountTestCases.forEach(({ input, expected, updatedName }) => {
    event.name = input.name;
    const result = event.updateRiderCount(input.count, groups);
    if (expected) {
      assertTrue_(result, `updateRiderCount failed for '${input.name}'`);
    } else {
      assertFalse_(result, `updateRiderCount failed for '${input.name}'`);
    }
    assertEqual_(event.name, updatedName, `updateRiderCount failed to update name for '${input.name}'`);
  });

  // Test cancel
  event.name = "Some Name";
  event.cancel();
  assertEqual_(event.name, "CANCELLED: Some Name", "cancel failed for 'Some Name'");

  event.cancel();
  assertEqual_(event.name, "CANCELLED: Some Name", "cancel failed for already CANCELLED: 'Some Name'");

  // Test reinstate
  event.name = "CANCELLED: Some Name";
  event.reinstate();
  assertEqual_(event.name, "Some Name", "reinstate failed for 'CANCELLED: Some Name'");

  console.log("All tests passed!");
}

