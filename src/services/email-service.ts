// ============================================
// Email Service - Stub Implementation
// ============================================

import { createLogger } from '../utils/logger';

const logger = createLogger();

export interface EmailMessage {
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  attachments?: Array<{ filename: string; content: string }>;
}

export interface InboxMessage {
  from: string;
  subject: string;
  body: string;
  receivedAt: string;
}

/**
 * Send an email (stub implementation - logs to console)
 * Replace with real Gmail API / SendGrid implementation
 */
export async function sendEmail(message: EmailMessage): Promise<{ success: boolean; messageId: string }> {
  const provider = process.env.EMAIL_PROVIDER || 'stub';

  if (provider === 'stub') {
    logger.info(`📧 [STUB] Email sent:`, {
      action: 'email_sent',
      data: {
        to: message.to,
        cc: message.cc,
        subject: message.subject,
        bodyPreview: message.body.substring(0, 200) + '...',
      },
    });

    console.log('\n' + '='.repeat(60));
    console.log('📧 EMAIL (STUB MODE)');
    console.log('='.repeat(60));
    console.log(`To: ${message.to.join(', ')}`);
    if (message.cc?.length) console.log(`CC: ${message.cc.join(', ')}`);
    console.log(`Subject: ${message.subject}`);
    console.log('-'.repeat(60));
    console.log(message.body);
    console.log('='.repeat(60) + '\n');

    return {
      success: true,
      messageId: `stub_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    };
  }

  // TODO: Implement real email providers
  // if (provider === 'sendgrid') { ... }
  // if (provider === 'gmail') { ... }

  throw new Error(`Email provider "${provider}" not implemented yet`);
}

/**
 * Check inbox for new messages (stub implementation)
 * Replace with real Gmail API implementation
 */
export async function checkInbox(
  filterEmail: string,
  sinceDate?: string
): Promise<InboxMessage[]> {
  const provider = process.env.EMAIL_PROVIDER || 'stub';

  if (provider === 'stub') {
    logger.info(`📬 [STUB] Checking inbox for messages from ${filterEmail}`, {
      action: 'inbox_check',
      data: { filterEmail, sinceDate },
    });

    // Return empty in stub mode - no real emails to check
    return [];
  }

  // TODO: Implement real inbox checking
  throw new Error(`Email provider "${provider}" not implemented for inbox checking`);
}
