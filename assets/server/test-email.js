// ============================================================================
// test-email.js — "does my email setup actually work?"
// ----------------------------------------------------------------------------
// Run it with:  npm run test:email
//
// It sends a real test message through the SAME code path a live order uses.
// By default it goes to the store inbox (NOTIFY_EMAIL). Pass a second address
// to also check that a customer copy arrives:
//
//   npm run test:email -- someone@example.com
//
// If EMAIL_PROVIDER is not set the message is only printed to the terminal,
// which is a quick way to preview the email without sending anything.
// ============================================================================

const mailer = require('./lib/mailer');
const brand = require('./lib/brand');

const storeAddress = mailer.storeEmail();
const alsoTo = process.argv[2] || '';

const subject = 'Evora — test email (email setup is working)';
const text = [
  'Hi,',
  '',
  'This is a test message from the Evora backend.',
  '',
  'If you are reading this in your inbox, your email settings are correct:',
  '  • new orders will arrive here',
  '  • complaints will arrive here (with the customer as the reply-to address)',
  '  • customers will receive their order confirmation',
  '',
  'Sent at: ' + new Date().toString(),
  '',
  '— Evora'
].join('\n');

const html = [
  '<!DOCTYPE html>',
  '<html lang="en"><head><meta charset="UTF-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  '<title>' + subject + '</title></head>',
  '<body style="margin:0; padding:0; background:#f4f4f5; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Arial, sans-serif; color:#1f2937;">',
  '  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5; padding:32px 16px;">',
  '    <tr><td align="center">',
  '      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px; background:#ffffff; border-radius:12px; overflow:hidden;">',
  '        <tr><td style="padding:28px 28px 0 28px;">',
  '          ' + brand.logoHtml({ height: 40 }),
  '        </td></tr>',
  '        <tr><td style="padding:22px 28px 28px 28px;">',
  '          <h1 style="margin:0; font-size:20px; font-weight:700; color:#111827;">Email setup is working</h1>',
  '          <p style="margin:12px 0 0 0; color:#4b5563; font-size:14px; line-height:1.6;">',
  '            New orders and complaints will arrive here, and customers will',
  '            receive their order confirmation.',
  '          </p>',
  '          <p style="margin:16px 0 0 0; color:#9ca3af; font-size:12px;">Sent at ' + new Date().toString() + '</p>',
  '        </td></tr>',
  '      </table>',
  '    </td></tr>',
  '  </table>',
  '</body></html>'
].join('\n');

async function main() {
  console.log('');
  mailer.describeStatus().forEach(function (line) { console.log(line); });
  console.log('');

  if (!process.env.EMAIL_PROVIDER) {
    console.log('No EMAIL_PROVIDER set — showing what would be sent, not sending it.');
    console.log('');
  }

  const result = await mailer.sendEmailTo(storeAddress, subject, text, html, {
    replyTo: alsoTo || undefined
  });

  if (alsoTo) {
    await mailer.sendEmailTo(alsoTo, subject, text, html, {
      replyTo: storeAddress
    });
  }

  console.log('');
  if (result.sent) {
    console.log('✅  Test email sent to ' + storeAddress + (alsoTo ? ' and ' + alsoTo : '') + '.');
    console.log('    Check that inbox (and spam) to be sure it arrived.');
  } else if (result.reason === 'no-provider') {
    console.log('ℹ️   Nothing was sent (no provider configured). Set EMAIL_PROVIDER in .env.');
  } else {
    console.log('❌  Sending failed: ' + result.reason);
    console.log('');
    console.log('   Common causes:');
    console.log('   • GMAIL_APP_PASSWORD is missing or wrong (it is NOT your Gmail password)');
    console.log('   • 2-Step Verification is not enabled on the Gmail account');
    console.log('   • The App Password was typed with spaces — remove the spaces');
    console.log('   • Your network/ISP blocks outbound port 587');
    if (process.env.EMAIL_PROVIDER === 'brevo') {
      console.log('');
      console.log('   Brevo-specific:');
      if (process.env.BREVO_API_KEY) {
        console.log('   • BREVO_API_KEY is wrong, revoked, or lacks access — regenerate it under');
        console.log('     SMTP & API > API Keys');
      } else {
        console.log('   • BREVO_SMTP_USER / BREVO_SMTP_KEY are from SMTP & API > SMTP,');
        console.log('     not your Brevo email and password');
        console.log('   • Use BREVO_API_KEY instead if your host blocks SMTP (Render free does)');
        console.log('   • Use port 465 if 587 is blocked (set BREVO_SMTP_PORT=465)');
      }
      console.log('   • BREVO_SENDER_EMAIL must be added and verified under Senders & IPs');
    }
  }
  console.log('');
}

main().catch(function (err) {
  console.error('Test email failed:', err);
  process.exit(1);
});
