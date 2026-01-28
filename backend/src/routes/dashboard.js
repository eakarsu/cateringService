const express = require('express');
const router = express.Router();

// Get dashboard overview
router.get('/overview', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const thisWeekEnd = new Date(today);
    thisWeekEnd.setDate(thisWeekEnd.getDate() + 7);
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Events counts
    const [
      totalEvents,
      upcomingEvents,
      todayEvents,
      thisWeekEvents
    ] = await Promise.all([
      req.prisma.event.count(),
      req.prisma.event.count({ where: { date: { gte: today }, status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
      req.prisma.event.count({ where: { date: { gte: today, lt: tomorrow } } }),
      req.prisma.event.count({ where: { date: { gte: today, lt: thisWeekEnd } } })
    ]);

    // Orders counts
    const [pendingOrders, inProgressOrders] = await Promise.all([
      req.prisma.order.count({ where: { status: 'PENDING' } }),
      req.prisma.order.count({ where: { status: 'IN_PREP' } })
    ]);

    // Revenue this month
    const monthlyInvoices = await req.prisma.invoice.findMany({
      where: {
        status: 'PAID',
        createdAt: { gte: thisMonthStart, lte: thisMonthEnd }
      },
      select: { total: true }
    });
    const monthlyRevenue = monthlyInvoices.reduce((sum, inv) => sum + inv.total, 0);

    // Pending payments
    const pendingInvoices = await req.prisma.invoice.findMany({
      where: { status: { in: ['SENT', 'VIEWED', 'PARTIALLY_PAID'] } },
      select: { total: true }
    });
    const pendingPayments = pendingInvoices.reduce((sum, inv) => sum + inv.total, 0);

    // Staff on today
    const staffToday = await req.prisma.staffAssignment.count({
      where: { startTime: { gte: today, lt: tomorrow } }
    });

    // Proposals pending
    const pendingProposals = await req.prisma.proposal.count({
      where: { status: { in: ['DRAFT', 'SENT', 'VIEWED'] } }
    });

    res.json({
      events: {
        total: totalEvents,
        upcoming: upcomingEvents,
        today: todayEvents,
        thisWeek: thisWeekEvents
      },
      orders: {
        pending: pendingOrders,
        inProgress: inProgressOrders
      },
      revenue: {
        thisMonth: monthlyRevenue,
        pendingPayments
      },
      staff: {
        scheduledToday: staffToday
      },
      proposals: {
        pending: pendingProposals
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get upcoming events
router.get('/upcoming-events', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const events = await req.prisma.event.findMany({
      where: {
        date: { gte: today },
        status: { notIn: ['COMPLETED', 'CANCELLED'] }
      },
      include: {
        client: { select: { name: true } },
        venue: { select: { name: true } },
        _count: { select: { orders: true, staffAssignments: true } }
      },
      orderBy: { date: 'asc' },
      take: 10
    });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get recent orders
router.get('/recent-orders', async (req, res) => {
  try {
    const orders = await req.prisma.order.findMany({
      include: {
        event: { select: { name: true, date: true } },
        client: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get today's schedule
router.get('/today-schedule', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [events, deliveries, assignments] = await Promise.all([
      req.prisma.event.findMany({
        where: { date: { gte: today, lt: tomorrow } },
        include: {
          venue: true,
          client: { select: { name: true } }
        },
        orderBy: { startTime: 'asc' }
      }),
      req.prisma.delivery.findMany({
        where: { scheduledTime: { gte: today, lt: tomorrow } },
        include: {
          event: { include: { venue: true } },
          vehicle: true
        },
        orderBy: { scheduledTime: 'asc' }
      }),
      req.prisma.staffAssignment.findMany({
        where: { startTime: { gte: today, lt: tomorrow } },
        include: {
          staff: { include: { user: { select: { name: true } } } },
          event: { select: { name: true } }
        },
        orderBy: { startTime: 'asc' }
      })
    ]);

    res.json({ events, deliveries, assignments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get revenue stats
router.get('/revenue-stats', async (req, res) => {
  try {
    const today = new Date();
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    const [thisMonthPaid, lastMonthPaid, thisMonthPending] = await Promise.all([
      req.prisma.invoice.aggregate({
        where: { status: 'PAID', createdAt: { gte: thisMonth } },
        _sum: { total: true }
      }),
      req.prisma.invoice.aggregate({
        where: { status: 'PAID', createdAt: { gte: lastMonth, lte: lastMonthEnd } },
        _sum: { total: true }
      }),
      req.prisma.invoice.aggregate({
        where: { status: { in: ['SENT', 'VIEWED', 'PARTIALLY_PAID'] }, createdAt: { gte: thisMonth } },
        _sum: { total: true }
      })
    ]);

    res.json({
      thisMonth: thisMonthPaid._sum.total || 0,
      lastMonth: lastMonthPaid._sum.total || 0,
      pending: thisMonthPending._sum.total || 0,
      growth: lastMonthPaid._sum.total
        ? (((thisMonthPaid._sum.total || 0) - lastMonthPaid._sum.total) / lastMonthPaid._sum.total) * 100
        : 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get low stock ingredients
router.get('/low-stock', async (req, res) => {
  try {
    const ingredients = await req.prisma.ingredient.findMany({
      where: {
        isActive: true,
        parLevel: { not: null }
      }
    });

    const lowStock = ingredients.filter(ing => ing.currentStock < ing.parLevel);
    res.json(lowStock);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pending tasks
router.get('/pending-tasks', async (req, res) => {
  try {
    const [
      pendingProposals,
      draftInvoices,
      unconfirmedAssignments,
      pendingPrepLists
    ] = await Promise.all([
      req.prisma.proposal.count({ where: { status: 'DRAFT' } }),
      req.prisma.invoice.count({ where: { status: 'DRAFT' } }),
      req.prisma.staffAssignment.count({ where: { confirmed: false } }),
      req.prisma.prepList.count({ where: { status: 'PENDING' } })
    ]);

    res.json({
      tasks: [
        { type: 'proposals', label: 'Draft Proposals', count: pendingProposals },
        { type: 'invoices', label: 'Draft Invoices', count: draftInvoices },
        { type: 'assignments', label: 'Unconfirmed Staff', count: unconfirmedAssignments },
        { type: 'prep', label: 'Pending Prep Lists', count: pendingPrepLists }
      ]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
