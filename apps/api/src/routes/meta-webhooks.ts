import { Router } from 'express';
import prisma from '@winkx/db/src/client';
import { logger } from '../lib/logger';

const router = Router();

// Meta webhook verification (GET)
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    logger.info('Meta webhook verified');
    res.status(200).send(challenge);
  } else {
    res.status(403).json({ error: 'Verification failed' });
  }
});

// Meta webhook events (POST)
router.post('/', async (req, res) => {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    if (body.object === 'whatsapp_business_account') {
      await handleWhatsAppWebhook(body);
    } else if (body.object === 'instagram') {
      await handleInstagramWebhook(body);
    } else if (body.object === 'page') {
      await handleFacebookWebhook(body);
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    logger.error('Webhook processing error:', error);
    res.status(200).json({ status: 'ok' }); // Always 200 to Meta
  }
});

async function handleWhatsAppWebhook(body: any) {
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field === 'messages') {
        const value = change.value;
        const wabaId = entry.id;

        // Find channel by WABA ID
        const channel = await prisma.channel.findFirst({
          where: { wabaId, type: 'WHATSAPP' },
        });
        if (!channel) continue;

        // Process incoming messages
        for (const msg of value.messages || []) {
          await processIncomingMessage(channel, {
            externalId: msg.id,
            fromId: msg.from,
            content: msg.text?.body || msg.caption,
            type: msg.type?.toUpperCase() || 'TEXT',
            timestamp: new Date(Number(msg.timestamp) * 1000),
            mediaUrl: msg.image?.link || msg.video?.link || msg.audio?.link,
          });
        }

        // Process status updates
        for (const status of value.statuses || []) {
          await prisma.message.updateMany({
            where: { externalId: status.id },
            data: {
              status: status.status.toUpperCase() === 'DELIVERED' ? 'DELIVERED'
                : status.status.toUpperCase() === 'READ' ? 'READ'
                : status.status.toUpperCase() === 'FAILED' ? 'FAILED'
                : undefined,
              deliveredAt: status.status === 'delivered' ? new Date() : undefined,
              readAt: status.status === 'read' ? new Date() : undefined,
            },
          });
        }
      }
    }
  }
}

async function handleInstagramWebhook(body: any) {
  for (const entry of body.entry || []) {
    const igAccountId = entry.id;
    const channel = await prisma.channel.findFirst({
      where: { igAccountId, type: 'INSTAGRAM' },
    });
    if (!channel) continue;

    for (const messaging of entry.messaging || []) {
      if (messaging.message) {
        await processIncomingMessage(channel, {
          externalId: messaging.message.mid,
          fromId: messaging.sender.id,
          content: messaging.message.text,
          type: 'TEXT',
          timestamp: new Date(messaging.timestamp),
        });
      }
    }
  }
}

async function handleFacebookWebhook(body: any) {
  for (const entry of body.entry || []) {
    const pageId = entry.id;
    const channel = await prisma.channel.findFirst({
      where: { pageId, type: 'FACEBOOK' },
    });
    if (!channel) continue;

    for (const messaging of entry.messaging || []) {
      if (messaging.message) {
        await processIncomingMessage(channel, {
          externalId: messaging.message.mid,
          fromId: messaging.sender.id,
          content: messaging.message.text,
          type: 'TEXT',
          timestamp: new Date(messaging.timestamp),
        });
      }
    }
  }
}

async function processIncomingMessage(channel: any, msgData: {
  externalId: string;
  fromId: string;
  content?: string;
  type: string;
  timestamp: Date;
  mediaUrl?: string;
}) {
  // Upsert contact
  let contact = await prisma.contact.findFirst({
    where: { orgId: channel.orgId, externalId: msgData.fromId, channelType: channel.type },
  });

  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        orgId: channel.orgId,
        externalId: msgData.fromId,
        channelType: channel.type,
        source: channel.type.toLowerCase(),
      },
    });
  }

  // Upsert conversation
  let conversation = await prisma.conversation.findFirst({
    where: { orgId: channel.orgId, channelId: channel.id, contactId: contact.id, status: 'OPEN' },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        orgId: channel.orgId,
        channelId: channel.id,
        contactId: contact.id,
        status: 'OPEN',
        lastMessageAt: msgData.timestamp,
      },
    });
  }

  // Check for duplicate
  const existing = await prisma.message.findFirst({ where: { externalId: msgData.externalId } });
  if (existing) return;

  // Create message
  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      orgId: channel.orgId,
      externalId: msgData.externalId,
      direction: 'INBOUND',
      type: msgData.type as any,
      content: msgData.content,
      mediaUrl: msgData.mediaUrl,
      status: 'DELIVERED',
      sentAt: msgData.timestamp,
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: msgData.timestamp, isRead: false },
  });

  logger.info(`Incoming message from ${msgData.fromId} on ${channel.type}`);

  // TODO: Trigger flow engine if keyword matches
  // await flowEngine.processIncomingMessage(message, conversation, channel);
}

export default router;
