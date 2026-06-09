import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireOrg } from '../middleware/auth';
import { aiRateLimiter } from '../middleware/rateLimiter';
import { generateFlowWithAI, chatWithAI, generateContent } from '../services/ai';
import prisma from '@winkx/db/src/client';

const router = Router();

/**
 * @swagger
 * /api/ai/generate-flow:
 *   post:
 *     tags: [AI]
 *     summary: Generate a workflow using AI from a text prompt
 */
router.post('/generate-flow', authenticate, requireOrg, aiRateLimiter, async (req, res, next) => {
  try {
    const { prompt, channelType, provider } = z.object({
      prompt: z.string().min(10).max(1000),
      channelType: z.enum(['WHATSAPP', 'INSTAGRAM', 'FACEBOOK']).default('INSTAGRAM'),
      provider: z.enum(['openai', 'anthropic', 'gemini']).default('openai'),
    }).parse(req.body);

    const orgId = req.orgMember!.orgId;

    const flowData = await generateFlowWithAI(prompt, channelType, provider);

    // Save the generated flow
    const flow = await prisma.flow.create({
      data: {
        orgId,
        name: flowData.name,
        description: flowData.description,
        triggerType: flowData.triggerType || 'KEYWORD',
        triggerData: flowData.triggerData,
        status: 'DRAFT',
        nodes: {
          create: flowData.nodes.map((node: any) => ({
            nodeId: node.id,
            type: node.type,
            positionX: node.position?.x || 0,
            positionY: node.position?.y || 0,
            data: node.data || {},
          })),
        },
        edges: {
          create: flowData.edges.map((edge: any) => ({
            edgeId: edge.id,
            sourceNodeId: edge.source,
            targetNodeId: edge.target,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
            data: edge.data || {},
          })),
        },
      },
      include: { nodes: true, edges: true },
    });

    // Track AI usage
    await prisma.usageRecord.upsert({
      where: {
        orgId_metric_date: {
          orgId,
          metric: 'ai_flow_generations',
          date: new Date(new Date().toISOString().split('T')[0]),
        },
      },
      create: { orgId, metric: 'ai_flow_generations', value: 1, date: new Date() },
      update: { value: { increment: 1 } },
    });

    res.json({ flow, message: 'Flow generated successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/ai/chat:
 *   post:
 *     tags: [AI]
 *     summary: Chat with an AI agent (test endpoint)
 */
router.post('/chat', authenticate, requireOrg, aiRateLimiter, async (req, res, next) => {
  try {
    const { message, agentId, sessionId, conversationHistory } = z.object({
      message: z.string().min(1),
      agentId: z.string(),
      sessionId: z.string(),
      conversationHistory: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })).default([]),
    }).parse(req.body);

    const agent = await prisma.aIAgent.findUnique({
      where: { id: agentId },
      include: { knowledgeBase: { include: { documents: true } } },
    });

    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const reply = await chatWithAI(agent, message, conversationHistory, sessionId);

    res.json({ reply, sessionId });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/ai/generate-content:
 *   post:
 *     tags: [AI]
 *     summary: Generate marketing content using AI
 */
router.post('/generate-content', authenticate, requireOrg, aiRateLimiter, async (req, res, next) => {
  try {
    const { type, context, tone, length, provider } = z.object({
      type: z.enum([
        'dm_script', 'sales_script', 'comment_reply', 'lead_qualification',
        'follow_up', 'appointment', 'broadcast', 'promotion',
      ]),
      context: z.string().min(10),
      tone: z.enum(['professional', 'friendly', 'casual', 'urgent']).default('friendly'),
      length: z.enum(['short', 'medium', 'long']).default('medium'),
      provider: z.enum(['openai', 'anthropic', 'gemini']).default('openai'),
    }).parse(req.body);

    const content = await generateContent({ type, context, tone, length, provider });

    res.json({ content });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/ai/providers:
 *   get:
 *     tags: [AI]
 *     summary: Get available AI providers and models
 */
router.get('/providers', authenticate, async (req, res) => {
  res.json({
    providers: [
      {
        id: 'openai',
        name: 'OpenAI',
        models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
        configured: !!process.env.OPENAI_API_KEY,
      },
      {
        id: 'anthropic',
        name: 'Anthropic Claude',
        models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'],
        configured: !!process.env.ANTHROPIC_API_KEY,
      },
      {
        id: 'gemini',
        name: 'Google Gemini',
        models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'],
        configured: !!process.env.GEMINI_API_KEY,
      },
    ],
  });
});

export default router;
