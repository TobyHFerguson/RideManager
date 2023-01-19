const Email = function () {
    function _makeLink(href, text) {
        return `<a href="${href}">${text}</a>`
    }
    function _ul(items) {
        let html = '<ul>\n';
        for (const e of items) {
            html += `<li>${e}</li>\n`;
        }
        html += '</ul>\n';
        return html;
    }

    return {
        help(row, email) {
            const body = this.formatHelpEmail(row, email);
            this.sendEmail('Help needed', body, "rides@santacruzcycling.org");
            this.sendEmail('Help request noted', `${email},<p> you requested help. 
            <p>
            We've notified the Ride group and you should hear from them soon. 
            <p>
            You can contact them directly at rides@santacruzcycling.org`,
                email)
        },
        rideDeleted(row, email) {
            const body = this.formatDeletionEmail(row);
            this.sendEmail('Ride deleted', body, email);
        },
        rideCancelled(row, email) {
            const body = this.formatCancellationEmail(row);
            this.sendEmail('Ride cancelled', body, email);
        },
        rideResubmitted(row, email) {
            const body = this.formatResubmissionEmail(row);
            this.sendEmail('Ride updated', body, email);
        },
        sendEmail(subject, body, recipient) {
            console.log(recipient);
            console.log(body);
            body = `${body}<p>SCCCC Ride Director`
            GmailApp.sendEmail(`${recipient}`, `SCCCC: ${subject}`, '', { htmlBody: body });
        },
        rideSubmitted(row, email) {
            const body = this.formatSubmissionEmail(row)
            this.sendEmail('New Ride Submitted', body, email);
        },
        formatHelpEmail(row, email) {
            var html = `${email} is looking for help on this ride: `
            html += "<ul>\n"
            html += `<li>Date: ${row.StartDate}</li>`
            html += `<li>Group: ${row.Group}</li>`
            html += `<li>Time: ${dates.T24(row.StartTime)}</li>`
            html += `<li>Route: ${row.RouteURL}</li>`
            html += '</ul>'
            return html;
        },
        formatDeletionEmail(row) {
            var html = `${row.RideLeaders[0]},<p> `
            html += `The ride ${row.RideName} has been deleted and is no longer visible on the schedule.`
            html += '<p>However the ride can still be managed by editing the Google Form you originally used to create the ride.'
            return html;
        },
        formatCancellationEmail(row) {
            var html = `${row.RideLeaders[0]}, \n `
            html += `The ride '${_makeLink(row.RideURL, row.RideName.replace('CANCELLED: ', ''))}' has been cancelled.`
            html += '<p>However the ride can still be managed by editing the Google Form you originally used to create the ride'
            return html;
        },
        formatResubmissionEmail(row) {
            var html = `${row.RideLeaders[0]}, <p> `
            html += `you requested modifications to the ride ${_makeLink(row.RideURL, row.RideName)}.<p>`
            if (row.errors && row.errors.length) {
                html += `Unfortunately the ride had the following errors and was not updated:`
                html += _ul(row.errors);
                if (row.warnings && row.warnings.length) {
                    html += `<p>The also had some warnings:`
                    html += _ul(row.warnings);
                }
                html += `<p>Please fix the above issues, edit the form appropriately and resubmit it.`
            } else {
                html += `The ride has now been scheduled and is live on the club calendar and in RideWithGPS. `
                if (row.warnings && row.warnings.length) {
                    html += `<p>The ride did however have some warnings, which you should attend to and fix by editing the form and resubmitting it:`
                    html += _ul(row.warnings);
                }
                html += `<p>Please use the following link in any emails about the ride:<p>\n`
                html += _makeLink(row.RideURL, row.RideName);
            }
            return html;
        },
        formatSubmissionEmail(row) {
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
                html += `<p>The ride has now been scheduled and is live on the club calendar and in RideWithGPS. `
                if (row.warnings && row.warnings.length) {
                    html += `<p>The ride did however have some warnings, which you should attend to and fix by editing the form and resubmitting it:`
                    html += _ul(row.warnings);
                }
                html += `<p>Please use the following link in any emails about the ride:<p>\n`
                html += _makeLink(row.RideURL, row.RideName);
            }
            return html;
        }
    }
}()