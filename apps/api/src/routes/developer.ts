import { Router } from 'express';
import { z } from 'zod';
import prisma from '@winkx/db/src/client';
import { authenticate, requireOrg } from '../middleware/auth';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const router = Router();

// API KEYS
router.get('/keys', authenticate, requireOrg, async (req, res, next) => {
  try {
    const orgId = req.orgMember?.orgId || req.apiKeyOrgId!;
    const keys = await prisma.apiKey.findMany({
      where: { orgId },
      select: {
        id: true, name: true, keyPrefix: true, permissions: true,
        lastUsedAt: true, expiresAt: true, isActive: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ keys });
  } catch (error) { next(error); }
});

router.post('/keys', authenticate, requireOrg, async (req, res, next) => {
  try {
    const orgId = req.orgMember!.orgId;
    const { name, permissions, expiresAt } = z.object({
      name: z.string().min(1),
      permissions: z.array(z.string()).default(['read']),
      expiresAt: z.string().optional(),
    }).parse(req.body);

    const rawKey = `wxk_live_${uuidv4().replace(/-/g, '')}`;
    const keyPrefix = rawKey.substring(0, 12);
    const keyHash = await bcrypt.hash(rawKey, 10);

    await prisma.apiKey.create({
      data: {
        orgId, name, keyHash, keyPrefix, permissions,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      },
    });

    // Only return raw key once
    res.status(201).json({ key: rawKey, message: 'Save this key — it will not be shown again' });
  } catch (error) { next(error); }
});

router.delete('/keys/:keyId', authenticate, requireOrg, async (req, res, next) => {
  try {
    await prisma.apiKey.update({ where: { id: req.params.keyId }, data: { isActive: false } });
    res.json({ message: 'API key revoked' });
  } catch (error) { next(error); }
});

// WEBHOOKS
router.get('/webhooks', authenticate, requireOrg, async (req, res, next) => {
  try {
    const orgId = req.orgMember?.orgId || req.apiKeyOrgId!;
    const webhooks = await prisma.webhook.findMany({
      where: { orgId },
      include: { _count: { select: { logs: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ webhooks });
  } catch (error) { next(error); }
});

router.post('/webhooks', authenticate, requireOrg, async (req, res, next) => {
  try {
    const orgId = req.orgMember!.orgId;
    const { name, url, events } = z.object({
      name: z.string(),
      url: z.string().url(),
      events: z.array(z.string()),
    }).parse(req.body);

    const secret = `wxwh_${crypto.randomBytes(24).toString('hex')}`;

    const webhook = await prisma.webhook.create({
      data: { orgId, name, url, secret, events: events as any },
    });

    res.status(201).json({ webhook, secret });
  } catch (error) { next(error); }
});

router.delete('/webhooks/:webhookId', authenticate, requireOrg, async (req, res, next) => {
  try {
    await prisma.webhook.delete({ where: { id: req.params.webhookId } });
    res.json({ message: 'Webhook deleted' });
  } catch (error) { next(error); }
});

router.post('/webhooks/:webhookId/test', authenticate, requireOrg, async (req, res, next) => {
  try {
    const webhook = await prisma.webhook.findUnique({ where: { id: req.params.webhookId } });
    if (!webhook) return res.status(404).json({ error: 'Webhook not found' });

    const testPayload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      data: { message: 'This is a test webhook from WinkX AI' },
    };

    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(JSON.stringify(testPayload))
      .digest('hex');

    const start = Date.now();
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WinkX-Signature': `sha256=${signature}`,
      },
      body: JSON.stringify(testPayload),
    }).catch(err => ({ ok: false, status: 0, json: () => ({ error: err.message }) } as any));

    const duration = Date.now() - start;

    await prisma.webhookLog.create({
      data: {
        webhookId: webhook.id,
        event: 'test',
        payload: testPayload,
        statusCode: response.status,
        success: response.ok,
        duration,
      },
    });

    res.json({ success: response.ok, statusCode: response.status, duration });
  } catch (error) { next(error); }
});

export default router;
