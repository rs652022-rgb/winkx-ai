import { Router } from 'express';
import { z } from 'zod';
import prisma from '@winkx/db/src/client';
import { authenticate, requireOrg, getRequestOrgId } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/inbox/conversations:
 *   get:
 *     tags: [Inbox]
 *     summary: Get conversations for the inbox
 */
router.get('/conversations', authenticate, requireOrg, async (req, res, next) => {
  try {
    const orgId = getRequestOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization ID is required' });
    const { status, channelId, assignedToId, search, page = '1', limit = '20' } = req.query;

    const where: any = { orgId };
    if (status) where.status = status;
    if (channelId) where.channelId = channelId as string;
    if (assignedToId) where.assignedToId = assignedToId as string;
    if (search) {
      where.OR = [
        { contact: { firstName: { contains: search as string, mode: 'insensitive' } } },
        { contact: { lastName: { contains: search as string, mode: 'insensitive' } } },
        { contact: { phone: { contains: search as string } } },
        { contact: { username: { contains: search as string, mode: 'insensitive' } } },
      ];
    }

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          contact: {
            select: { id: true, firstName: true, lastName: true, avatar: true, phone: true, username: true },
          },
          channel: { select: { id: true, type: true, name: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true, avatar: true } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { content: true, type: true, direction: true, createdAt: true, status: true },
          },
        },
        orderBy: { lastMessageAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.conversation.count({ where }),
    ]);

    res.json({
      conversations,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/inbox/conversations/{conversationId}:
 *   get:
 *     tags: [Inbox]
 *     summary: Get a single conversation with messages
 */
router.get('/conversations/:conversationId', authenticate, requireOrg, async (req, res, next) => {
  try {
    const { page = '1', limit = '50' } = req.query;

    const conversation = await prisma.conversation.findUnique({
      where: { id: req.params.conversationId },
      include: {
        contact: true,
        channel: true,
        assignedTo: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        notes: true,
      },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const [messages, totalMessages] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId: req.params.conversationId },
        include: {
          sentBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        },
        orderBy: { createdAt: 'asc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.message.count({ where: { conversationId: req.params.conversationId } }),
    ]);

    // Mark as read
    await prisma.conversation.update({
      where: { id: req.params.conversationId },
      data: { isRead: true },
    });

    res.json({
      conversation,
      messages,
      pagination: { total: totalMessages, page: Number(page), limit: Number(limit) },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/inbox/conversations/{conversationId}/messages:
 *   post:
 *     tags: [Inbox]
 *     summary: Send a message in a conversation
 */
router.post('/conversations/:conversationId/messages', authenticate, requireOrg, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const data = z.object({
      content: z.string().min(1).optional(),
      type: z.string().default('TEXT'),
      mediaUrl: z.string().url().optional(),
      mediaCaption: z.string().optional(),
      metadata: z.any().optional(),
    }).parse(req.body);

    const conversation = await prisma.conversation.findUnique({
      where: { id: req.params.conversationId },
      include: { channel: true },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Send via appropriate platform API
    const { sendMessage } = await import('../services/messaging');
    const result = await sendMessage(conversation, data as any, req.user.id);

    const message = await prisma.message.create({
      data: {
        conversationId: req.params.conversationId,
        orgId: conversation.orgId,
        direction: 'OUTBOUND',
        type: data.type as any,
        content: data.content,
        mediaUrl: data.mediaUrl,
        mediaCaption: data.mediaCaption,
        status: result.success ? 'SENT' : 'FAILED',
        sentById: req.user.id,
        sentAt: new Date(),
        externalId: result.messageId,
        failureReason: result.error,
      },
      include: {
        sentBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
    });

    await prisma.conversation.update({
      where: { id: req.params.conversationId },
      data: { lastMessageAt: new Date() },
    });

    // Emit via socket
    const io = req.app.get('io');
    io?.to(`org:${conversation.orgId}`).emit('message:new', { message, conversationId: conversation.id });

    res.status(201).json({ message });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/inbox/conversations/{conversationId}/assign:
 *   post:
 *     tags: [Inbox]
 *     summary: Assign conversation to an agent
 */
router.post('/conversations/:conversationId/assign', authenticate, requireOrg, async (req, res, next) => {
  try {
    const { agentId } = z.object({ agentId: z.string().nullable() }).parse(req.body);

    const conversation = await prisma.conversation.update({
      where: { id: req.params.conversationId },
      data: { assignedToId: agentId },
    });

    res.json({ conversation });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/inbox/conversations/{conversationId}/status:
 *   patch:
 *     tags: [Inbox]
 *     summary: Update conversation status
 */
router.patch('/conversations/:conversationId/status', authenticate, requireOrg, async (req, res, next) => {
  try {
    const { status } = z.object({
      status: z.enum(['OPEN', 'CLOSED', 'PENDING', 'SNOOZED', 'SPAM']),
    }).parse(req.body);

    const conversation = await prisma.conversation.update({
      where: { id: req.params.conversationId },
      data: {
        status: status as any,
        closedAt: status === 'CLOSED' ? new Date() : undefined,
      },
    });

    res.json({ conversation });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/inbox/conversations/{conversationId}/notes:
 *   post:
 *     tags: [Inbox]
 *     summary: Add internal note to conversation
 */
router.post('/conversations/:conversationId/notes', authenticate, requireOrg, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const { content } = z.object({ content: z.string().min(1) }).parse(req.body);

    const note = await prisma.internalNote.create({
      data: {
        conversationId: req.params.conversationId,
        content,
        authorId: req.user.id,
      },
    });

    res.status(201).json({ note });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/inbox/stats:
 *   get:
 *     tags: [Inbox]
 *     summary: Get inbox statistics
 */
router.get('/stats', authenticate, requireOrg, async (req, res, next) => {
  try {
    const orgId = getRequestOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization ID is required' });

    const [total, open, pending, closed, unread] = await Promise.all([
      prisma.conversation.count({ where: { orgId } }),
      prisma.conversation.count({ where: { orgId, status: 'OPEN' } }),
      prisma.conversation.count({ where: { orgId, status: 'PENDING' } }),
      prisma.conversation.count({ where: { orgId, status: 'CLOSED' } }),
      prisma.conversation.count({ where: { orgId, isRead: false } }),
    ]);

    res.json({ stats: { total, open, pending, closed, unread } });
  } catch (error) {
    next(error);
  }
});

export default router;
