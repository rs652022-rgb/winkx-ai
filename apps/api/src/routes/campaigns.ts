import { Router } from 'express';
import { z } from 'zod';
import prisma from '@winkx/db/src/client';
import { authenticate, requireOrg, getRequestOrgId } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, requireOrg, async (req, res, next) => {
  try {
    const orgId = getRequestOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization ID is required' });
    const { status, type, page = '1', limit = '20' } = req.query;

    const where: any = { orgId };
    if (status) where.status = status;
    if (type) where.type = type;

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        include: {
          channelRef: { select: { id: true, type: true, name: true } },
          _count: { select: { messages: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.campaign.count({ where }),
    ]);

    res.json({ campaigns, pagination: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) { next(error); }
});

router.post('/', authenticate, requireOrg, async (req, res, next) => {
  try {
    const orgId = getRequestOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization ID is required' });
    const data = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      type: z.enum(['BROADCAST', 'SEQUENCE', 'DRIP', 'AB_TEST']).default('BROADCAST'),
      channel: z.enum(['WHATSAPP', 'INSTAGRAM', 'FACEBOOK', 'ALL']).default('WHATSAPP'),
      channelId: z.string().optional(),
      scheduledAt: z.string().optional(),
      audience: z.any().optional(),
      content: z.any(),
      abTestConfig: z.any().optional(),
      tags: z.array(z.string()).default([]),
    }).parse(req.body);

    const campaign = await prisma.campaign.create({
      data: {
        orgId,
        ...data,
        type: data.type as any,
        channel: data.channel as any,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      } as any,
    });
    res.status(201).json({ campaign });
  } catch (error) { next(error); }
});

router.get('/:campaignId', authenticate, requireOrg, async (req, res, next) => {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: req.params.campaignId },
      include: {
        channelRef: true,
        analytics: { orderBy: { date: 'desc' }, take: 30 },
        _count: { select: { messages: true } },
      },
    });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json({ campaign });
  } catch (error) { next(error); }
});

router.patch('/:campaignId', authenticate, requireOrg, async (req, res, next) => {
  try {
    const data = z.object({
      name: z.string().optional(),
      status: z.enum(['DRAFT', 'SCHEDULED', 'RUNNING', 'PAUSED', 'CANCELLED']).optional(),
      scheduledAt: z.string().optional(),
      content: z.any().optional(),
      audience: z.any().optional(),
    }).parse(req.body);

    const campaign = await prisma.campaign.update({
      where: { id: req.params.campaignId },
      data: {
        ...data,
        status: data.status as any,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      },
    });
    res.json({ campaign });
  } catch (error) { next(error); }
});

router.delete('/:campaignId', authenticate, requireOrg, async (req, res, next) => {
  try {
    await prisma.campaign.delete({ where: { id: req.params.campaignId } });
    res.json({ message: 'Campaign deleted' });
  } catch (error) { next(error); }
});

router.post('/:campaignId/launch', authenticate, requireOrg, async (req, res, next) => {
  try {
    const campaign = await prisma.campaign.findUnique({ where: { id: req.params.campaignId } });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (campaign.status !== 'DRAFT' && campaign.status !== 'PAUSED') {
      return res.status(400).json({ error: 'Campaign cannot be launched in its current state' });
    }

    const updated = await prisma.campaign.update({
      where: { id: req.params.campaignId },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    // TODO: Enqueue campaign messages via BullMQ worker
    // await campaignQueue.add('process-campaign', { campaignId: campaign.id });

    res.json({ campaign: updated, message: 'Campaign launched' });
  } catch (error) { next(error); }
});

router.get('/:campaignId/analytics', authenticate, requireOrg, async (req, res, next) => {
  try {
    const analytics = await prisma.campaignAnalytic.findMany({
      where: { campaignId: req.params.campaignId },
      orderBy: { date: 'asc' },
    });

    const totals = analytics.reduce((acc, a) => ({
      sent: acc.sent + a.sent,
      delivered: acc.delivered + a.delivered,
      read: acc.read + a.read,
      clicked: acc.clicked + a.clicked,
      replied: acc.replied + a.replied,
      failed: acc.failed + a.failed,
      converted: acc.converted + a.converted,
      revenue: acc.revenue + a.revenue,
    }), { sent: 0, delivered: 0, read: 0, clicked: 0, replied: 0, failed: 0, converted: 0, revenue: 0 });

    res.json({ analytics, totals });
  } catch (error) { next(error); }
});

export default router;
