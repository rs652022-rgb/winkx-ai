import { Router } from 'express';
import { z } from 'zod';
import slug from 'slug';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@winkx/db/src/client';
import { authenticate, requireOrg, requireRole } from '../middleware/auth';
import { sendEmail } from '../services/email';

const router = Router();

/**
 * @swagger
 * /api/orgs:
 *   get:
 *     tags: [Organizations]
 *     summary: Get all orgs for current user
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const memberships = await prisma.orgMember.findMany({
      where: { userId: req.user.id },
      include: {
        org: {
          include: {
            _count: {
              select: { members: true, channels: true, contacts: true, flows: true },
            },
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    res.json({ orgs: memberships.map(m => ({ ...m.org, role: m.role, isOwner: m.isOwner })) });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/orgs:
 *   post:
 *     tags: [Organizations]
 *     summary: Create a new organization
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const data = z.object({
      name: z.string().min(1).max(100),
      website: z.string().url().optional(),
      industry: z.string().optional(),
      timezone: z.string().optional(),
    }).parse(req.body);

    const orgSlug = `${slug(data.name)}-${uuidv4().substring(0, 6)}`;

    const org = await prisma.organization.create({
      data: {
        name: data.name,
        slug: orgSlug,
        website: data.website,
        industry: data.industry,
        timezone: data.timezone || 'UTC',
        createdById: req.user.id,
        members: {
          create: {
            userId: req.user.id,
            role: 'ADMIN',
            isOwner: true,
          },
        },
      },
    });

    res.status(201).json({ org });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/orgs/{orgId}:
 *   get:
 *     tags: [Organizations]
 *     summary: Get organization details
 */
router.get('/:orgId', authenticate, requireOrg, async (req, res, next) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: req.params.orgId },
      include: {
        _count: {
          select: {
            members: true, channels: true, contacts: true, flows: true,
            campaigns: true, leads: true, aiAgents: true,
          },
        },
        subscription: { include: { plan: true } },
      },
    });

    if (!org) return res.status(404).json({ error: 'Organization not found' });
    res.json({ org });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/orgs/{orgId}:
 *   patch:
 *     tags: [Organizations]
 *     summary: Update organization settings
 */
router.patch('/:orgId', authenticate, requireOrg, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const data = z.object({
      name: z.string().min(1).max(100).optional(),
      website: z.string().url().optional(),
      industry: z.string().optional(),
      timezone: z.string().optional(),
      brandColor: z.string().optional(),
      whiteLabelEnabled: z.boolean().optional(),
      customDomain: z.string().optional(),
    }).parse(req.body);

    const org = await prisma.organization.update({
      where: { id: req.params.orgId },
      data,
    });

    res.json({ org });
  } catch (error) {
    next(error);
  }
});

// MEMBERS

/**
 * @swagger
 * /api/orgs/{orgId}/members:
 *   get:
 *     tags: [Organizations]
 *     summary: Get organization members
 */
router.get('/:orgId/members', authenticate, requireOrg, async (req, res, next) => {
  try {
    const members = await prisma.orgMember.findMany({
      where: { orgId: req.params.orgId },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, avatar: true, lastLoginAt: true } } },
      orderBy: { joinedAt: 'asc' },
    });

    res.json({ members });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/orgs/{orgId}/members/{memberId}:
 *   patch:
 *     tags: [Organizations]
 *     summary: Update member role
 */
router.patch('/:orgId/members/:memberId', authenticate, requireOrg, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { role } = z.object({ role: z.enum(['ADMIN', 'MEMBER', 'VIEWER', 'AGENT']) }).parse(req.body);

    const member = await prisma.orgMember.update({
      where: { id: req.params.memberId },
      data: { role: role as any },
    });

    res.json({ member });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/orgs/{orgId}/members/{memberId}:
 *   delete:
 *     tags: [Organizations]
 *     summary: Remove a member
 */
router.delete('/:orgId/members/:memberId', authenticate, requireOrg, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const member = await prisma.orgMember.findUnique({ where: { id: req.params.memberId } });
    if (member?.isOwner) {
      return res.status(400).json({ error: 'Cannot remove organization owner' });
    }

    await prisma.orgMember.delete({ where: { id: req.params.memberId } });
    res.json({ message: 'Member removed' });
  } catch (error) {
    next(error);
  }
});

// INVITES

/**
 * @swagger
 * /api/orgs/{orgId}/invites:
 *   post:
 *     tags: [Organizations]
 *     summary: Invite a new member
 */
router.post('/:orgId/invites', authenticate, requireOrg, requireRole('ADMIN'), async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const { email, role } = z.object({
      email: z.string().email(),
      role: z.enum(['ADMIN', 'MEMBER', 'VIEWER', 'AGENT']).default('MEMBER'),
    }).parse(req.body);

    const existing = await prisma.orgInvite.findFirst({
      where: { orgId: req.params.orgId, email, acceptedAt: null },
    });

    if (existing) {
      return res.status(409).json({ error: 'Invite already sent to this email' });
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await prisma.orgInvite.create({
      data: {
        orgId: req.params.orgId,
        email,
        role: role as any,
        token,
        invitedById: req.user.id,
        expiresAt,
      },
      include: { org: true },
    });

    await sendEmail({
      to: email,
      subject: `You've been invited to ${invite.org.name} on WinkX AI`,
      html: `
        <h2>Join ${invite.org.name}</h2>
        <p>${req.user.firstName} invited you to join their WinkX AI workspace.</p>
        <a href="${process.env.FRONTEND_URL}/invite/${token}">Accept Invitation</a>
      `,
    });

    res.status(201).json({ invite });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/orgs/invites/{token}/accept:
 *   post:
 *     tags: [Organizations]
 *     summary: Accept an organization invite
 */
router.post('/invites/:token/accept', authenticate, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const invite = await prisma.orgInvite.findUnique({
      where: { token: req.params.token },
    });

    if (!invite || invite.expiresAt < new Date() || invite.acceptedAt) {
      return res.status(400).json({ error: 'Invalid or expired invite' });
    }

    if (invite.email !== req.user.email) {
      return res.status(403).json({ error: 'This invite is for a different email address' });
    }

    const existingMember = await prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId: invite.orgId, userId: req.user.id } },
    });

    if (!existingMember) {
      await prisma.orgMember.create({
        data: {
          orgId: invite.orgId,
          userId: req.user.id,
          role: invite.role,
        },
      });
    }

    await prisma.orgInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });

    const org = await prisma.organization.findUnique({ where: { id: invite.orgId } });
    res.json({ org, message: 'Invitation accepted' });
  } catch (error) {
    next(error);
  }
});

export default router;
