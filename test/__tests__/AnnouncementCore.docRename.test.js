/**
 * Tests for Announcement Document Rename Consistency
 * 
 * Goal: When ride name changes (cancel/reinstate), the announcement document
 * title should match the new ride name.
 * 
 * Pattern: RA-{RideName}
 * - Original: RA-Sat A (12/7 10:00) [3] Route Name
 * - Cancelled: RA-CANCELLED: Sat A (12/7 10:00) [3] Route Name
 * - Reinstated: RA-Sat A (12/7 10:00) [3] Route Name (prefix removed)
 */

const AnnouncementCore = require('../../src/AnnouncementCore');

describe('AnnouncementCore - Document Rename on Cancel/Reinstate', () => {
    describe('calculateAnnouncementDocName with cancelled rides', () => {
        it('should include CANCELLED prefix when ride name has it', () => {
            const cancelledRideName = 'CANCELLED: Sat A (12/7 10:00) [3] Route Name';
            
            const result = AnnouncementCore.calculateAnnouncementDocName(cancelledRideName);
            
            expect(result).toBe('RA-CANCELLED: Sat A (12/7 10:00) [3] Route Name');
        });

        it('should not have CANCELLED prefix when ride is reinstated', () => {
            const reinstatedRideName = 'Sat A (12/7 10:00) [3] Route Name';
            
            const result = AnnouncementCore.calculateAnnouncementDocName(reinstatedRideName);
            
            expect(result).toBe('RA-Sat A (12/7 10:00) [3] Route Name');
        });
    });

    describe('calculateAnnouncementUpdates for cancellation', () => {
        it('should detect rename needed when ride is cancelled', () => {
            const currentAnnouncement = {
                documentName: 'RA-Sat A (12/7 10:00) [3] Route Name'
            };
            const cancelledRideData = {
                rideName: 'CANCELLED: Sat A (12/7 10:00) [3] Route Name',
                rideDate: new Date('2025-12-07T10:00:00')
            };

            const updates = AnnouncementCore.calculateAnnouncementUpdates(currentAnnouncement, cancelledRideData);

            expect(updates.needsDocumentRename).toBe(true);
            expect(updates.newDocumentName).toBe('RA-CANCELLED: Sat A (12/7 10:00) [3] Route Name');
        });

        it('should detect rename needed when ride is reinstated', () => {
            const currentAnnouncement = {
                documentName: 'RA-CANCELLED: Sat A (12/7 10:00) [3] Route Name'
            };
            const reinstatedRideData = {
                rideName: 'Sat A (12/7 10:00) [3] Route Name',
                rideDate: new Date('2025-12-07T10:00:00')
            };

            const updates = AnnouncementCore.calculateAnnouncementUpdates(currentAnnouncement, reinstatedRideData);

            expect(updates.needsDocumentRename).toBe(true);
            expect(updates.newDocumentName).toBe('RA-Sat A (12/7 10:00) [3] Route Name');
        });

        it('should not rename when cancelled ride document already matches', () => {
            const currentAnnouncement = {
                documentName: 'RA-CANCELLED: Sat A (12/7 10:00) [3] Route Name'
            };
            const cancelledRideData = {
                rideName: 'CANCELLED: Sat A (12/7 10:00) [3] Route Name',
                rideDate: new Date('2025-12-07T10:00:00')
            };

            const updates = AnnouncementCore.calculateAnnouncementUpdates(currentAnnouncement, cancelledRideData);

            expect(updates.needsDocumentRename).toBe(false);
            expect(updates.newDocumentName).toBeNull();
        });
    });
});
