import prisma from '@winkx/db/src/client';
import { logger } from './logger';

export async function checkDatabaseConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    // Run a quick query to verify connectivity
    await prisma.$queryRaw`SELECT 1`;
    return { connected: true };
  } catch (error: any) {
    logger.error('Database connection verification failed:', error);
    return { connected: false, error: error.message || String(error) };
  }
}
