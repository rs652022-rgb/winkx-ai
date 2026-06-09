import { Router } from 'express';
import { z } from 'zod';
import prisma from '@winkx/db/src/client';
import { authenticate, requireOrg, getRequestOrgId } from '../middleware/auth';

const router = Router();

// AI AGENTS
router.get('/', authenticate, requireOrg, async (req, res, next) => {
  try {
    const orgId = getRequestOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization ID is required' });
    const agents = await prisma.aIAgent.findMany({
      where: { orgId },
      include: {
        knowledgeBase: { select: { id: true, name: true, _count: { select: { documents: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ agents });
  } catch (error) { next(error); }
});

router.post('/', authenticate, requireOrg, async (req, res, next) => {
  try {
    const orgId = getRequestOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization ID is required' });
    const data = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      personality: z.string().optional(),
      systemPrompt: z.string().optional(),
      provider: z.enum(['OPENAI', 'ANTHROPIC', 'GEMINI', 'CUSTOM']).default('OPENAI'),
      model: z.string().default('gpt-4o'),
      temperature: z.number().min(0).max(2).default(0.7),
      maxTokens: z.number().default(1000),
      language: z.string().default('en'),
      fallbackMessage: z.string().optional(),
      handoffKeywords: z.array(z.string()).default([]),
      knowledgeBaseId: z.string().optional(),
    }).parse(req.body);

    const agent = await prisma.aIAgent.create({ data: { orgId, ...data as any } });
    res.status(201).json({ agent });
  } catch (error) { next(error); }
});

router.get('/:agentId', authenticate, requireOrg, async (req, res, next) => {
  try {
    const agent = await prisma.aIAgent.findUnique({
      where: { id: req.params.agentId },
      include: {
        knowledgeBase: {
          include: { documents: true },
        },
        conversations: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json({ agent });
  } catch (error) { next(error); }
});

router.patch('/:agentId', authenticate, requireOrg, async (req, res, next) => {
  try {
    const data = z.object({
      name: z.string().optional(),
      personality: z.string().optional(),
      systemPrompt: z.string().optional(),
      provider: z.string().optional(),
      model: z.string().optional(),
      temperature: z.number().optional(),
      isActive: z.boolean().optional(),
      fallbackMessage: z.string().optional(),
      handoffKeywords: z.array(z.string()).optional(),
      knowledgeBaseId: z.string().optional(),
    }).parse(req.body);

    const agent = await prisma.aIAgent.update({
      where: { id: req.params.agentId },
      data: data as any,
    });
    res.json({ agent });
  } catch (error) { next(error); }
});

router.delete('/:agentId', authenticate, requireOrg, async (req, res, next) => {
  try {
    await prisma.aIAgent.delete({ where: { id: req.params.agentId } });
    res.json({ message: 'Agent deleted' });
  } catch (error) { next(error); }
});

// KNOWLEDGE BASES
router.get('/knowledge-bases', authenticate, requireOrg, async (req, res, next) => {
  try {
    const orgId = getRequestOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization ID is required' });
    const kbs = await prisma.knowledgeBase.findMany({
      where: { orgId },
      include: { _count: { select: { documents: true } } },
    });
    res.json({ knowledgeBases: kbs });
  } catch (error) { next(error); }
});

router.post('/knowledge-bases', authenticate, requireOrg, async (req, res, next) => {
  try {
    const orgId = getRequestOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization ID is required' });
    const { name, description } = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
    }).parse(req.body);

    const kb = await prisma.knowledgeBase.create({ data: { orgId, name, description } });
    res.status(201).json({ knowledgeBase: kb });
  } catch (error) { next(error); }
});

router.get('/knowledge-bases/:kbId/documents', authenticate, requireOrg, async (req, res, next) => {
  try {
    const docs = await prisma.knowledgeDocument.findMany({
      where: { knowledgeBaseId: req.params.kbId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ documents: docs });
  } catch (error) { next(error); }
});

router.post('/knowledge-bases/:kbId/documents', authenticate, requireOrg, async (req, res, next) => {
  try {
    const data = z.object({
      name: z.string(),
      sourceType: z.enum(['PDF', 'DOCX', 'TXT', 'CSV', 'URL', 'NOTION', 'GOOGLE_DOC', 'PLAIN_TEXT']),
      sourceUrl: z.string().url().optional(),
      fileKey: z.string().optional(),
      content: z.string().optional(),
    }).parse(req.body);

    const doc = await prisma.knowledgeDocument.create({
      data: {
        knowledgeBaseId: req.params.kbId,
        ...data,
        sourceType: data.sourceType as any,
      } as any,
    });

    // Queue document processing
    // await knowledgeQueue.add('process-document', { documentId: doc.id });

    res.status(201).json({ document: doc });
  } catch (error) { next(error); }
});

router.delete('/knowledge-bases/:kbId/documents/:docId', authenticate, requireOrg, async (req, res, next) => {
  try {
    await prisma.knowledgeDocument.delete({ where: { id: req.params.docId } });
    res.json({ message: 'Document deleted' });
  } catch (error) { next(error); }
});

export default router;
