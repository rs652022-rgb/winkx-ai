import { Router } from 'express';
import { z } from 'zod';
import Stripe from 'stripe';
import prisma from '@winkx/db/src/client';
import { authenticate, requireOrg, requireRole, getRequestOrgId } from '../middleware/auth';

const router = Router();

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
  : null;

router.get('/plans', async (req, res, next) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ plans });
  } catch (error) { next(error); }
});

router.get('/subscription', authenticate, requireOrg, async (req, res, next) => {
  try {
    const orgId = getRequestOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization ID is required' });
    const subscription = await prisma.subscription.findUnique({
      where: { orgId },
      include: { plan: true },
    });
    res.json({ subscription });
  } catch (error) { next(error); }
});

router.post('/checkout', authenticate, requireOrg, requireRole('ADMIN'), async (req, res, next) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });

    const { planId, interval } = z.object({
      planId: z.string(),
      interval: z.enum(['month', 'year']).default('month'),
    }).parse(req.body);

    const orgId = getRequestOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization ID is required' });
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const org = await prisma.organization.findUnique({ where: { id: orgId } });

    let customerId = org?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: org?.name,
        metadata: { orgId },
      });
      customerId = customer.id;
      await prisma.organization.update({ where: { id: orgId }, data: { stripeCustomerId: customerId } });
    }

    const priceId = interval === 'year' ? plan.stripePriceId + '_yearly' : plan.stripePriceId;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId || plan.stripePriceId!, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/billing?cancelled=true`,
      metadata: { orgId, planId },
    });

    res.json({ url: session.url });
  } catch (error) { next(error); }
});

router.post('/portal', authenticate, requireOrg, requireRole('ADMIN'), async (req, res, next) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });

    const orgId = getRequestOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization ID is required' });
    const org = await prisma.organization.findUnique({ where: { id: orgId } });

    if (!org?.stripeCustomerId) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/billing`,
    });

    res.json({ url: session.url });
  } catch (error) { next(error); }
});

// Stripe Webhook
router.post('/webhook', async (req, res, next) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });

    const sig = req.headers['stripe-signature'] as string;
    const rawBody = req.body as Buffer;

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { orgId, planId } = session.metadata || {};
        if (orgId && planId && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          const plan = await prisma.plan.findUnique({ where: { id: planId } });
          if (plan) {
            await prisma.subscription.upsert({
              where: { orgId },
              create: {
                orgId,
                planId,
                status: 'ACTIVE',
                currentPeriodStart: new Date(sub.current_period_start * 1000),
                currentPeriodEnd: new Date(sub.current_period_end * 1000),
                stripeSubId: sub.id,
              },
              update: {
                planId,
                status: 'ACTIVE',
                currentPeriodStart: new Date(sub.current_period_start * 1000),
                currentPeriodEnd: new Date(sub.current_period_end * 1000),
                stripeSubId: sub.id,
              },
            });
            await prisma.organization.update({
              where: { id: orgId },
              data: { plan: plan.slug.toUpperCase() as any, stripeSubId: sub.id },
            });
          }
        }
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const subscription = await prisma.subscription.findFirst({ where: { stripeSubId: sub.id } });
        if (subscription) {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status: sub.status.toUpperCase() as any,
              currentPeriodStart: new Date(sub.current_period_start * 1000),
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
              cancelAtPeriodEnd: sub.cancel_at_period_end,
            },
          });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await prisma.subscription.updateMany({
          where: { stripeSubId: sub.id },
          data: { status: 'CANCELLED', cancelledAt: new Date() },
        });
        break;
      }
    }

    res.json({ received: true });
  } catch (error) { next(error); }
});

router.get('/usage', authenticate, requireOrg, async (req, res, next) => {
  try {
    const orgId = getRequestOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization ID is required' });
    const today = new Date(new Date().toISOString().split('T')[0]);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const usage = await prisma.usageRecord.findMany({
      where: { orgId, date: { gte: monthStart } },
    });

    const totals = usage.reduce((acc: Record<string, number>, u) => {
      acc[u.metric] = (acc[u.metric] || 0) + u.value;
      return acc;
    }, {});

    res.json({ usage: totals, raw: usage });
  } catch (error) { next(error); }
});

export default router;
