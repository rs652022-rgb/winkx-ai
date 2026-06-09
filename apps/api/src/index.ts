import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { logger } from './lib/logger';
import { configureSwagger } from './lib/swagger';
import { rateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';

// Routes
import authRoutes from './routes/auth';
import orgRoutes from './routes/orgs';
import channelRoutes from './routes/channels';
import inboxRoutes from './routes/inbox';
import flowRoutes from './routes/flows';
import aiRoutes from './routes/ai';
import crmRoutes from './routes/crm';
import campaignRoutes from './routes/campaigns';
import analyticsRoutes from './routes/analytics';
import templateRoutes from './routes/templates';
import billingRoutes from './routes/billing';
import agentRoutes from './routes/agents';
import appointmentRoutes from './routes/appointments';
import webhookRoutes from './routes/webhooks';
import adminRoutes from './routes/admin';
import developerRoutes from './routes/developer';
import uploadRoutes from './routes/upload';
import metaWebhookRoutes from './routes/meta-webhooks';

import { setupSocketIO } from './websocket';

const app = express();
const httpServer = createServer(app);

// Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

setupSocketIO(io);

// Store io instance globally
app.set('io', io);

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(compression());
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
app.use(cookieParser());

// Body parsers (exclude webhook routes that need raw body)
app.use('/api/meta-webhooks', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Swagger docs
configureSwagger(app);

// Rate limiting
app.use('/api/', rateLimiter);

// Health check
app.get('/health', (_, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/orgs', orgRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/inbox', inboxRoutes);
app.use('/api/flows', flowRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/developer', developerRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/meta-webhooks', metaWebhookRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, () => {
  logger.info(`🚀 WinkX AI API running on port ${PORT}`);
  logger.info(`📚 Swagger docs: http://localhost:${PORT}/api/docs`);
});

export { app, io };
