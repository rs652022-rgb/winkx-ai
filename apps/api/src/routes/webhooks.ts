import { Router } from 'express';
import prisma from '@winkx/db/src/client';
import { authenticate, requireOrg } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, requireOrg, async (req, res, next) => {
  try {
    const orgId = req.orgMember?.orgId || req.apiKeyOrgId!;
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
