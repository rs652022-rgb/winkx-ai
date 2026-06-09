import { Router } from 'express';
import prisma from '@winkx/db/src/client';
import { authenticate, requireSuperAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate, requireSuperAdmin);

router.get('/stats', async (req, res, next) => {
  try {
    const [users, orgs, channels, flows, campaigns, messages, leads, subscriptions] = await Promise.all([
      prisma.user.count(),
      prisma.organization.count(),
      prisma.channel.count({ where: { status: 'CONNECTED' } }),
      prisma.flow.count({ where: { status: 'ACTIVE' } }),
      prisma.campaign.count(),
      prisma.message.count(),
      prisma.lead.count(),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    ]);

    res.json({ stats: { users, orgs, channels, flows, campaigns, messages, leads, subscriptions } });
  } catch (error) { next(error); }
});

router.get('/users', async (req, res, next) => {
  try {
    const { search, page = '1', limit = '25' } = req.query;
    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { firstName: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, email: true, firstName: true, lastName: true, avatar: true,
          isActive: true, isSuperAdmin: true, createdAt: true, lastLoginAt: true,
          _count: { select: { orgMemberships: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, pagination: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) { next(error); }
});

router.patch('/users/:userId', async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.userId },
      data: {
        isActive: req.body.isActive,
        isSuperAdmin: req.body.isSuperAdmin,
      },
    });
    res.json({ user });
  } catch (error) { next(error); }
});

router.get('/orgs', async (req, res, next) => {
  try {
    const { plan, page = '1', limit = '25' } = req.query;
    const where: any = {};
    if (plan) where.plan = plan;

    const [orgs, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        include: {
          _count: { select: { members: true, channels: true, flows: true } },
          subscription: { include: { plan: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.organization.count({ where }),
    ]);

    res.json({ orgs, pagination: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) { next(error); }
});

router.get('/audit-logs', async (req, res, next) => {
  try {
    const { orgId, page = '1', limit = '50' } = req.query;
    const logs = await prisma.auditLog.findMany({
      where: orgId ? { orgId: orgId as string } : {},
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });
    res.json({ logs });
  } catch (error) { next(error); }
});

export default router;
