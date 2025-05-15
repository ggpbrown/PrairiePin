const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendAccountUpdateEmail(toEmail, firstName) {
  try {
    await resend.emails.send({
      from: 'PrairiePin <notifications@prairiepin.ca>',  // You can verify this later
      to: toEmail,
      subject: 'Your PrairiePin Account Was Updated',
      html: `
        <p>Dear ${firstName},</p>
        <p>This is to advise you that an update has been made to your account on PrairiePin.</p>
        <p>If this was not you, please contact our support team at <a href="mailto:support@prairiepin.ca">support@prairiepin.ca</a>.</p>
        <br>
        <p>– The PrairiePin Team</p>
      `
    });
    console.log(`📧 Notification sent to ${toEmail}`);
  } catch (err) {
    console.error('❌ Failed to send account update email:', err);
  }
}

module.exports = { sendAccountUpdateEmail };