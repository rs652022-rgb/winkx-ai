import { Router } from 'express';
import { z } from 'zod';
import prisma from '@winkx/db/src/client';
import { authenticate, requireOrg, requireRole } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/channels:
 *   get:
 *     tags: [Channels]
 *     summary: Get all connected channels for an org
 */
router.get('/', authenticate, requireOrg, async (req, res, next) => {
  try {
    const orgId = req.orgMember?.orgId || req.apiKeyOrgId!;

    const channels = await prisma.channel.findMany({
      where: { orgId },
      select: {
        id: true, type: true, status: true, name: true,
        phoneNumber: true, pageId: true, igAccountId: true,
        isActive: true, connectedAt: true, createdAt: true,
        _count: { select: { conversations: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ channels });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/channels/connect/whatsapp:
 *   post:
 *     tags: [Channels]
 *     summary: Connect a WhatsApp Business channel
 */
router.post('/connect/whatsapp', authenticate, requireOrg, requireRole('ADMIN', 'MEMBER'), async (req, res, next) => {
  try {
    const orgId = req.orgMember!.orgId;

    const data = z.object({
      name: z.string(),
      phoneNumber: z.string(),
      wabaId: z.string(),
      accessToken: z.string(),
    }).parse(req.body);

    // Verify with Meta API
    const verifyResponse = await fetch(
      `https://graph.facebook.com/v18.0/${data.wabaId}?access_token=${data.accessToken}`
    );

    if (!verifyResponse.ok) {
      return res.status(400).json({ error: 'Invalid WhatsApp Business Account credentials' });
    }

    const channel = await prisma.channel.upsert({
      where: { orgId_externalId: { orgId, externalId: data.wabaId } },
      create: {
        orgId,
        type: 'WHATSAPP',
        status: 'CONNECTED',
        name: data.name,
        externalId: data.wabaId,
        wabaId: data.wabaId,
        phoneNumber: data.phoneNumber,
        accessToken: data.accessToken,
        connectedAt: new Date(),
      },
      update: {
        status: 'CONNECTED',
        accessToken: data.accessToken,
        phoneNumber: data.phoneNumber,
        connectedAt: new Date(),
      },
    });

    res.json({ channel });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/channels/connect/instagram:
 *   post:
 *     tags: [Channels]
 *     summary: Connect an Instagram Business account
 */
router.post('/connect/instagram', authenticate, requireOrg, requireRole('ADMIN', 'MEMBER'), async (req, res, next) => {
  try {
    const orgId = req.orgMember!.orgId;

    const data = z.object({
      name: z.string(),
      igAccountId: z.string(),
      pageId: z.string(),
      accessToken: z.string(),
    }).parse(req.body);

    // Verify with Meta API
    const verifyResponse = await fetch(
      `https://graph.facebook.com/v18.0/${data.igAccountId}?fields=id,name,username&access_token=${data.accessToken}`
    );

    if (!verifyResponse.ok) {
      return res.status(400).json({ error: 'Invalid Instagram Business account credentials' });
    }

    const igData = await verifyResponse.json();

    const channel = await prisma.channel.upsert({
      where: { orgId_externalId: { orgId, externalId: data.igAccountId } },
      create: {
        orgId,
        type: 'INSTAGRAM',
        status: 'CONNECTED',
        name: data.name || igData.name,
        externalId: data.igAccountId,
        igAccountId: data.igAccountId,
        pageId: data.pageId,
        accessToken: data.accessToken,
        connectedAt: new Date(),
        metadata: { username: igData.username },
      },
      update: {
        status: 'CONNECTED',
        accessToken: data.accessToken,
        connectedAt: new Date(),
      },
    });

    res.json({ channel });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/channels/connect/facebook:
 *   post:
 *     tags: [Channels]
 *     summary: Connect a Facebook Page
 */
router.post('/connect/facebook', authenticate, requireOrg, requireRole('ADMIN', 'MEMBER'), async (req, res, next) => {
  try {
    const orgId = req.orgMember!.orgId;

    const data = z.object({
      name: z.string(),
      pageId: z.string(),
      accessToken: z.string(),
    }).parse(req.body);

    const verifyResponse = await fetch(
      `https://graph.facebook.com/v18.0/${data.pageId}?fields=id,name,fan_count&access_token=${data.accessToken}`
    );

    if (!verifyResponse.ok) {
      return res.status(400).json({ error: 'Invalid Facebook Page credentials' });
    }

    const pageData = await verifyResponse.json();

    const channel = await prisma.channel.upsert({
      where: { orgId_externalId: { orgId, externalId: data.pageId } },
      create: {
        orgId,
        type: 'FACEBOOK',
        status: 'CONNECTED',
        name: data.name || pageData.name,
        externalId: data.pageId,
        pageId: data.pageId,
        accessToken: data.accessToken,
        connectedAt: new Date(),
        metadata: { fanCount: pageData.fan_count },
      },
      update: {
        status: 'CONNECTED',
        accessToken: data.accessToken,
        connectedAt: new Date(),
      },
    });

    res.json({ channel });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/channels/{channelId}:
 *   delete:
 *     tags: [Channels]
 *     summary: Disconnect a channel
 */
router.delete('/:channelId', authenticate, requireOrg, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const orgId = req.orgMember!.orgId;

    await prisma.channel.update({
      where: { id: req.params.channelId, orgId },
      data: { status: 'DISCONNECTED', accessToken: null, isActive: false },
    });

    res.json({ message: 'Channel disconnected' });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/channels/{channelId}/reconnect:
 *   post:
 *     tags: [Channels]
 *     summary: Reconnect a disconnected channel
 */
router.post('/:channelId/reconnect', authenticate, requireOrg, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const orgId = req.orgMember!.orgId;
    const { accessToken } = z.object({ accessToken: z.string() }).parse(req.body);

    const channel = await prisma.channel.update({
      where: { id: req.params.channelId, orgId },
      data: {
        status: 'CONNECTED',
        accessToken,
        isActive: true,
        connectedAt: new Date(),
      },
    });

    res.json({ channel });
  } catch (error) {
    next(error);
  }
});

export default router;
