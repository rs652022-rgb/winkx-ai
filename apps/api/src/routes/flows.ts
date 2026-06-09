import { Router } from 'express';
import { z } from 'zod';
import prisma from '@winkx/db/src/client';
import { authenticate, requireOrg, requireRole, getRequestOrgId } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/flows:
 *   get:
 *     tags: [Flows]
 *     summary: Get all flows for an org
 */
router.get('/', authenticate, requireOrg, async (req, res, next) => {
  try {
    const orgId = getRequestOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization ID is required' });
    const { status, channelId, search } = req.query;

    const where: any = { orgId };
    if (status) where.status = status;
    if (channelId) where.channelId = channelId as string;
    if (search) where.name = { contains: search as string, mode: 'insensitive' };

    const flows = await prisma.flow.findMany({
      where,
      include: {
        channel: { select: { id: true, type: true, name: true } },
        _count: { select: { nodes: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ flows });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/flows:
 *   post:
 *     tags: [Flows]
 *     summary: Create a new flow
 */
router.post('/', authenticate, requireOrg, async (req, res, next) => {
  try {
    const orgId = getRequestOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'Organization ID is required' });

    const data = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      channelId: z.string().optional(),
      triggerType: z.string().default('KEYWORD'),
      triggerData: z.any().optional(),
      nodes: z.array(z.any()).default([]),
      edges: z.array(z.any()).default([]),
    }).parse(req.body);

    const flow = await prisma.flow.create({
      data: {
        orgId,
        name: data.name,
        description: data.description,
        channelId: data.channelId,
        triggerType: data.triggerType as any,
        triggerData: data.triggerData,
        nodes: {
          create: data.nodes.map((node: any) => ({
            nodeId: node.id,
            type: node.type,
            positionX: node.position?.x || 0,
            positionY: node.position?.y || 0,
            data: node.data || {},
          })),
        },
        edges: {
          create: data.edges.map((edge: any) => ({
            edgeId: edge.id,
            sourceNodeId: edge.source,
            targetNodeId: edge.target,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
            label: edge.label,
            data: edge.data || {},
          })),
        },
      },
      include: { nodes: true, edges: true },
    });

    res.status(201).json({ flow });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/flows/{flowId}:
 *   get:
 *     tags: [Flows]
 *     summary: Get a flow with nodes and edges
 */
router.get('/:flowId', authenticate, requireOrg, async (req, res, next) => {
  try {
    const flow = await prisma.flow.findUnique({
      where: { id: req.params.flowId },
      include: {
        nodes: true,
        edges: true,
        channel: { select: { id: true, type: true, name: true } },
        versions: { orderBy: { version: 'desc' }, take: 10 },
      },
    });

    if (!flow) return res.status(404).json({ error: 'Flow not found' });
    res.json({ flow });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/flows/{flowId}:
 *   put:
 *     tags: [Flows]
 *     summary: Update a flow (full save with nodes/edges)
 */
router.put('/:flowId', authenticate, requireOrg, async (req, res, next) => {
  try {
    const data = z.object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED']).optional(),
      triggerType: z.string().optional(),
      triggerData: z.any().optional(),
      nodes: z.array(z.any()),
      edges: z.array(z.any()),
      saveVersion: z.boolean().default(false),
    }).parse(req.body);

    const existing = await prisma.flow.findUnique({
      where: { id: req.params.flowId },
    });
    if (!existing) return res.status(404).json({ error: 'Flow not found' });

    // Save version if requested
    if (data.saveVersion) {
      const currentNodes = await prisma.flowNode.findMany({ where: { flowId: req.params.flowId } });
      const currentEdges = await prisma.flowEdge.findMany({ where: { flowId: req.params.flowId } });

      await prisma.flowVersion.create({
        data: {
          flowId: req.params.flowId,
          version: existing.version,
          snapshot: { nodes: currentNodes, edges: currentEdges },
        },
      });
    }

    // Update flow
    await prisma.$transaction([
      prisma.flowNode.deleteMany({ where: { flowId: req.params.flowId } }),
      prisma.flowEdge.deleteMany({ where: { flowId: req.params.flowId } }),
      prisma.flow.update({
        where: { id: req.params.flowId },
        data: {
          name: data.name,
          description: data.description,
          status: data.status as any,
          triggerType: data.triggerType as any,
          triggerData: data.triggerData,
          version: { increment: 1 },
        },
      }),
      prisma.flowNode.createMany({
        data: data.nodes.map((node: any) => ({
          flowId: req.params.flowId,
          nodeId: node.id,
          type: node.type,
          positionX: node.position?.x || 0,
          positionY: node.position?.y || 0,
          data: node.data || {},
        })),
      }),
      prisma.flowEdge.createMany({
        data: data.edges.map((edge: any) => ({
          flowId: req.params.flowId,
          edgeId: edge.id,
          sourceNodeId: edge.source,
          targetNodeId: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
          label: edge.label,
          data: edge.data || {},
        })),
      }),
    ]);

    const flow = await prisma.flow.findUnique({
      where: { id: req.params.flowId },
      include: { nodes: true, edges: true },
    });

    res.json({ flow });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/flows/{flowId}:
 *   delete:
 *     tags: [Flows]
 *     summary: Delete a flow
 */
router.delete('/:flowId', authenticate, requireOrg, async (req, res, next) => {
  try {
    await prisma.flow.delete({ where: { id: req.params.flowId } });
    res.json({ message: 'Flow deleted' });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/flows/{flowId}/duplicate:
 *   post:
 *     tags: [Flows]
 *     summary: Duplicate a flow
 */
router.post('/:flowId/duplicate', authenticate, requireOrg, async (req, res, next) => {
  try {
    const original = await prisma.flow.findUnique({
      where: { id: req.params.flowId },
      include: { nodes: true, edges: true },
    });
    if (!original) return res.status(404).json({ error: 'Flow not found' });

    const newFlow = await prisma.flow.create({
      data: {
        orgId: original.orgId,
        name: `${original.name} (Copy)`,
        description: original.description,
        channelId: original.channelId,
        triggerType: original.triggerType,
        triggerData: original.triggerData || undefined,
        status: 'DRAFT',
        nodes: {
          create: original.nodes.map(n => ({
            nodeId: n.nodeId,
            type: n.type,
            positionX: n.positionX,
            positionY: n.positionY,
            data: n.data as any,
          })),
        },
        edges: {
          create: original.edges.map(e => ({
            edgeId: e.edgeId,
            sourceNodeId: e.sourceNodeId,
            targetNodeId: e.targetNodeId,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
            label: e.label,
            data: e.data as any,
          })),
        },
      },
      include: { nodes: true, edges: true },
    });

    res.status(201).json({ flow: newFlow });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/flows/{flowId}/toggle:
 *   post:
 *     tags: [Flows]
 *     summary: Toggle flow active/paused
 */
router.post('/:flowId/toggle', authenticate, requireOrg, async (req, res, next) => {
  try {
    const flow = await prisma.flow.findUnique({ where: { id: req.params.flowId } });
    if (!flow) return res.status(404).json({ error: 'Flow not found' });

    const newStatus = flow.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    const updated = await prisma.flow.update({
      where: { id: req.params.flowId },
      data: { status: newStatus },
    });

    res.json({ flow: updated });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/flows/{flowId}/versions:
 *   get:
 *     tags: [Flows]
 *     summary: Get version history for a flow
 */
router.get('/:flowId/versions', authenticate, requireOrg, async (req, res, next) => {
  try {
    const versions = await prisma.flowVersion.findMany({
      where: { flowId: req.params.flowId },
      orderBy: { version: 'desc' },
    });
    res.json({ versions });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/flows/{flowId}/versions/{versionId}/restore:
 *   post:
 *     tags: [Flows]
 *     summary: Restore a flow to a previous version
 */
router.post('/:flowId/versions/:versionId/restore', authenticate, requireOrg, async (req, res, next) => {
  try {
    const version = await prisma.flowVersion.findUnique({
      where: { id: req.params.versionId },
    });
    if (!version) return res.status(404).json({ error: 'Version not found' });

    const snapshot = version.snapshot as any;

    await prisma.$transaction([
      prisma.flowNode.deleteMany({ where: { flowId: req.params.flowId } }),
      prisma.flowEdge.deleteMany({ where: { flowId: req.params.flowId } }),
      prisma.flowNode.createMany({ data: snapshot.nodes.map((n: any) => ({ ...n, flowId: req.params.flowId, id: undefined, createdAt: undefined, updatedAt: undefined })) }),
      prisma.flowEdge.createMany({ data: snapshot.edges.map((e: any) => ({ ...e, flowId: req.params.flowId, id: undefined, createdAt: undefined })) }),
    ]);

    res.json({ message: 'Flow restored to version ' + version.version });
  } catch (error) {
    next(error);
  }
});

export default router;
