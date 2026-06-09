import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from './lib/jwt';
import prisma from '@winkx/db/src/client';
import { logger } from './lib/logger';

export function setupSocketIO(io: Server) {
  // Auth middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      if (!token) return next(new Error('Authentication required'));

      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, firstName: true, lastName: true },
      });

      if (!user) return next(new Error('User not found'));

      (socket as any).user = user;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const user = (socket as any).user;
    logger.info(`Socket connected: ${user.email}`);

    // Join user's org rooms
    const memberships = await prisma.orgMember.findMany({
      where: { userId: user.id },
      select: { orgId: true },
    });
    for (const m of memberships) {
      socket.join(`org:${m.orgId}`);
    }

    socket.on('join:conversation', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('leave:conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on('typing:start', async ({ conversationId }: { conversationId: string }) => {
      socket.to(`conversation:${conversationId}`).emit('typing:start', {
        userId: user.id,
        name: `${user.firstName} ${user.lastName}`,
      });
    });

    socket.on('typing:stop', async ({ conversationId }: { conversationId: string }) => {
      socket.to(`conversation:${conversationId}`).emit('typing:stop', { userId: user.id });
    });

    socket.on('message:read', async ({ messageId, conversationId }: any) => {
      try {
        await prisma.message.update({
          where: { id: messageId },
          data: { readAt: new Date(), status: 'READ' },
        });
        socket.to(`conversation:${conversationId}`).emit('message:read', { messageId });
      } catch (e) {}
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${user.email}`);
    });
  });
}
