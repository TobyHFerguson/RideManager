const Event = require("../../src/Event");

const { test, describe, expect } = require('@jest/globals');


describe('Event Tests', () => {
  let groupNames;
  beforeEach(() => {
    groupNames = ['A', 'B', 'C', 'D', 'O1', 'O2', 'O3'];
  });
  describe('makeEventName', () => {
    test('managedEventName - Tue B (1/1 10:00 AM) [3] fargle', () => {
      expect(Event.managedEventName("Tue B (1/1 10:00 AM) [3] fargle", groupNames)).toBe(true);
    });

    test('managedEventName - Sat B (3/15 10:00) [0] CCC - San Jose/Soquel, Rodeo, Branciforte, Happy Valley, Man View, Laurel Glen', () => {
      expect(Event.managedEventName("Sat B (3/15 10:00) [0] CCC - San Jose/Soquel, Rodeo, Branciforte, Happy Valley, Man View, Laurel Glen", groupNames)).toBe(true);
    });

    test('managedEventName - CANCELLED: Tue B (1/1 10:00 AM) [3] fargle', () => {
      expect(Event.managedEventName("CANCELLED: Tue B (1/1 10:00 AM) [3] fargle", groupNames)).toBe(true);
    });

    test('managedEventName - Tue B (11/15 10:00 AM) [3]', () => {
      expect(Event.managedEventName("Tue B (11/15 10:00 AM) [3]", groupNames)).toBe(true);
    });

    test('managedEventName - CANCELLED: Tue B (11/15 10:00 AM) [3]', () => {
      expect(Event.managedEventName("CANCELLED: Tue B (11/15 10:00 AM) [3]", groupNames)).toBe(true);
    });

    test('managedEventName - Sat A (12/31 10:00) [3]', () => {
      expect(Event.managedEventName("Sat A (12/31 10:00) [3]", groupNames)).toBe(true);
    });

    test('managedEventName - CANCELLED: Sat A (12/31 10:00) [3]', () => {
      expect(Event.managedEventName("CANCELLED: Sat A (12/31 10:00) [3]", groupNames)).toBe(true);
    });

    test('managedEventName - Sat O1 (12/31 10:00) [3]', () => {
      expect(Event.managedEventName("Sat O1 (12/31 10:00) [3]", groupNames)).toBe(true);
    });

    test('managedEventName - CANCELLED: Sat O1 (12/31 10:00) [3]', () => {
      expect(Event.managedEventName("CANCELLED: Sat O1 (12/31 10:00) [3]", groupNames)).toBe(true);
    });

    test('managedEventName - Sat O2 (12/31 10:00) [3]', () => {
      expect(Event.managedEventName("Sat O2 (12/31 10:00) [3]", groupNames)).toBe(true);
    });

    test('managedEventName - CANCELLED: Sat O2 (12/31 10:00) [3]', () => {
      expect(Event.managedEventName("CANCELLED: Sat O2 (12/31 10:00) [3]", groupNames)).toBe(true);
    });

    test('managedEventName - Sat O3 (12/31 10:00) [3]', () => {
      expect(Event.managedEventName("Sat O3 (12/31 10:00) [3]", groupNames)).toBe(true);
    });

    test('managedEventName - CANCELLED: Sat O3 (12/31 10:00) [3]', () => {
      expect(Event.managedEventName("CANCELLED: Sat O3 (12/31 10:00) [3]", groupNames)).toBe(true);
    });

    test('managedEventName - FARGLE Sat A (12/31 10:00) [3]', () => {
      expect(Event.managedEventName("FARGLE Sat A (12/31 10:00) [3]", groupNames)).toBe(false);
    });

    test('managedEventName - My Non Managed Ride [3]', () => {
      expect(Event.managedEventName("My Non Managed Ride [3]", groupNames)).toBe(false);
    });

    test('managedEventName - empty string', () => {
      expect(Event.managedEventName("", groupNames)).toBeTruthy();
    });

    test('managedEventName - undefined', () => {
      expect(Event.managedEventName(undefined, groupNames)).toBeTruthy();
    });

    test('managedEventName - foobar [12]', () => {
      expect(Event.managedEventName("foobar [12]", groupNames)).toBeFalsy;
    });

    test('makeUnmanagedRideName', () => {
      expect(Event.makeUnmanagedRideName("Name", 10)).toBe("Name [10]");
      expect(Event.makeUnmanagedRideName("Name [1]", 12)).toBe("Name [12]");
    });
  });

  describe('updateCountInName', () => {
    test('updateCountInName - foobar [12] to foobar [9]', () => {
      expect(Event.updateCountInName("foobar [12]", 9, groupNames)).toBe("foobar [9]");
    });

    test('updateCountInName - Sun A (1/1 10:00) [0] SCP - Seascape/Corralitos to Sun A (1/1 10:00) [12] SCP - Seascape/Corralitos', () => {
      expect(Event.updateCountInName("Sun A (1/1 10:00) [0] SCP - Seascape/Corralitos", 12, groupNames)).toBe("Sun A (1/1 10:00) [12] SCP - Seascape/Corralitos");
    });

    test('updateRiderCount - foobar [12] to foobar [9]', () => {
      const event = new Event();
      event.name = "foobar [12]";
      const changed = event.updateRiderCount(9, groupNames);
      expect(event.name).toBe("foobar [9]");
      expect(changed).toBe(true);
    });

    test('updateRiderCount - CANCELLED: foobar [12] to CANCELLED: foobar [9]', () => {
      const event = new Event();
      event.name = "CANCELLED: foobar [12]";
      const changed = event.updateRiderCount(9, groupNames);
      expect(event.name).toBe("CANCELLED: foobar [9]");
      expect(changed).toBe(true);
    });

    test('updateRiderCount - foobar [12] to foobar [12]', () => {
      const event = new Event();
      event.name = "foobar [12]";
      const changed = event.updateRiderCount(12, groupNames);
      expect(event.name).toBe("foobar [12]");
      expect(changed).toBe(false);
    });

    test('updateRiderCount - Sun A (1/1 10:00) [0] SCP - Seascape/Corralitos to Sun A (1/1 10:00) [12] SCP - Seascape/Corralitos', () => {
      const event = new Event();
      event.name = "Sun A (1/1 10:00) [0] SCP - Seascape/Corralitos";
      const changed = event.updateRiderCount(12, groupNames);
      expect(event.name).toBe("Sun A (1/1 10:00) [12] SCP - Seascape/Corralitos");
      expect(changed).toBe(true);
    });

    test('updateRiderCount - CANCELLED: Sun A (1/1 10:00) [0] SCP - Seascape/Corralitos to CANCELLED: Sun A (1/1 10:00) [12] SCP - Seascape/Corralitos', () => {
      const event = new Event();
      event.name = "CANCELLED: Sun A (1/1 10:00) [0] SCP - Seascape/Corralitos";
      const changed = event.updateRiderCount(12, groupNames);
      expect(event.name).toBe("CANCELLED: Sun A (1/1 10:00) [12] SCP - Seascape/Corralitos");
      expect(changed).toBe(true);
    });

    test('updateRiderCount - Sun A (1/1 10:00) [11] SCP - Seascape/Corralitos to Sun A (1/1 10:00) [11] SCP - Seascape/Corralitos', () => {
      const event = new Event();
      event.name = "Sun A (1/1 10:00) [11] SCP - Seascape/Corralitos";
      const changed = event.updateRiderCount(11, groupNames);
      expect(changed).toBe(false);
      expect(event.name).toBe("Sun A (1/1 10:00) [11] SCP - Seascape/Corralitos");
    });

  });
  describe('cancel', () => {
    test('cancel - Some Name', () => {
      const event = new Event();
      event.name = "Some Name";
      event.cancel();
      expect(event.name).toBe("CANCELLED: Some Name");
    });

    test('cancel - CANCELLED: Some Name', () => {
      const event = new Event();
      event.name = "CANCELLED: Some Name";
      event.cancel();
      expect(event.name).toBe("CANCELLED: Some Name");
    });
  });

  describe('reinstate', () => {
    test('reinstate - CANCELLED: Some Name', () => {
      const event = new Event();
      event.name = "CANCELLED: Some Name";
      event.reinstate();
      expect(event.name).toBe("Some Name");
    });
  });
  describe('getGroupName', () => {
    test ('getGroupName - Mon C (1/12 10:00) [0] AV - Palm Beach SP via Watsonville', () => {
      expect(Event.getGroupName("Mon C (1/12 10:00) [0] AV - Palm Beach SP via Watsonville", groupNames)).toBe("C");
    });
    test('getGroupName - Tue B (1/1 10:00 AM) [3] fargle', () => {
      expect(Event.getGroupName("Tue B (1/1 10:00 AM) [3] fargle", groupNames)).toBe("B");
    });

    test('getGroupName - Sat B (3/15 10:00) [0] CCC - San Jose/Soquel, Rodeo, Branciforte, Happy Valley, Man View, Laurel Glen', () => {
      expect(Event.getGroupName("Sat B (3/15 10:00) [0] CCC - San Jose/Soquel, Rodeo, Branciforte, Happy Valley, Man View, Laurel Glen", groupNames)).toBe("B");
    });

    test('getGroupName - CANCELLED: Tue B (1/1 10:00 AM) [3] fargle', () => {
      expect(Event.getGroupName("CANCELLED: Tue B (1/1 10:00 AM) [3] fargle", groupNames)).toBe("B");
    });

    test('getGroupName - Tue B (11/15 10:00 AM) [3]', () => {
      expect(Event.getGroupName("Tue B (11/15 10:00 AM) [3]", groupNames)).toBe("B");
    });

    test('getGroupName - CANCELLED: Tue B (11/15 10:00 AM) [3]', () => {
      expect(Event.getGroupName("CANCELLED: Tue B (11/15 10:00 AM) [3]", groupNames)).toBe("B");
    });

    test('getGroupName - Sat A (12/31 10:00) [3]', () => {
      expect(Event.getGroupName("Sat A (12/31 10:00) [3]", groupNames)).toBe("A");
    });

    test('getGroupName - CANCELLED: Sat A (12/31 10:00) [3]', () => {
      expect(Event.getGroupName("CANCELLED: Sat A (12/31 10:00) [3]", groupNames)).toBe("A");
    });

    test('getGroupName - Sat O1 (12/31 10:00) [3]', () => {
      expect(Event.getGroupName("Sat O1 (12/31 10:00) [3]", groupNames)).toBe("O1");
    });

    test('getGroupName - CANCELLED: Sat O1 (12/31 10:00) [3]', () => {
      expect(Event.getGroupName("CANCELLED: Sat O1 (12/31 10:00) [3]", groupNames)).toBe("O1");
    });

    test('getGroupName - Sat O2 (12/31 10:00) [3]', () => {
      expect(Event.getGroupName("Sat O2 (12/31 10:00) [3]", groupNames)).toBe("O2");
    });

    test('getGroupName - CANCELLED: Sat O2 (12/31 10:00) [3]', () => {
      expect(Event.getGroupName("CANCELLED: Sat O2 (12/31 10:00) [3]", groupNames)).toBe("O2");
    });

    test('getGroupName - Sat O3 (12/31 10:00) [3]', () => {
      expect(Event.getGroupName("Sat O3 (12/31 10:00) [3]", groupNames)).toBe("O3");
    });

    test('getGroupName - CANCELLED: Sat O3 (12/31 10:00) [3]', () => {
      expect(Event.getGroupName("CANCELLED: Sat O3 (12/31 10:00) [3]", groupNames)).toBe("O3");
    });

    test('getGroupName - FARGLE Sat A (12/31 10:00) [3]', () => {
      expect(Event.getGroupName("FARGLE Sat A (12/31 10:00) [3]")).toBe("");
    });

    test('getGroupName - My Non Managed Ride [3]', () => {
      expect(Event.getGroupName("My Non Managed Ride [3]")).toBe("");
    });

    test('getGroupName - empty string', () => {
      expect(Event.getGroupName("")).toBe("");
    });

    test('getGroupName - undefined', () => {
      expect(Event.getGroupName(undefined)).toBe("");
    });

    test('getGroupName - foobar [12]', () => {
      expect(Event.getGroupName("foobar [12]")).toBe("");
    });
  });
});