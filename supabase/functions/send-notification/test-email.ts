/**
 * Test script for email notifications
 *
 * Usage:
 * deno run --allow-net --allow-env test-email.ts
 */

import { getEmailTemplate } from './email-templates.ts';

// Test data
const testData = {
  userName: 'Иван Петров',
  title: 'Тестовое уведомление',
  message: 'Это тестовое сообщение для проверки email шаблонов.',
  actionUrl: 'https://app.dataparsedesk.com/test',
  actionText: 'Перейти к приложению',
  metadata: {
    unsubscribeUrl: 'https://app.dataparsedesk.com/settings?tab=notifications',
  },
};

// Generate all template types
console.log('Generating email templates...\n');

const types = ['comment', 'mention', 'report', 'member_added', 'generic'];

for (const type of types) {
  console.log(`\n=== ${type.toUpperCase()} Template ===`);
  const html = getEmailTemplate(type, testData);

  // Save to file
  const filename = `preview-${type}.html`;
  await Deno.writeTextFile(filename, html);
  console.log(`✓ Saved to ${filename}`);
}

console.log('\n✅ All templates generated successfully!');
console.log('\nOpen the HTML files in your browser to preview the emails.');

// Test Resend API (if API key is set)
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const TEST_EMAIL = Deno.env.get('TEST_EMAIL');

if (RESEND_API_KEY && TEST_EMAIL) {
  console.log('\n📧 Testing Resend API...');

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Data Parse Desk <onboarding@resend.dev>',
        to: [TEST_EMAIL],
        subject: 'Test Email from Data Parse Desk',
        html: getEmailTemplate('comment', testData),
      }),
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Email sent successfully!');
      console.log('Email ID:', result.id);
    } else {
      console.error('❌ Failed to send email:');
      console.error(result);
    }
  } catch (error) {
    console.error('❌ Error sending email:', error);
  }
} else {
  console.log('\n💡 To test email sending, set environment variables:');
  console.log('   RESEND_API_KEY=your_api_key');
  console.log('   TEST_EMAIL=your@email.com');
  console.log('   Then run: deno run --allow-net --allow-env test-email.ts');
}
