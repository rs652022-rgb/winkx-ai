import { logger } from '../lib/logger';

interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface WhatsAppApiResponse {
  error?: {
    message: string;
  };
  messages?: Array<{
    id: string;
  }>;
}

interface InstagramApiResponse {
  error?: {
    message: string;
  };
  message_id?: string;
}

export async function sendMessage(
  conversation: any,
  messageData: {
    content?: string;
    type: string;
    mediaUrl?: string;
    mediaCaption?: string;
    metadata?: any;
  },
  sentById: string
): Promise<SendMessageResult> {
  const channel = conversation.channel;

  try {
    switch (channel.type) {
      case 'WHATSAPP':
        return await sendWhatsAppMessage(channel, conversation, messageData);
      case 'INSTAGRAM':
        return await sendInstagramMessage(channel, conversation, messageData);
      case 'FACEBOOK':
      case 'FACEBOOK_MESSENGER':
        return await sendFacebookMessage(channel, conversation, messageData);
      default:
        return { success: false, error: `Unsupported channel type: ${channel.type}` };
    }
  } catch (error: any) {
    logger.error('Failed to send message:', error);
    return { success: false, error: error.message };
  }
}

async function sendWhatsAppMessage(
  channel: any,
  conversation: any,
  messageData: any
): Promise<SendMessageResult> {
  try {
    const url = `https://graph.facebook.com/v18.0/${channel.phoneNumber}/messages`;

    const body: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: conversation.contact.phone,
    };

    if (messageData.type === 'TEXT' || !messageData.type) {
      body.type = 'text';
      body.text = { body: messageData.content, preview_url: true };
    } else if (messageData.type === 'IMAGE') {
      body.type = 'image';
      body.image = { link: messageData.mediaUrl, caption: messageData.mediaCaption };
    } else if (messageData.type === 'DOCUMENT') {
      body.type = 'document';
      body.document = { link: messageData.mediaUrl, caption: messageData.mediaCaption };
    } else if (messageData.type === 'AUDIO') {
      body.type = 'audio';
      body.audio = { link: messageData.mediaUrl };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${channel.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = (await response.json()) as WhatsAppApiResponse;
      return { success: false, error: error.error?.message || 'Failed to send message' };
    }

    const result = (await response.json()) as WhatsAppApiResponse;
    return { success: true, messageId: result.messages?.[0]?.id };
  } catch (error: any) {
    logger.error('WhatsApp API invocation failed:', error);
    return { success: false, error: error.message || String(error) };
  }
}

async function sendInstagramMessage(
  channel: any,
  conversation: any,
  messageData: any
): Promise<SendMessageResult> {
  try {
    const url = `https://graph.facebook.com/v18.0/me/messages`;

    const body: any = {
      recipient: { id: conversation.contact.externalId },
      message: {},
    };

    if (messageData.content) {
      body.message.text = messageData.content;
    } else if (messageData.mediaUrl) {
      body.message.attachment = {
        type: messageData.type === 'IMAGE' ? 'image' : 'file',
        payload: { url: messageData.mediaUrl, is_reusable: true },
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${channel.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = (await response.json()) as InstagramApiResponse;
      return { success: false, error: error.error?.message || 'Failed to send message' };
    }

    const result = (await response.json()) as InstagramApiResponse;
    return { success: true, messageId: result.message_id };
  } catch (error: any) {
    logger.error('Instagram API invocation failed:', error);
    return { success: false, error: error.message || String(error) };
  }
}

async function sendFacebookMessage(
  channel: any,
  conversation: any,
  messageData: any
): Promise<SendMessageResult> {
  return sendInstagramMessage(channel, conversation, messageData);
}
