import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import prisma from '@winkx/db/src/client';
import { createSession, verifyRefreshToken, invalidateSession, generateAccessToken, verifyAccessToken } from '../lib/jwt';
import { authRateLimiter } from '../middleware/rateLimiter';
import { authenticate } from '../middleware/auth';
import { sendEmail } from '../services/email';
import { v4 as uuidv4 } from 'uuid';
import slug from 'slug';

const router = Router();

// Schemas
const signupSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  orgName: z.string().min(1).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  twoFactorCode: z.string().optional(),
});

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, password]
 *             properties:
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *               orgName: { type: string }
 */
router.post('/signup', authRateLimiter, async (req, res, next) => {
  try {
    const data = signupSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        passwordHash,
      },
    });

    // Create default organization
    let org = null;
    if (data.orgName) {
      const orgSlug = `${slug(data.orgName)}-${uuidv4().substring(0, 6)}`;
      org = await prisma.organization.create({
        data: {
          name: data.orgName,
          slug: orgSlug,
          createdById: user.id,
          members: {
            create: {
              userId: user.id,
              role: 'ADMIN',
              isOwner: true,
            },
          },
        },
      });
    }

    const { token, refreshToken } = await createSession(
      user.id,
      req.ip,
      req.headers['user-agent']
    );

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      org,
      token,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password
 */
router.post('/login', authRateLimiter, async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: {
        orgMemberships: {
          include: { org: true },
          take: 1,
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(data.password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account suspended' });
    }

    // 2FA check
    if (user.twoFactorEnabled) {
      if (!data.twoFactorCode) {
        return res.status(200).json({ requiresTwoFactor: true });
      }
      const isValid = authenticator.verify({
        token: data.twoFactorCode,
        secret: user.twoFactorSecret!,
      });
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid 2FA code' });
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const { token, refreshToken } = await createSession(
      user.id,
      req.ip,
      req.headers['user-agent']
    );

    const defaultOrg = user.orgMemberships[0]?.org || null;

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        isSuperAdmin: user.isSuperAdmin,
        twoFactorEnabled: user.twoFactorEnabled,
      },
      org: defaultOrg,
      token,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const payload = verifyRefreshToken(refreshToken);
    const session = await prisma.userSession.findUnique({
      where: { refreshToken },
    });

    if (!session) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found' });
    }

    const newToken = generateAccessToken({ userId: user.id });
    await prisma.userSession.update({
      where: { id: session.id },
      data: { token: newToken },
    });

    res.json({ token: newToken });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout current session
 */
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const token = req.headers.authorization?.substring(7);
    if (token) await invalidateSession(token);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user profile
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        orgMemberships: {
          include: { org: true },
        },
      },
    });

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request password reset email
 */
router.post('/forgot-password', authRateLimiter, async (req, res, next) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal if user exists
      return res.json({ message: 'If that email exists, a reset link was sent.' });
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordReset.create({
      data: { userId: user.id, token, expiresAt },
    });

    await sendEmail({
      to: user.email,
      subject: 'Reset your WinkX AI password',
      html: `
        <h2>Password Reset</h2>
        <p>Click the link below to reset your password. This link expires in 1 hour.</p>
        <a href="${process.env.FRONTEND_URL}/reset-password?token=${token}">Reset Password</a>
      `,
    });

    res.json({ message: 'If that email exists, a reset link was sent.' });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password using token
 */
router.post('/reset-password', authRateLimiter, async (req, res, next) => {
  try {
    const { token, password } = z.object({
      token: z.string(),
      password: z.string().min(8),
    }).parse(req.body);

    const reset = await prisma.passwordReset.findUnique({ where: { token } });
    if (!reset || reset.expiresAt < new Date() || reset.usedAt) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: reset.userId },
      data: { passwordHash },
    });

    await prisma.passwordReset.update({
      where: { id: reset.id },
      data: { usedAt: new Date() },
    });

    // Invalidate all sessions
    await prisma.userSession.deleteMany({ where: { userId: reset.userId } });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/auth/2fa/setup:
 *   post:
 *     tags: [Auth]
 *     summary: Setup 2FA for the current user
 */
router.post('/2fa/setup', authenticate, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(req.user.email, 'WinkX AI', secret);
    const qr = await qrcode.toDataURL(otpauth);

    // Store temp secret
    await prisma.user.update({
      where: { id: req.user.id },
      data: { twoFactorSecret: secret },
    });

    res.json({ qrCode: qr, secret });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/auth/2fa/verify:
 *   post:
 *     tags: [Auth]
 *     summary: Verify and enable 2FA
 */
router.post('/2fa/verify', authenticate, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const { code } = z.object({ code: z.string().length(6) }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user?.twoFactorSecret) {
      return res.status(400).json({ error: '2FA setup not initiated' });
    }

    const isValid = authenticator.verify({ token: code, secret: user.twoFactorSecret });
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    const backupCodes = Array.from({ length: 8 }, () => uuidv4().replace(/-/g, '').substring(0, 10));

    await prisma.user.update({
      where: { id: req.user.id },
      data: { twoFactorEnabled: true, backupCodes },
    });

    res.json({ message: '2FA enabled successfully', backupCodes });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/auth/2fa/disable:
 *   post:
 *     tags: [Auth]
 *     summary: Disable 2FA
 */
router.post('/2fa/disable', authenticate, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        backupCodes: [],
      },
    });
    res.json({ message: '2FA disabled' });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/auth/google:
 *   post:
 *     tags: [Auth]
 *     summary: Login/signup with Google OAuth token
 */
router.post('/google', authRateLimiter, async (req, res, next) => {
  try {
    const { idToken } = z.object({ idToken: z.string() }).parse(req.body);

    const { OAuth2Client } = await import('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const googlePayload = ticket.getPayload();
    if (!googlePayload?.email) {
      return res.status(400).json({ error: 'Invalid Google token' });
    }

    let user = await prisma.user.findUnique({
      where: { email: googlePayload.email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: googlePayload.email,
          firstName: googlePayload.given_name || 'User',
          lastName: googlePayload.family_name || '',
          avatar: googlePayload.picture,
          emailVerified: new Date(),
        },
      });
    }

    // Create/update OAuth account
    await prisma.oAuthAccount.upsert({
      where: {
        provider_providerUserId: {
          provider: 'google',
          providerUserId: googlePayload.sub,
        },
      },
      create: {
        userId: user.id,
        provider: 'google',
        providerUserId: googlePayload.sub,
        profile: googlePayload as any,
      },
      update: {
        profile: googlePayload as any,
      },
    });

    const { token, refreshToken } = await createSession(user.id, req.ip, req.headers['user-agent']);

    const orgs = await prisma.orgMember.findMany({
      where: { userId: user.id },
      include: { org: true },
      take: 1,
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
      },
      org: orgs[0]?.org || null,
      token,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/auth/profile:
 *   patch:
 *     tags: [Auth]
 *     summary: Update user profile
 */
router.patch('/profile', authenticate, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'User authentication required' });
    const data = z.object({
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      phone: z.string().optional(),
      timezone: z.string().optional(),
      locale: z.string().optional(),
    }).parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: {
        id: true, email: true, firstName: true, lastName: true,
        avatar: true, phone: true, timezone: true, locale: true,
      },
    });

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

export default router;
