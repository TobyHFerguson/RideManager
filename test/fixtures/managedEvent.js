const descriptionText = `Ride Leader: Toby Ferguson

Address: Seascape County Park, Sumner Ave, Aptos, CA 95003

Arrive 9:45 AM for a 10:00 AM rollout.

All participants are assumed to have read and agreed to the clubs ride policy: https://scccc.clubexpress.com/content.aspx?page_id=22&club_id=575722&module_id=137709

Note: When using a browser use the "Go to route" link below to open up the route.`;

const payload = {
    all_day: '0',
    auto_expire_participants: '1',
    // v1 API field name
    description: descriptionText,
    // Legacy alias for backward compatibility (enumerable for spread)
    desc: descriptionText,
    location: 'Seascape County Park',
    name: 'Sun A (1/1 10:00) SCP - Seascape/Corralitos',
    // v1 API field name
    organizer_ids: ['302732'],
    // Legacy alias for backward compatibility (enumerable for spread)
    organizer_tokens: ['302732'],
    route_ids: ['17166902'],
    // v1 API field names
    start_date: '2023-01-01',
    start_time: '10:00',
    visibility: 0,
}

// Add computed startDateTime getter for backward compatibility
Object.defineProperty(payload, 'startDateTime', {
    get() { return new Date(`${this.start_date}T${this.start_time}`); },
    enumerable: false
});

module.exports = payload;
