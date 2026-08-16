// @ts-check
/**
 * diagnose-announcement-reply-behavior.js
 *
 * GAS-only diagnostic utility for testing how MailApp handles reply behavior.
 *
 * PURPOSE:
 * ========
 * Sends a small set of test emails so you can inspect what recipients actually
 * see for:
 * 1. No replyTo option set
 * 2. Explicit replyTo set
 * 3. noReply: true
 *
 * USAGE:
 * ======
 * 1. Deploy to GAS via `npm run dev:push`
 * 2. In the GAS editor, run `diagnoseAnnouncementReplyBehavior()`
 * 3. Prefer sending to a mailbox different from the sender's mailbox
 * 4. Inspect each message using Gmail "Show original" and by clicking Reply
 *
 * NOTES:
 * ======
 * - This must run in Apps Script to test real mail delivery behavior.
 * - `noReply: true` only works for Google Workspace accounts that support it.
 * - If you send to yourself, Gmail may make some behaviors harder to interpret.
 */

/* istanbul ignore file - GAS-only diagnostic script */

/**
 * Send three diagnostic emails to observe reply behavior.
 *
 * @param {string} [recipientEmail] - Target mailbox for the diagnostic emails.
 * Defaults to the active user email.
 * @param {string} [explicitReplyTo] - Reply-to address to test in the explicit variant.
 * Defaults to the active user email.
 * @returns {{recipientEmail: string, explicitReplyTo: string, subjects: string[]}}
 */
function diagnoseAnnouncementReplyBehavior(recipientEmail, explicitReplyTo) {
    const activeUserEmail = Session.getActiveUser().getEmail();
    const targetEmail = (recipientEmail || activeUserEmail || '').trim();
    const replyToEmail = (explicitReplyTo || activeUserEmail || '').trim();

    if (!targetEmail) {
        throw new Error('No recipient email available. Pass recipientEmail explicitly.');
    }

    if (!replyToEmail) {
        throw new Error('No explicitReplyTo email available. Pass explicitReplyTo explicitly.');
    }

    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    const subjects = [
        `[Reply Diagnostic] Baseline no replyTo ${timestamp}`,
        `[Reply Diagnostic] Explicit replyTo ${timestamp}`,
        `[Reply Diagnostic] noReply true ${timestamp}`
    ];

    _sendReplyDiagnosticEmail_(targetEmail, subjects[0], [
        'Variant: baseline',
        'Options: no replyTo, no noReply',
        `Sender executing script: ${activeUserEmail || '(unknown)'}`,
        'Expected: reply likely goes to sender mailbox'
    ].join('\n'), {
        name: 'Ride Scheduler Diagnostic'
    });

    _sendReplyDiagnosticEmail_(targetEmail, subjects[1], [
        'Variant: explicit replyTo',
        `replyTo: ${replyToEmail}`,
        `Sender executing script: ${activeUserEmail || '(unknown)'}`,
        'Expected: reply should target the explicit reply-to address'
    ].join('\n'), {
        name: 'Ride Scheduler Diagnostic',
        replyTo: replyToEmail
    });

    _sendReplyDiagnosticEmail_(targetEmail, subjects[2], [
        'Variant: noReply true',
        'Options: noReply=true, no replyTo',
        `Sender executing script: ${activeUserEmail || '(unknown)'}`,
        'Expected: reply should be discouraged or unavailable if Workspace supports noReply'
    ].join('\n'), {
        name: 'Ride Scheduler Diagnostic',
        noReply: true
    });

    console.log('=== Reply Behavior Diagnostic Sent ===');
    console.log(`Recipient: ${targetEmail}`);
    console.log(`Explicit replyTo test value: ${replyToEmail}`);
    subjects.forEach((subject) => console.log(`Subject: ${subject}`));
    console.log('Inspect each received email in Gmail using Show original and Reply.');

    return {
        recipientEmail: targetEmail,
        explicitReplyTo: replyToEmail,
        subjects: subjects
    };
}

/**
 * Convenience wrapper that uses the active user for both recipient and reply-to.
 *
 * @returns {{recipientEmail: string, explicitReplyTo: string, subjects: string[]}}
 */
function diagnoseAnnouncementReplyBehaviorToSelf() {
    return diagnoseAnnouncementReplyBehavior();
}

/**
 * @param {string} recipientEmail
 * @param {string} subject
 * @param {string} body
 * @param {{name: string, replyTo?: string, noReply?: boolean}} options
 * @returns {void}
 */
function _sendReplyDiagnosticEmail_(recipientEmail, subject, body, options) {
    MailApp.sendEmail({
        to: recipientEmail,
        subject: subject,
        body: body,
        name: options.name,
        replyTo: options.replyTo,
        noReply: options.noReply
    });
}