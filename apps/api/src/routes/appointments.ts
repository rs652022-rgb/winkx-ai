import { Router } from 'express';
import { z } from 'zod';
import prisma from '@winkx/db/src/client';
import { authenticate, requireOrg } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, requireOrg, async (req, res, next) => {
  try {
    const orgId = req.orgMember?.orgId || req.apiKeyOrgId!;
    const appointments = await prisma.appointment.findMany({
      where: { orgId },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        calendarIntegration: { select: { id: true, provider: true } },
      },
      orderBy: { startTime: 'asc' },
    });
    res.json({ appointments });
  } catch (error) { next(error); }
});

router.post('/', authenticate, requireOrg, async (req, res, next) => {
  try {
    const orgId = req.orgMember!.orgId;
    const data = z.object({
      contactId: z.string().optional(),
      title: z.string(),
      description: z.string().optional(),
      startTime: z.string(),
      endTime: z.string(),
      timezone: z.string().default('UTC'),
      meetingLink: z.string().optional(),
      notes: z.string().optional(),
      calendarIntegrationId: z.string().optional(),
    }).parse(req.body);

    const appointment = await prisma.appointment.create({
      data: {
        orgId,
        ...data,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
      } as any,
    });
    res.status(201).json({ appointment });
  } catch (error) { next(error); }
});

router.patch('/:appointmentId', authenticate, requireOrg, async (req, res, next) => {
  try {
    const data = z.object({
      status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'RESCHEDULED', 'COMPLETED', 'NO_SHOW']).optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      notes: z.string().optional(),
    }).parse(req.body);

    const appointment = await prisma.appointment.update({
      where: { id: req.params.appointmentId },
      data: {
        ...data,
        status: data.status as any,
        startTime: data.startTime ? new Date(data.startTime) : undefined,
        endTime: data.endTime ? new Date(data.endTime) : undefined,
      },
    });
    res.json({ appointment });
  } catch (error) { next(error); }
});

export default router;
