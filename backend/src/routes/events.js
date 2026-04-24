const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validatePagination } = require('../middleware/validate');

// Get all events
router.get('/', authenticate, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const sortBy = req.query.sortBy || 'date';
    const sortOrder = req.query.sortOrder || 'desc';
    const status = req.query.status;

    const where = {};
    if (status) where.status = status;
    if (req.query.clientId) where.clientId = req.query.clientId;
    if (req.query.startDate || req.query.endDate) {
      where.date = {};
      if (req.query.startDate) where.date.gte = new Date(req.query.startDate);
      if (req.query.endDate) where.date.lte = new Date(req.query.endDate);
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { client: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const [events, total] = await Promise.all([
      req.prisma.event.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, email: true } },
          venue: true,
          _count: { select: { orders: true, proposals: true } }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit
      }),
      req.prisma.event.count({ where })
    ]);

    res.json({ data: events, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});

// Get event by ID
router.get('/:id', async (req, res) => {
  try {
    const event = await req.prisma.event.findUnique({
      where: { id: req.params.id },
      include: {
        client: { select: { id: true, name: true, email: true, phone: true } },
        venue: true,
        timeline: { orderBy: { time: 'asc' } },
        proposals: { include: { menus: { include: { package: true } } } },
        orders: { include: { package: true, items: { include: { menuItem: true } } } },
        staffAssignments: { include: { staff: { include: { user: true } } } },
        deliveries: { include: { vehicle: true } },
        invoices: true,
        equipmentBookings: { include: { equipment: true } }
      }
    });
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create event
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      name, eventType, date, startTime, endTime, guestCount,
      venueId, clientId, notes, setupRequirements, equipmentNeeds
    } = req.body;

    const event = await req.prisma.event.create({
      data: {
        name,
        eventType: eventType || 'CORPORATE',
        date: new Date(date),
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        guestCount: parseInt(guestCount),
        venueId: venueId || null,
        clientId,
        notes,
        setupRequirements,
        equipmentNeeds
      },
      include: {
        client: { select: { id: true, name: true, email: true } },
        venue: true
      }
    });
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update event
router.put('/:id', authenticate, async (req, res) => {
  try {
    const {
      name, eventType, date, startTime, endTime, guestCount, status,
      venueId, notes, setupRequirements, equipmentNeeds
    } = req.body;

    const event = await req.prisma.event.update({
      where: { id: req.params.id },
      data: {
        name,
        eventType,
        date: date ? new Date(date) : undefined,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        guestCount: guestCount ? parseInt(guestCount) : undefined,
        status,
        venueId: venueId || null,
        notes,
        setupRequirements,
        equipmentNeeds
      },
      include: {
        client: { select: { id: true, name: true, email: true } },
        venue: true
      }
    });
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete event
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await req.prisma.event.delete({ where: { id: req.params.id } });
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get event types (for dropdown)
router.get('/options/types', async (req, res) => {
  res.json([
    { value: 'WEDDING', label: 'Wedding' },
    { value: 'CORPORATE', label: 'Corporate' },
    { value: 'BIRTHDAY', label: 'Birthday' },
    { value: 'ANNIVERSARY', label: 'Anniversary' },
    { value: 'GRADUATION', label: 'Graduation' },
    { value: 'HOLIDAY', label: 'Holiday' },
    { value: 'FUNDRAISER', label: 'Fundraiser' },
    { value: 'OTHER', label: 'Other' }
  ]);
});

// Get event statuses (for dropdown)
router.get('/options/statuses', async (req, res) => {
  res.json([
    { value: 'INQUIRY', label: 'Inquiry' },
    { value: 'PROPOSAL_SENT', label: 'Proposal Sent' },
    { value: 'CONFIRMED', label: 'Confirmed' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' }
  ]);
});

// Get budget levels (for dropdown)
router.get('/options/budget-levels', async (req, res) => {
  res.json([
    { value: 'budget', label: 'Budget-Friendly' },
    { value: 'standard', label: 'Standard' },
    { value: 'premium', label: 'Premium' },
    { value: 'luxury', label: 'Luxury' }
  ]);
});

// Timeline routes
router.post('/:id/timeline', async (req, res) => {
  try {
    const { time, activity, notes } = req.body;
    const timeline = await req.prisma.eventTimeline.create({
      data: {
        eventId: req.params.id,
        time: new Date(time),
        activity,
        notes
      }
    });
    res.status(201).json(timeline);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/timeline/:timelineId', async (req, res) => {
  try {
    const { time, activity, notes, completed } = req.body;
    const timeline = await req.prisma.eventTimeline.update({
      where: { id: req.params.timelineId },
      data: {
        time: time ? new Date(time) : undefined,
        activity,
        notes,
        completed
      }
    });
    res.json(timeline);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id/timeline/:timelineId', async (req, res) => {
  try {
    await req.prisma.eventTimeline.delete({ where: { id: req.params.timelineId } });
    res.json({ message: 'Timeline item deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk delete events
router.post('/bulk-delete', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ error: 'No IDs provided' });
    await req.prisma.event.deleteMany({ where: { id: { in: ids } } });
    res.json({ message: `${ids.length} events deleted` });
  } catch (error) { next(error); }
});

// Bulk update events
router.put('/bulk-update', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { ids, data } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ error: 'No IDs provided' });
    await req.prisma.event.updateMany({ where: { id: { in: ids } }, data });
    res.json({ message: `${ids.length} events updated` });
  } catch (error) { next(error); }
});

// Export events for PDF
router.get('/export/pdf', authenticate, async (req, res, next) => {
  try {
    const events = await req.prisma.event.findMany({
      include: { client: { select: { name: true } }, venue: { select: { name: true } } },
      orderBy: { date: 'desc' }
    });
    const exportData = events.map(e => ({
      name: e.name,
      type: e.eventType,
      date: e.date,
      guestCount: e.guestCount,
      status: e.status,
      client: e.client?.name || '',
      venue: e.venue?.name || ''
    }));
    res.json({ title: 'Events Report', columns: ['Name', 'Type', 'Date', 'Guests', 'Status', 'Client', 'Venue'], rows: exportData });
  } catch (error) { next(error); }
});

module.exports = router;
