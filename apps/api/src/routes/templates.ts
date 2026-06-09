import { Router } from 'express';
import { z } from 'zod';
import prisma from '@winkx/db/src/client';
import { authenticate, requireOrg, getRequestOrgId } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { category, channelType, search, page = '1', limit = '24' } = req.query;

    const where: any = { isPublic: true };
    if (category) where.category = category;
    if (channelType) where.channelTypes = { has: channelType };
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { tags: { has: search as string } },
      ];
    }

    const [templates, total] = await Promise.all([
      prisma.flowTemplate.findMany({
        where,
        orderBy: [{ usageCount: 'desc' }, { rating: 'desc' }],
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        select: {
          id: true, name: true, description: true, category: true,
          previewImage: true, channelTypes: true, tags: true,
          usageCount: true, rating: true, ratingCount: true,
          isPremium: true, price: true,
        },
      }),
      prisma.flowTemplate.count({ where }),
    ]);

    const categories = await prisma.flowTemplate.groupBy({
      by: ['category'],
      where: { isPublic: true },
      _count: true,
      orderBy: { _count: { category: 'desc' } },
    });

    res.json({
      templates,
      categories: categories.map(c => ({ category: c.category, count: c._count })),
      pagination: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (error) { next(error); }
});

router.get('/:templateId', async (req, res, next) => {
  try {
    const template = await prisma.flowTemplate.findUnique({
      where: { id: req.params.templateId },
    });
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json({ template });
  } catch (error) { next(error); }
});

router.post('/:templateId/import', authenticate, requireOrg, async (req, res, next) => {
  try {
    const orgId = getRequestOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization ID is required' });
    const template = await prisma.flowTemplate.findUnique({
      where: { id: req.params.templateId },
    });
    if (!template) return res.status(404).json({ error: 'Template not found' });

    const flowData = template.flowData as any;

    const flow = await prisma.flow.create({
      data: {
        orgId,
        name: `${template.name} (from template)`,
        description: template.description,
        status: 'DRAFT',
        triggerType: flowData.triggerType || 'KEYWORD',
        triggerData: flowData.triggerData,
        nodes: {
          create: (flowData.nodes || []).map((node: any) => ({
            nodeId: node.id,
            type: node.type,
            positionX: node.position?.x || 0,
            positionY: node.position?.y || 0,
            data: node.data || {},
          })),
        },
        edges: {
          create: (flowData.edges || []).map((edge: any) => ({
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

    await prisma.flowTemplate.update({
      where: { id: req.params.templateId },
      data: { usageCount: { increment: 1 } },
    });

    res.status(201).json({ flow, message: 'Template imported successfully' });
  } catch (error) { next(error); }
});

router.post('/:templateId/rate', authenticate, async (req, res, next) => {
  try {
    const { rating } = z.object({ rating: z.number().min(1).max(5) }).parse(req.body);

    const template = await prisma.flowTemplate.findUnique({ where: { id: req.params.templateId } });
    if (!template) return res.status(404).json({ error: 'Template not found' });

    const newRatingCount = template.ratingCount + 1;
    const newRating = (template.rating * template.ratingCount + rating) / newRatingCount;

    await prisma.flowTemplate.update({
      where: { id: req.params.templateId },
      data: { rating: newRating, ratingCount: newRatingCount },
    });

    res.json({ message: 'Rating submitted' });
  } catch (error) { next(error); }
});

export default router;
