import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../lib/jwt';
import prisma from '@winkx/db/src/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        isSuperAdmin: boolean;
      };
      orgMember?: {
        orgId: string;
        role: string;
        isOwner: boolean;
        permissions: string[];
      };
      tokenPayload?: TokenPayload;
      apiKeyOrgId?: string;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;

    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // Check API Key
    const apiKey = req.headers['x-api-key'] as string;
    if (apiKey) {
      const { default: bcrypt } = await import('bcryptjs');
      const crypto = await import('crypto');
      
      const keyPrefix = apiKey.substring(0, 12);
      const keys = await prisma.apiKey.findMany({
        where: { keyPrefix, isActive: true },
      });

      for (const key of keys) {
        const isValid = await bcrypt.compare(apiKey, key.keyHash);
        if (isValid) {
          const now = new Date();
          if (key.expiresAt && key.expiresAt < now) {
            return res.status(401).json({ error: 'API key expired' });
          }

          req.apiKeyOrgId = key.orgId;
          await prisma.apiKey.update({
            where: { id: key.id },
            data: { lastUsedAt: now },
          });
          return next();
        }
      }
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const payload = verifyAccessToken(token);

    // Verify session exists
    const session = await prisma.userSession.findUnique({
      where: { token },
    });

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Session expired' });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId, isActive: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isSuperAdmin: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    req.tokenPayload = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export async function requireOrg(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId || req.headers['x-org-id'] as string || req.apiKeyOrgId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    if (req.user) {
      const member = await prisma.orgMember.findUnique({
        where: {
          orgId_userId: { orgId, userId: req.user.id },
        },
      });

      if (!member && !req.user.isSuperAdmin) {
        return res.status(403).json({ error: 'Not a member of this organization' });
      }

      if (member) {
        req.orgMember = {
          orgId,
          role: member.role,
          isOwner: member.isOwner,
          permissions: member.permissions,
        };
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}

export function getRequestOrgId(req: Request): string | undefined {
  return req.orgMember?.orgId || req.apiKeyOrgId || req.params.orgId || (req.headers['x-org-id'] as string);
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.isSuperAdmin) return next();

    if (!req.orgMember) {
      return res.status(403).json({ error: 'Organization membership required' });
    }

    if (!roles.includes(req.orgMember.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
}
