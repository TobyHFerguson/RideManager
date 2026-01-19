const SCCCCEvent = require("../../src/SCCCCEvent");

const { test, describe, expect } = require('@jest/globals');


describe('SCCCCEvent Tests', () => {
  // =========================================================================
  // Task 7.3: v1 API Field Names Tests
  // =========================================================================
  describe('v1 API field names', () => {
    describe('description field (renamed from desc)', () => {
      test('should have description field', () => {
        const event = new SCCCCEvent();
        event.description = 'Test description';
        expect(event.description).toBe('Test description');
      });

      test('desc getter should return description value', () => {
        const event = new SCCCCEvent();
        event.description = 'Test description';
        expect(event.desc).toBe('Test description');
      });

      test('desc setter should set description value', () => {
        const event = new SCCCCEvent();
        event.desc = 'Set via legacy alias';
        expect(event.description).toBe('Set via legacy alias');
      });
    });

    describe('organizer_ids field (renamed from organizer_tokens)', () => {
      test('should have organizer_ids field', () => {
        const event = new SCCCCEvent();
        event.organizer_ids = ['123', '456'];
        expect(event.organizer_ids).toEqual(['123', '456']);
      });

      test('organizer_tokens getter should return organizer_ids value', () => {
        const event = new SCCCCEvent();
        event.organizer_ids = ['123', '456'];
        expect(event.organizer_tokens).toEqual(['123', '456']);
      });

      test('organizer_tokens setter should set organizer_ids value', () => {
        const event = new SCCCCEvent();
        event.organizer_tokens = ['789'];
        expect(event.organizer_ids).toEqual(['789']);
      });
    });

    describe('start_date and start_time fields', () => {
      test('should have start_date field', () => {
        const event = new SCCCCEvent();
        event.start_date = '2025-01-20';
        expect(event.start_date).toBe('2025-01-20');
      });

      test('should have start_time field', () => {
        const event = new SCCCCEvent();
        event.start_time = '09:00';
        expect(event.start_time).toBe('09:00');
      });

      test('startDateTime getter should compute from start_date and start_time', () => {
        const event = new SCCCCEvent();
        event.start_date = '2025-01-20';
        event.start_time = '09:30';
        const result = event.startDateTime;
        expect(result).toBeInstanceOf(Date);
        expect(result.getFullYear()).toBe(2025);
        expect(result.getMonth()).toBe(0); // January
        expect(result.getDate()).toBe(20);
        expect(result.getHours()).toBe(9);
        expect(result.getMinutes()).toBe(30);
      });

      test('startDateTime getter should return undefined when start_date is missing', () => {
        const event = new SCCCCEvent();
        event.start_time = '09:30';
        expect(event.startDateTime).toBeUndefined();
      });

      test('startDateTime getter should return undefined when start_time is missing', () => {
        const event = new SCCCCEvent();
        event.start_date = '2025-01-20';
        expect(event.startDateTime).toBeUndefined();
      });

      test('startDateTime setter should split into start_date and start_time', () => {
        const event = new SCCCCEvent();
        // Set using Date object (local time)
        event.startDateTime = new Date('2025-03-15T14:45:00');
        expect(event.start_date).toBe('2025-03-15');
        expect(event.start_time).toBe('14:45');
      });

      test('startDateTime setter should handle undefined', () => {
        const event = new SCCCCEvent();
        event.start_date = '2025-01-20';
        event.start_time = '09:30';
        event.startDateTime = undefined;
        expect(event.start_date).toBeUndefined();
        expect(event.start_time).toBeUndefined();
      });
    });
  });

  // =========================================================================
  // Original Tests (unchanged)
  // =========================================================================
  let groupNames;
  beforeEach(() => {
    groupNames = ['A', 'B', 'C', 'D', 'O1', 'O2', 'O3'];
  });
  describe('makeEventName', () => {
    test('managedEventName - Tue B (1/1 10:00 AM) fargle', () => {
      expect(SCCCCEvent.managedEventName("Tue B (1/1 10:00 AM) fargle", groupNames)).toBe(true);
    });

    test('managedEventName - Sat B (3/15 10:00) CCC - San Jose/Soquel, Rodeo, Branciforte, Happy Valley, Man View, Laurel Glen', () => {
      expect(SCCCCEvent.managedEventName("Sat B (3/15 10:00) CCC - San Jose/Soquel, Rodeo, Branciforte, Happy Valley, Man View, Laurel Glen", groupNames)).toBe(true);
    });

    test('managedEventName - CANCELLED: Tue B (1/1 10:00 AM) fargle', () => {
      expect(SCCCCEvent.managedEventName("CANCELLED: Tue B (1/1 10:00 AM) fargle", groupNames)).toBe(true);
    });

    test('managedEventName - Tue B (11/15 10:00 AM) ', () => {
      expect(SCCCCEvent.managedEventName("Tue B (11/15 10:00 AM) ", groupNames)).toBe(true);
    });

    test('managedEventName - CANCELLED: Tue B (11/15 10:00 AM) ', () => {
      expect(SCCCCEvent.managedEventName("CANCELLED: Tue B (11/15 10:00 AM) ", groupNames)).toBe(true);
    });

    test('managedEventName - Sat A (12/31 10:00) ', () => {
      expect(SCCCCEvent.managedEventName("Sat A (12/31 10:00) ", groupNames)).toBe(true);
    });

    test('managedEventName - CANCELLED: Sat A (12/31 10:00) ', () => {
      expect(SCCCCEvent.managedEventName("CANCELLED: Sat A (12/31 10:00) ", groupNames)).toBe(true);
    });

    test('managedEventName - Sat O1 (12/31 10:00) ', () => {
      expect(SCCCCEvent.managedEventName("Sat O1 (12/31 10:00) ", groupNames)).toBe(true);
    });

    test('managedEventName - CANCELLED: Sat O1 (12/31 10:00) ', () => {
      expect(SCCCCEvent.managedEventName("CANCELLED: Sat O1 (12/31 10:00) ", groupNames)).toBe(true);
    });

    test('managedEventName - Sat O2 (12/31 10:00) ', () => {
      expect(SCCCCEvent.managedEventName("Sat O2 (12/31 10:00) ", groupNames)).toBe(true);
    });

    test('managedEventName - CANCELLED: Sat O2 (12/31 10:00) ', () => {
      expect(SCCCCEvent.managedEventName("CANCELLED: Sat O2 (12/31 10:00) ", groupNames)).toBe(true);
    });

    test('managedEventName - Sat O3 (12/31 10:00) ', () => {
      expect(SCCCCEvent.managedEventName("Sat O3 (12/31 10:00) ", groupNames)).toBe(true);
    });

    test('managedEventName - CANCELLED: Sat O3 (12/31 10:00) ', () => {
      expect(SCCCCEvent.managedEventName("CANCELLED: Sat O3 (12/31 10:00) ", groupNames)).toBe(true);
    });

    test('managedEventName - FARGLE Sat A (12/31 10:00) ', () => {
      expect(SCCCCEvent.managedEventName("FARGLE Sat A (12/31 10:00) ", groupNames)).toBe(false);
    });

    test('managedEventName - My Non Managed Ride ', () => {
      expect(SCCCCEvent.managedEventName("My Non Managed Ride ", groupNames)).toBe(false);
    });

    test('managedEventName - empty string', () => {
      expect(SCCCCEvent.managedEventName("", groupNames)).toBeTruthy();
    });

    test('managedEventName - undefined', () => {
      expect(SCCCCEvent.managedEventName(undefined, groupNames)).toBeTruthy();
    });

    test('managedEventName - foobar ', () => {
      expect(SCCCCEvent.managedEventName("foobar ", groupNames)).toBeFalsy;
    });

    test('makeUnmanagedRideName', () => {
      expect(SCCCCEvent.makeUnmanagedRideName("Name", 10)).toBe("Name");
      expect(SCCCCEvent.makeUnmanagedRideName("Name ", 12)).toBe("Name ");
    });
  });

  describe('cancel', () => {
    test('cancel - Some Name', () => {
      const event = new SCCCCEvent();
      event.name = "Some Name";
      event.cancel();
      expect(event.name).toBe("CANCELLED: Some Name");
    });

    test('cancel - CANCELLED: Some Name', () => {
      const event = new SCCCCEvent();
      event.name = "CANCELLED: Some Name";
      event.cancel();
      expect(event.name).toBe("CANCELLED: Some Name");
    });
  });

  describe('reinstate', () => {
    test('reinstate - CANCELLED: Some Name', () => {
      const event = new SCCCCEvent();
      event.name = "CANCELLED: Some Name";
      event.reinstate();
      expect(event.name).toBe("Some Name");
    });
  });
  describe('getGroupName', () => {
    test ('getGroupName - Mon C (1/12 10:00) [0] AV - Palm Beach SP via Watsonville', () => {
      expect(SCCCCEvent.getGroupName("Mon C (1/12 10:00) [0] AV - Palm Beach SP via Watsonville", groupNames)).toBe("C");
    });
    test('getGroupName - Tue B (1/1 10:00 AM) [3] fargle', () => {
      expect(SCCCCEvent.getGroupName("Tue B (1/1 10:00 AM) [3] fargle", groupNames)).toBe("B");
    });

    test('getGroupName - Sat B (3/15 10:00) [0] CCC - San Jose/Soquel, Rodeo, Branciforte, Happy Valley, Man View, Laurel Glen', () => {
      expect(SCCCCEvent.getGroupName("Sat B (3/15 10:00) [0] CCC - San Jose/Soquel, Rodeo, Branciforte, Happy Valley, Man View, Laurel Glen", groupNames)).toBe("B");
    });

    test('getGroupName - CANCELLED: Tue B (1/1 10:00 AM) [3] fargle', () => {
      expect(SCCCCEvent.getGroupName("CANCELLED: Tue B (1/1 10:00 AM) [3] fargle", groupNames)).toBe("B");
    });

    test('getGroupName - Tue B (11/15 10:00 AM) [3]', () => {
      expect(SCCCCEvent.getGroupName("Tue B (11/15 10:00 AM) [3]", groupNames)).toBe("B");
    });

    test('getGroupName - CANCELLED: Tue B (11/15 10:00 AM) [3]', () => {
      expect(SCCCCEvent.getGroupName("CANCELLED: Tue B (11/15 10:00 AM) [3]", groupNames)).toBe("B");
    });

    test('getGroupName - Sat A (12/31 10:00) [3]', () => {
      expect(SCCCCEvent.getGroupName("Sat A (12/31 10:00) [3]", groupNames)).toBe("A");
    });

    test('getGroupName - CANCELLED: Sat A (12/31 10:00) [3]', () => {
      expect(SCCCCEvent.getGroupName("CANCELLED: Sat A (12/31 10:00) [3]", groupNames)).toBe("A");
    });

    test('getGroupName - Sat O1 (12/31 10:00) [3]', () => {
      expect(SCCCCEvent.getGroupName("Sat O1 (12/31 10:00) [3]", groupNames)).toBe("O1");
    });

    test('getGroupName - CANCELLED: Sat O1 (12/31 10:00) [3]', () => {
      expect(SCCCCEvent.getGroupName("CANCELLED: Sat O1 (12/31 10:00) [3]", groupNames)).toBe("O1");
    });

    test('getGroupName - Sat O2 (12/31 10:00) [3]', () => {
      expect(SCCCCEvent.getGroupName("Sat O2 (12/31 10:00) [3]", groupNames)).toBe("O2");
    });

    test('getGroupName - CANCELLED: Sat O2 (12/31 10:00) [3]', () => {
      expect(SCCCCEvent.getGroupName("CANCELLED: Sat O2 (12/31 10:00) [3]", groupNames)).toBe("O2");
    });

    test('getGroupName - Sat O3 (12/31 10:00) [3]', () => {
      expect(SCCCCEvent.getGroupName("Sat O3 (12/31 10:00) [3]", groupNames)).toBe("O3");
    });

    test('getGroupName - CANCELLED: Sat O3 (12/31 10:00) [3]', () => {
      expect(SCCCCEvent.getGroupName("CANCELLED: Sat O3 (12/31 10:00) [3]", groupNames)).toBe("O3");
    });

    test('getGroupName - FARGLE Sat A (12/31 10:00) [3]', () => {
      expect(SCCCCEvent.getGroupName("FARGLE Sat A (12/31 10:00) [3]")).toBe("");
    });

    test('getGroupName - My Non Managed Ride [3]', () => {
      expect(SCCCCEvent.getGroupName("My Non Managed Ride [3]")).toBe("");
    });

    test('getGroupName - empty string', () => {
      expect(SCCCCEvent.getGroupName("")).toBe("");
    });

    test('getGroupName - undefined', () => {
      expect(SCCCCEvent.getGroupName(undefined)).toBe("");
    });

    test('getGroupName - foobar [12]', () => {
      expect(SCCCCEvent.getGroupName("foobar [12]")).toBe("");
    });
  });
});