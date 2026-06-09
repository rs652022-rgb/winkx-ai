import { Router } from 'express';
import prisma from '@winkx/db/src/client';
import { authenticate, requireOrg, getRequestOrgId } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, requireOrg, async (req, res, next) => {
  try {
    const orgId = getRequestOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization ID is required' });
    const webhooks = await prisma.webhook.findMany({
      where: { orgId },
      include: {
        logs: { orderBy: { createdAt: 'desc' }, take: 5 },
        _count: { select: { logs: true } },
      },
    });
    res.json({ webhooks });
  } catch (error) { next(error); }
});

export default router;
