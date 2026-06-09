import { Router } from 'express';
import { z } from 'zod';
import prisma from '@winkx/db/src/client';
import { authenticate, requireOrg } from '../middleware/auth';

const router = Router();

// CONTACTS
router.get('/contacts', authenticate, requireOrg, async (req, res, next) => {
  try {
    const orgId = req.orgMember?.orgId || req.apiKeyOrgId!;
    const { search, tag, channel, page = '1', limit = '25' } = req.query;

    const where: any = { orgId };
    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string } },
      ];
    }
    if (tag) where.tags = { has: tag as string };
    if (channel) where.channelType = channel as string;

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: {
          _count: { select: { conversations: true, leads: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.contact.count({ where }),
    ]);

    res.json({ contacts, pagination: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) { next(error); }
});

router.post('/contacts', authenticate, requireOrg, async (req, res, next) => {
  try {
    const orgId = req.orgMember!.orgId;
    const data = z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      tags: z.array(z.string()).default([]),
      customFields: z.any().optional(),
      notes: z.string().optional(),
      source: z.string().optional(),
    }).parse(req.body);

    const contact = await prisma.contact.create({ data: { orgId, ...data } });
    res.status(201).json({ contact });
  } catch (error) { next(error); }
});

router.get('/contacts/:contactId', authenticate, requireOrg, async (req, res, next) => {
  try {
    const contact = await prisma.contact.findUnique({
      where: { id: req.params.contactId },
      include: {
        conversations: { include: { channel: true }, orderBy: { lastMessageAt: 'desc' }, take: 5 },
        leads: { orderBy: { createdAt: 'desc' }, take: 5 },
        appointments: { orderBy: { startTime: 'desc' }, take: 5 },
        activities: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    res.json({ contact });
  } catch (error) { next(error); }
});

router.patch('/contacts/:contactId', authenticate, requireOrg, async (req, res, next) => {
  try {
    const data = z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      tags: z.array(z.string()).optional(),
      customFields: z.any().optional(),
      notes: z.string().optional(),
      isBlocked: z.boolean().optional(),
      leadScore: z.number().optional(),
    }).parse(req.body);

    const contact = await prisma.contact.update({ where: { id: req.params.contactId }, data });
    res.json({ contact });
  } catch (error) { next(error); }
});

router.delete('/contacts/:contactId', authenticate, requireOrg, async (req, res, next) => {
  try {
    await prisma.contact.delete({ where: { id: req.params.contactId } });
    res.json({ message: 'Contact deleted' });
  } catch (error) { next(error); }
});

// LEADS
router.get('/leads', authenticate, requireOrg, async (req, res, next) => {
  try {
    const orgId = req.orgMember?.orgId || req.apiKeyOrgId!;
    const { status, assignedToId, search, page = '1', limit = '25' } = req.query;

    const where: any = { orgId };
    if (status) where.status = status;
    if (assignedToId) where.assignedToId = assignedToId as string;
    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { company: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          contact: { select: { id: true, firstName: true, lastName: true, avatar: true } },
          _count: { select: { deals: true, tasks: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({ leads, pagination: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) { next(error); }
});

router.post('/leads', authenticate, requireOrg, async (req, res, next) => {
  try {
    const orgId = req.orgMember!.orgId;
    const data = z.object({
      contactId: z.string().optional(),
      status: z.string().optional(),
      source: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      company: z.string().optional(),
      jobTitle: z.string().optional(),
      value: z.number().optional(),
      notes: z.string().optional(),
      tags: z.array(z.string()).default([]),
      assignedToId: z.string().optional(),
    }).parse(req.body);

    const lead = await prisma.lead.create({ data: { orgId, ...data as any } });
    res.status(201).json({ lead });
  } catch (error) { next(error); }
});

router.patch('/leads/:leadId', authenticate, requireOrg, async (req, res, next) => {
  try {
    const data = z.object({
      status: z.string().optional(),
      score: z.number().optional(),
      notes: z.string().optional(),
      assignedToId: z.string().optional(),
      value: z.number().optional(),
      tags: z.array(z.string()).optional(),
    }).parse(req.body);

    const lead = await prisma.lead.update({ where: { id: req.params.leadId }, data: data as any });
    res.json({ lead });
  } catch (error) { next(error); }
});

// PIPELINES & DEALS
router.get('/pipelines', authenticate, requireOrg, async (req, res, next) => {
  try {
    const orgId = req.orgMember?.orgId || req.apiKeyOrgId!;
    const pipelines = await prisma.pipeline.findMany({
      where: { orgId },
      include: {
        deals: {
          include: {
            lead: { select: { id: true, firstName: true, lastName: true, company: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ pipelines });
  } catch (error) { next(error); }
});

router.post('/pipelines', authenticate, requireOrg, async (req, res, next) => {
  try {
    const { name } = z.object({ name: z.string().min(1) }).parse(req.body);
    const orgId = req.orgMember!.orgId;
    const pipeline = await prisma.pipeline.create({ data: { orgId, name } });
    res.status(201).json({ pipeline });
  } catch (error) { next(error); }
});

router.get('/deals', authenticate, requireOrg, async (req, res, next) => {
  try {
    const orgId = req.orgMember?.orgId || req.apiKeyOrgId!;
    const { pipelineId, stage } = req.query;

    const deals = await prisma.deal.findMany({
      where: {
        pipeline: { orgId },
        ...(pipelineId ? { pipelineId: pipelineId as string } : {}),
        ...(stage ? { stage: stage as any } : {}),
      },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, company: true, email: true } },
        pipeline: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ deals });
  } catch (error) { next(error); }
});

router.post('/deals', authenticate, requireOrg, async (req, res, next) => {
  try {
    const data = z.object({
      pipelineId: z.string(),
      leadId: z.string().optional(),
      title: z.string(),
      value: z.number().default(0),
      stage: z.string().default('LEAD'),
      probability: z.number().default(0),
      expectedClose: z.string().optional(),
      assignedToId: z.string().optional(),
    }).parse(req.body);

    const deal = await prisma.deal.create({
      data: {
        ...data,
        stage: data.stage as any,
        expectedClose: data.expectedClose ? new Date(data.expectedClose) : undefined,
      } as any,
    });
    res.status(201).json({ deal });
  } catch (error) { next(error); }
});

router.patch('/deals/:dealId', authenticate, requireOrg, async (req, res, next) => {
  try {
    const data = z.object({
      stage: z.string().optional(),
      value: z.number().optional(),
      title: z.string().optional(),
      probability: z.number().optional(),
      wonAt: z.string().optional(),
      lostAt: z.string().optional(),
      lostReason: z.string().optional(),
    }).parse(req.body);

    const deal = await prisma.deal.update({
      where: { id: req.params.dealId },
      data: {
        ...data,
        stage: data.stage as any,
        wonAt: data.wonAt ? new Date(data.wonAt) : undefined,
        lostAt: data.lostAt ? new Date(data.lostAt) : undefined,
      },
    });
    res.json({ deal });
  } catch (error) { next(error); }
});

// TASKS
router.get('/tasks', authenticate, requireOrg, async (req, res, next) => {
  try {
    const { leadId, dealId } = req.query;
    const tasks = await prisma.task.findMany({
      where: {
        ...(leadId ? { leadId: leadId as string } : {}),
        ...(dealId ? { dealId: dealId as string } : {}),
      },
      orderBy: { dueDate: 'asc' },
    });
    res.json({ tasks });
  } catch (error) { next(error); }
});

router.post('/tasks', authenticate, requireOrg, async (req, res, next) => {
  try {
    const orgId = req.orgMember!.orgId;
    const data = z.object({
      title: z.string(),
      description: z.string().optional(),
      dueDate: z.string().optional(),
      priority: z.number().default(0),
      leadId: z.string().optional(),
      dealId: z.string().optional(),
      assignedToId: z.string().optional(),
    }).parse(req.body);

    const task = await prisma.task.create({
      data: {
        orgId,
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      } as any,
    });
    res.status(201).json({ task });
  } catch (error) { next(error); }
});

export default router;
