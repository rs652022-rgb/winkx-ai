import { Router } from 'express';
import prisma from '@winkx/db/src/client';
import { authenticate, requireOrg } from '../middleware/auth';

const router = Router();

router.get('/dashboard', authenticate, requireOrg, async (req, res, next) => {
  try {
    const orgId = req.orgMember?.orgId || req.apiKeyOrgId!;
    const { from, to } = req.query;

    const startDate = from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to as string) : new Date();

    const [
      totalContacts, newContacts,
      totalConversations, openConversations,
      messagesSent, messagesReceived,
      totalLeads, newLeads, qualifiedLeads,
      totalCampaigns, activeCampaigns,
      totalFlows, activeFlows,
      totalRevenue,
      totalAppointments, completedAppointments,
    ] = await Promise.all([
      prisma.contact.count({ where: { orgId } }),
      prisma.contact.count({ where: { orgId, createdAt: { gte: startDate, lte: endDate } } }),
      prisma.conversation.count({ where: { orgId } }),
      prisma.conversation.count({ where: { orgId, status: 'OPEN' } }),
      prisma.message.count({ where: { orgId, direction: 'OUTBOUND', createdAt: { gte: startDate, lte: endDate } } }),
      prisma.message.count({ where: { orgId, direction: 'INBOUND', createdAt: { gte: startDate, lte: endDate } } }),
      prisma.lead.count({ where: { orgId } }),
      prisma.lead.count({ where: { orgId, createdAt: { gte: startDate, lte: endDate } } }),
      prisma.lead.count({ where: { orgId, status: 'QUALIFIED' } }),
      prisma.campaign.count({ where: { orgId } }),
      prisma.campaign.count({ where: { orgId, status: 'RUNNING' } }),
      prisma.flow.count({ where: { orgId } }),
      prisma.flow.count({ where: { orgId, status: 'ACTIVE' } }),
      prisma.payment.aggregate({
        where: { status: 'COMPLETED', paidAt: { gte: startDate, lte: endDate } },
        _sum: { amount: true },
      }),
      prisma.appointment.count({ where: { orgId } }),
      prisma.appointment.count({ where: { orgId, status: 'COMPLETED' } }),
    ]);

    // Message volume over time (daily)
    const messagesByDay = await prisma.$queryRaw`
      SELECT DATE("createdAt") as date, 
             COUNT(CASE WHEN direction = 'OUTBOUND' THEN 1 END) as sent,
             COUNT(CASE WHEN direction = 'INBOUND' THEN 1 END) as received
      FROM messages
      WHERE "orgId" = ${orgId}
        AND "createdAt" >= ${startDate}
        AND "createdAt" <= ${endDate}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    // Leads by source
    const leadsBySource = await prisma.lead.groupBy({
      by: ['source'],
      where: { orgId, createdAt: { gte: startDate, lte: endDate } },
      _count: true,
    });

    // Channel breakdown
    const channelStats = await prisma.channel.findMany({
      where: { orgId },
      include: {
        _count: { select: { conversations: true } },
      },
    });

    res.json({
      overview: {
        totalContacts,
        newContacts,
        totalConversations,
        openConversations,
        messagesSent,
        messagesReceived,
        totalLeads,
        newLeads,
        qualifiedLeads,
        totalCampaigns,
        activeCampaigns,
        totalFlows,
        activeFlows,
        revenue: totalRevenue._sum.amount || 0,
        totalAppointments,
        completedAppointments,
      },
      charts: {
        messageVolume: messagesByDay,
        leadsBySource: leadsBySource.map(l => ({ source: l.source || 'Unknown', count: l._count })),
        channelBreakdown: channelStats.map(c => ({
          channelType: c.type,
          name: c.name,
          conversations: c._count.conversations,
        })),
      },
    });
  } catch (error) { next(error); }
});

router.get('/performance', authenticate, requireOrg, async (req, res, next) => {
  try {
    const orgId = req.orgMember?.orgId || req.apiKeyOrgId!;
    const { from, to } = req.query;

    const startDate = from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to as string) : new Date();

    // Campaign performance
    const campaignStats = await prisma.campaignAnalytic.aggregate({
      where: { campaign: { orgId }, date: { gte: startDate, lte: endDate } },
      _sum: { sent: true, delivered: true, read: true, clicked: true, converted: true, revenue: true },
    });

    // Flow performance (placeholder - would come from flow execution logs)
    const flowStats = {
      totalTriggered: 0,
      completionRate: 0,
      avgResponseTime: 0,
    };

    // AI agent performance
    const aiAgentSessions = await prisma.aIConversation.count({
      where: { agent: { orgId }, createdAt: { gte: startDate, lte: endDate } },
    });

    res.json({
      campaigns: campaignStats._sum,
      flows: flowStats,
      aiAgents: { sessions: aiAgentSessions },
    });
  } catch (error) { next(error); }
});

export default router;
