import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@winkx/db/src/client';

const JWT_SECRET = process.env.JWT_SECRET || 'winkx-super-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'winkx-refresh-secret-change-in-production';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '30d';

export interface TokenPayload {
  userId: string;
  orgId?: string;
  role?: string;
  sessionId: string;
}

export function generateAccessToken(payload: Omit<TokenPayload, 'sessionId'> & { sessionId?: string }): string {
  return jwt.sign(
    { ...payload, sessionId: payload.sessionId || uuidv4() },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId, type: 'refresh' }, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): { userId: string } {
  return jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string };
}

export async function createSession(userId: string, ipAddress?: string, userAgent?: string) {
  const sessionId = uuidv4();
  const token = generateAccessToken({ userId, sessionId });
  const refreshToken = generateRefreshToken(userId);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await prisma.userSession.create({
    data: {
      userId,
      token,
      refreshToken,
      ipAddress,
      userAgent,
      expiresAt,
    },
  });

  return { token, refreshToken, sessionId };
}

export async function invalidateSession(token: string) {
  await prisma.userSession.deleteMany({ where: { token } });
}
