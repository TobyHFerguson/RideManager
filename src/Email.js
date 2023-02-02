const Email = function () {
    function _formatHelpEmail(row, email) {
        var html = `${email} is looking for help on this ride: `
        html += "<ul>\n"
        html += `<li>Date: ${row.StartDate}</li>`
        html += `<li>Group: ${row.Group}</li>`
        html += `<li>Time: ${dates.T24(row.StartTime)}</li>`
        html += `<li>Route: ${row.RouteURL}</li>`
        html += '</ul>'
        return html;
    };

    function _formatDeletionEmail(row) {
        var html = `${row.RideLeaders[0]},`
        html += `<p> The ride ${row.RideName} has been deleted and is no longer visible on the schedule.`
        html += '<p>However the ride can still be managed by editing the Google Form you originally used to create the ride.'
        return html;
    };

    function _formatCancellationEmail(row) {
        var html = `${row.RideLeaders[0]}, \n `
        html += `The ride '${_makeLink(row.RideURL, row.RideName.replace('CANCELLED: ', ''))}' has been cancelled.`

        html += '<p>You can still manage the ride by editing the Google Form you originally used to create it'
        return html;
    };

    function _formatOnlyScheduleAllowedEmail(row) {
        var html = `${row.RideLeaders[0]},`
        html += `<p>you attempted to either cancel or delete the ride ${row.RideName}, however the only thing `
        html += `you're permitted to do is to schedule it. Please edit the form and select the 'Schedule' button `
        html += `in the Ride Management section and resubmit the ride`;
        return html;
    };

    function _formatUpdatedEmail(row) {
        var html = `${row.RideLeaders[0]}, <p> `
        html += `you requested modifications to the ride ${_makeLink(row.RideURL, row.RideName)}.<p>`
        if (row.errors && row.errors.length) {
            html += `Unfortunately the ride had the following errors and was not updated:`
            html += _ul(row.errors);
            if (row.warnings && row.warnings.length) {
                html += `<p>The ride also had some warnings:`
                html += _ul(row.warnings);
            }
            html += `<p>Please fix the above issues, edit the form appropriately and resubmit it.`
        } else {
            html += _scheduledBody(row);
        }
        return html;
    };

    function _formatScheduleEmail(row) {
        let sd = new Date(row.StartDate).toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", weekday: "short", month: "2-digit", day: "numeric" }).replace(',', '')
        var html = `${row.RideLeaders[0]} `
        html += `<p>Thank you for volunteering to lead the '${row.Group}' ride on ${sd}.</p>\n`;
        if (row.errors && row.errors.length) {
            html += `Unfortunately the ride had the following errors and could not be scheduled:`
            html += _ul(row.errors);
            if (row.warnings && row.warnings.length) {
                html += `<p>The ride also had some warnings:`
                html += _ul(row.warnings);
            }
            html += `<p>Please fix the above issues, edit the form appropriately and resubmit it.`
        } else {
            html += _scheduledBody(row);
        }
        return html;
    };

    function _scheduledBody(row) {
        let html = `<p>The ride has now been scheduled and is live on the club calendar and in RideWithGPS. `
        if (row.warnings && row.warnings.length) {
            html += `<p>The ride did however have some warnings, which you should attend to and fix by editing the form and resubmitting it:`
            html += _ul(row.warnings);
        }
        html += `<p>Please use the following link in any emails about the ride:<p>\n`
        html += _makeLink(row.RideURL, row.RideName);
        return html;
    }

    function _formatSubject(msg, row) {
        const subject = `${row && row.error && row.errors.length ? '[ERROR!]' : ''} ${msg}`;
        return subject;
    }

    function _makeLink(href, text) {
        return `<a href="${href}">${text}</a>`
    };

    function _sendEmail(subject, body, recipient) {
        console.log('Email.js - sendingEmail');
        console.log(recipient);
        console.log(body);
        body = `${body}<p>SCCCC Ride Director`
        GmailApp.sendEmail(`${recipient}`, `SCCCC: ${subject}`, '', { htmlBody: body });
    };

    function _ul(items) {
        let html = '<ul>\n';
        for (const e of items) {
            html += `<li>${e}</li>\n`;
        }
        html += '</ul>\n';
        return html;
    };

    return {
        /**
         * 
         * @param {Row} row the ride row to be reported on
         * @param {string} email email address
         */
        help(row, email) {
            const body = _formatHelpEmail(row, email);
            _sendEmail('Help needed', body, "rides@santacruzcycling.org");
            _sendEmail('Help request noted', `${email},<p> you requested help when submitting a ride. 
            <p>
            We've notified the Ride group and you should hear from them soon. 
            <p>
            You can contact them directly at rides@santacruzcycling.org`,
                email)
        },
        onlyScheduleAllowed(row, email) {
            const subject = _formatSubject('Ride - only schedule allowed');
            const body = _formatOnlyScheduleAllowedEmail(row);
            _sendEmail(subject, body, email);
        },
        rideCancelled(row, email) {
            const subject = _formatSubject('Ride Cancelled');
            const body = _formatCancellationEmail(row);
            _sendEmail(subject, body, email);
        },
        rideDeleted(row, email) {
            const subject = _formatSubject('Ride Deleted');
            const body = _formatDeletionEmail(row);
            _sendEmail(subject, body, email);
        },
        rideScheduled(row, email) {
            const subject = _formatSubject('Ride Scheduled', row)
            const body = _formatScheduleEmail(row)
            _sendEmail(subject, body, email);
        },
        rideUpdated(row, email) {
            const subject = _formatSubject('Ride Updated', row);
            const body = _formatUpdatedEmail(row);
            _sendEmail(subject, body, email);
        },

    }
}()