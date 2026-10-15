/**
 * LibTrack Email Notification Templates
 * Built following design-system/libtrack/MASTER.md:
 * - Brand Colors: Primary Navy (#1B2A4A), Academic Teal (#0D9488), Amber Alert (#D97706), Red Overdue (#DC2626)
 * - Canvas: #F8FAFC, Card Surface: #FFFFFF, Border: #E2E8F0, Text: #0F172A
 * - HTML Sanitization & Plain Text Alternatives included
 */

/**
 * Escapes HTML characters to prevent XSS injection in email clients
 */
export function escapeHtml(str: string | undefined | null): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export interface BookReminderData {
  memberName: string;
  memberId: string;
  bookTitle: string;
  author: string;
  shelfLocation?: string;
  dueDate: Date;
  daysRemainingOrOverdue: number;
  appBaseUrl?: string;
  cycleNumber?: number;
}

const baseStyles = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: #0F172A;
  line-height: 1.5;
`;

/**
 * Helper to build common branded layout wrapper
 */
function wrapHtml(title: string, badgeText: string, badgeBg: string, badgeColor: string, bodyContent: string, appBaseUrl?: string): string {
  const portalLink = appBaseUrl
    ? `<div style="text-align: center; margin-top: 28px;">
         <a href="${escapeHtml(appBaseUrl)}" style="display: inline-block; background-color: #1B2A4A; color: #FFFFFF; text-decoration: none; font-size: 14px; font-weight: 600; padding: 10px 24px; border-radius: 6px;">Open LibTrack Portal</a>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #F8FAFC; ${baseStyles}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);" cellpadding="0" cellspacing="0" border="0">
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #1B2A4A; padding: 20px 28px; border-bottom: 3px solid #0D9488;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="font-size: 20px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.02em;">LibTrack</span>
                    <span style="font-size: 12px; color: #94A3B8; margin-left: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Central Library</span>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background-color: ${badgeBg}; color: ${badgeColor}; font-size: 11px; font-weight: 600; text-transform: uppercase; padding: 4px 10px; border-radius: 4px; letter-spacing: 0.05em;">
                      ${escapeHtml(badgeText)}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 28px 28px 24px 28px;">
              ${bodyContent}
              ${portalLink}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 16px 28px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B; text-align: center;">
              This is an automated system notification from LibTrack Library Circulation Desk.<br>
              VTU 7th Semester Big Data Engineering Project &bull; Visvesvaraya Technological University
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * 1. Upcoming Due Date Template (DUE_SOON)
 */
export function getDueSoonTemplate(data: BookReminderData): EmailContent {
  const formattedDueDate = data.dueDate.toLocaleDateString('en-IN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const subject = `LibTrack Reminder: "${data.bookTitle}" is due in ${data.daysRemainingOrOverdue} day(s)`;

  const html = wrapHtml(
    'Upcoming Book Due Date',
    'Due Soon',
    '#FEF3C7',
    '#92400E',
    `
      <h2 style="font-size: 18px; font-weight: 600; margin: 0 0 12px 0; color: #1B2A4A;">Hello ${escapeHtml(data.memberName)},</h2>
      <p style="margin: 0 0 20px 0; font-size: 14px; color: #334155;">
        This is a friendly reminder that the library book currently issued to your account (ID: <strong>${escapeHtml(data.memberId)}</strong>) is due for return in <strong>${data.daysRemainingOrOverdue} day(s)</strong>.
      </p>

      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
        <table role="presentation" width="100%" cellpadding="4" cellspacing="0" border="0" style="font-size: 13px;">
          <tr>
            <td width="30%" style="color: #64748B; font-weight: 500;">Title:</td>
            <td style="color: #0F172A; font-weight: 600;">${escapeHtml(data.bookTitle)}</td>
          </tr>
          <tr>
            <td style="color: #64748B; font-weight: 500;">Author:</td>
            <td style="color: #0F172A;">${escapeHtml(data.author)}</td>
          </tr>
          ${data.shelfLocation ? `
          <tr>
            <td style="color: #64748B; font-weight: 500;">Shelf Location:</td>
            <td style="color: #0F172A;">${escapeHtml(data.shelfLocation)}</td>
          </tr>` : ''}
          <tr>
            <td style="color: #64748B; font-weight: 500;">Due Date:</td>
            <td style="color: #D97706; font-weight: 600;">${formattedDueDate}</td>
          </tr>
        </table>
      </div>

      <p style="margin: 0; font-size: 14px; color: #334155;">
        Please return the book to the Central Library circulation desk on or before the due date to avoid overdue penalties.
      </p>
    `,
    data.appBaseUrl
  );

  const text = `Hello ${data.memberName},

This is a friendly reminder from LibTrack that the following book issued to your account (${data.memberId}) is due in ${data.daysRemainingOrOverdue} day(s):

Title: ${data.bookTitle}
Author: ${data.author}
Due Date: ${formattedDueDate}
${data.shelfLocation ? `Shelf Location: ${data.shelfLocation}\n` : ''}
Please return the book to the Central Library circulation counter on or before the due date.

— LibTrack Central Library`;

  return { subject, html, text };
}

/**
 * 2. First Overdue Notice (FIRST_OVERDUE)
 */
export function getFirstOverdueTemplate(data: BookReminderData): EmailContent {
  const formattedDueDate = data.dueDate.toLocaleDateString('en-IN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const subject = `OVERDUE NOTICE: "${data.bookTitle}" is overdue — LibTrack`;

  const html = wrapHtml(
    'Overdue Notice',
    'Overdue',
    '#FEE2E2',
    '#991B1B',
    `
      <h2 style="font-size: 18px; font-weight: 600; margin: 0 0 12px 0; color: #991B1B;">Notice: Overdue Library Material</h2>
      <p style="margin: 0 0 20px 0; font-size: 14px; color: #334155;">
        Dear ${escapeHtml(data.memberName)} (ID: <strong>${escapeHtml(data.memberId)}</strong>),<br><br>
        According to library records, the following material was due on <strong>${formattedDueDate}</strong> and has not yet been checked in. It is now <strong>${data.daysRemainingOrOverdue} day(s) overdue</strong>.
      </p>

      <div style="background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
        <table role="presentation" width="100%" cellpadding="4" cellspacing="0" border="0" style="font-size: 13px;">
          <tr>
            <td width="30%" style="color: #991B1B; font-weight: 500;">Title:</td>
            <td style="color: #0F172A; font-weight: 600;">${escapeHtml(data.bookTitle)}</td>
          </tr>
          <tr>
            <td style="color: #991B1B; font-weight: 500;">Author:</td>
            <td style="color: #0F172A;">${escapeHtml(data.author)}</td>
          </tr>
          <tr>
            <td style="color: #991B1B; font-weight: 500;">Original Due Date:</td>
            <td style="color: #991B1B; font-weight: 600;">${formattedDueDate}</td>
          </tr>
          <tr>
            <td style="color: #991B1B; font-weight: 500;">Days Overdue:</td>
            <td style="color: #DC2626; font-weight: 700;">${data.daysRemainingOrOverdue} days</td>
          </tr>
        </table>
      </div>

      <p style="margin: 0; font-size: 14px; color: #334155;">
        Please return this book immediately to the library circulation desk. Outstanding overdue items may lead to suspension of borrowing privileges and academic clearance holds.
      </p>
    `,
    data.appBaseUrl
  );

  const text = `OVERDUE NOTICE

Dear ${data.memberName} (${data.memberId}),

The following library material issued to you was due on ${formattedDueDate} and is now ${data.daysRemainingOrOverdue} day(s) overdue:

Title: ${data.bookTitle}
Author: ${data.author}
Original Due Date: ${formattedDueDate}
Days Overdue: ${data.daysRemainingOrOverdue}

Please return this book immediately to the Central Library circulation desk. Continued delay may result in borrowing suspension.

— LibTrack Central Library`;

  return { subject, html, text };
}

/**
 * 3. Repeat Overdue Notice (REPEAT_OVERDUE)
 */
export function getRepeatOverdueTemplate(data: BookReminderData): EmailContent {
  const formattedDueDate = data.dueDate.toLocaleDateString('en-IN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const cycle = data.cycleNumber || 1;
  const subject = `URGENT [Reminder #${cycle}]: "${data.bookTitle}" is ${data.daysRemainingOrOverdue} days overdue`;

  const html = wrapHtml(
    'Urgent Overdue Notice',
    `Urgent #${cycle}`,
    '#450A0A',
    '#FECACA',
    `
      <h2 style="font-size: 18px; font-weight: 700; margin: 0 0 12px 0; color: #7F1D1D;">Urgent Overdue Notice (Reminder #${cycle})</h2>
      <p style="margin: 0 0 20px 0; font-size: 14px; color: #334155;">
        Dear ${escapeHtml(data.memberName)},<br><br>
        This is repeat notice #${cycle} regarding an overdue item on your library account (ID: <strong>${escapeHtml(data.memberId)}</strong>). The book remains unreturned after <strong>${data.daysRemainingOrOverdue} days</strong>.
      </p>

      <div style="background-color: #FFF1F2; border: 1px solid #FDA4AF; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
        <table role="presentation" width="100%" cellpadding="4" cellspacing="0" border="0" style="font-size: 13px;">
          <tr>
            <td width="30%" style="color: #881337; font-weight: 500;">Title:</td>
            <td style="color: #0F172A; font-weight: 600;">${escapeHtml(data.bookTitle)}</td>
          </tr>
          <tr>
            <td style="color: #881337; font-weight: 500;">Author:</td>
            <td style="color: #0F172A;">${escapeHtml(data.author)}</td>
          </tr>
          <tr>
            <td style="color: #881337; font-weight: 500;">Original Due Date:</td>
            <td style="color: #881337; font-weight: 600;">${formattedDueDate}</td>
          </tr>
          <tr>
            <td style="color: #881337; font-weight: 500;">Days Overdue:</td>
            <td style="color: #BE123C; font-weight: 700;">${data.daysRemainingOrOverdue} days</td>
          </tr>
        </table>
      </div>

      <p style="margin: 0; font-size: 14px; color: #334155;">
        Please report to the Chief Librarian or return the item immediately. Failure to resolve this will affect semester clearance and academic records.
      </p>
    `,
    data.appBaseUrl
  );

  const text = `URGENT OVERDUE NOTICE (Reminder #${cycle})

Dear ${data.memberName} (${data.memberId}),

This is notice #${cycle} for the unreturned book "${data.bookTitle}".
Due Date: ${formattedDueDate}
Days Overdue: ${data.daysRemainingOrOverdue} days

Please return this book immediately to the Central Library circulation desk.

— LibTrack Central Library`;

  return { subject, html, text };
}

/**
 * 4. Administrator Test Email Template (TEST)
 */
export function getTestEmailTemplate(params: { recipientEmail: string; appBaseUrl?: string; sentAt: Date }): EmailContent {
  const subject = `[LibTrack] SMTP Configuration & Delivery Verification Test`;

  const html = wrapHtml(
    'SMTP Verification Test',
    'Test Mode',
    '#CCFBF1',
    '#0F766E',
    `
      <h2 style="font-size: 18px; font-weight: 600; margin: 0 0 12px 0; color: #1B2A4A;">Email Transport Test Successful</h2>
      <p style="margin: 0 0 20px 0; font-size: 14px; color: #334155;">
        This test message confirms that the <strong>LibTrack Notification Subsystem</strong> is operational and able to dispatch messages to the designated recipient address.
      </p>

      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
        <table role="presentation" width="100%" cellpadding="4" cellspacing="0" border="0" style="font-size: 13px;">
          <tr>
            <td width="35%" style="color: #64748B; font-weight: 500;">Recipient:</td>
            <td style="color: #0F172A; font-weight: 600;">${escapeHtml(params.recipientEmail)}</td>
          </tr>
          <tr>
            <td style="color: #64748B; font-weight: 500;">Dispatched At:</td>
            <td style="color: #0F172A;">${params.sentAt.toISOString()}</td>
          </tr>
          <tr>
            <td style="color: #64748B; font-weight: 500;">Transport Status:</td>
            <td style="color: #0D9488; font-weight: 600;">VERIFIED &amp; ACCEPTED</td>
          </tr>
        </table>
      </div>

      <p style="margin: 0; font-size: 13px; color: #64748B;">
        No further action is required. Automated reminder crons will utilize this transport channel for advance due-date and overdue notifications.
      </p>
    `,
    params.appBaseUrl
  );

  const text = `LibTrack SMTP Configuration & Delivery Verification Test

This test message confirms that the LibTrack notification subsystem is operational.
Recipient: ${params.recipientEmail}
Dispatched At: ${params.sentAt.toISOString()}
Transport Status: VERIFIED & ACCEPTED

— LibTrack Central Library`;

  return { subject, html, text };
}
