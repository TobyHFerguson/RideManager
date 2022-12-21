const MailHandler = function () {
    return {
        sendErrorEmail: (rideData, errors) => {
            var html = 'Thank you for volunteering to lead the following ride:\n'
            html += '<ul>\n';
            for (let k in rideData) {
                var key = k;
                var data = rideData[k];
                html += '<li>' + key + ": " + data + '</li>\n';
            };
            html += '</ul>\n'
            html += '<P>Unfortunately the following errors were found. Please work with your Ride Lead Coordinator to resolve them\n';
            html += '<ul>\n'
            for (const e of errors) {
                html += `<li>${e}</li>\n`;
            }
            html += '</ul>\n';
            GmailApp.sendEmail('toby.h.ferguson@icloud.com', 'New Ride Submitted', '', { htmlBody: html });
            // Logger.log(html);
        },
        sendEmail: (rideData, event) => {
            let html = formatEmail(event);
            GmailApp.sendEmail(`${rideData.Email}`, 'New Ride Submitted', '', { htmlBody: html });
        },
        formatEmail: (event) => {
            let sd = new Date(event.start_date).toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", weekday: "short", month: "2-digit", day: "numeric" }).replace(',', '')
            var html = `${event.organizer_name}, `
            html += `<p>Thank you for volunteering to lead the '${event.group}' ride on ${sd}.</p>\n`
            html += `<p>The ride has now been scheduled and is live on the club calendar and in RideWithGPS. Please use the following link in any emails about the ride:<p>\n`
            html += `<a href="${event.getRideLinkURL()}">${event.name}</a>`
            html += '<p>SCCCC Ride Organization<p>';
            return html;
        }
    }
}()