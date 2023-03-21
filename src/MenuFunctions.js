const MenuFunctions = (() => {
    function do_action(form) {
        if (!(form.email && form.password)) {
            askForCredentials(form.command);
        } else {
            const rwgpsService = new RWGPSService(form.email, form.password);
            const rwgps = new RWGPS(rwgpsService);
            let rows = Schedule.getSelectedRows();
            console.info('User %s', Session.getActiveUser());
            console.info('processing rows', rows.map(row => row.rowNum))
            try {
                Commands[form.command](rows, rwgps);
            } catch (e) {
                console.error(e)
                throw (e)
            }
            finally {
                Schedule.save();
            }


        }
    }
    return Object.freeze({
        cancelSelectedRides() {
            let form = { ...credentials, command: "cancelSelectedRidesWithCreds" };
            do_action(form);
        },
        importSelectedRoutes() {
            let form = { ...credentials, command: "importSelectedRoutesWithCredentials" };
            do_action(form);
        },
        linkSelectedRouteUrls() {
            let form = { ...credentials, command: "linkSelectedRouteUrlsWithCredentials" };
            do_action(form);
        },
        reinstateSelectedRides() {
            let form = { ...credentials, command: "reinstateSelectedRidesWithCreds" };
            do_action(form);
        },
        scheduleSelectedRides() {
            let form = { ...credentials, command: "scheduleSelectedRidesWithCredentials" };
            do_action(form);
        },
        unscheduleSelectedRides() {
            let form = { ...credentials, command: "unscheduleSelectedRidesWithCreds" };
            do_action(form);
        },
        
        updateRiderCount() {
            let form = { ...credentials, command: "updateRiderCountWithCreds" };
            do_action(form);
        },
        updateSelectedRides() {
            let form = { ...credentials, command: "updateSelectedRidesWithCredentials" };
            do_action(form);
        },
    })
})()