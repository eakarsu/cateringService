const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validatePagination } = require('../middleware/validate');

// Get all venues
router.get('/', authenticate, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const sortBy = req.query.sortBy || 'name';
    const sortOrder = req.query.sortOrder || 'asc';

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [venues, total] = await Promise.all([
      req.prisma.venue.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: { select: { events: true } }
        },
        skip,
        take: limit
      }),
      req.prisma.venue.count({ where })
    ]);

    res.json({ data: venues, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});

// Get venue by ID
router.get('/:id', async (req, res) => {
  try {
    const venue = await req.prisma.venue.findUnique({
      where: { id: req.params.id },
      include: {
        events: {
          orderBy: { date: 'desc' },
          take: 10,
          include: { client: { select: { name: true } } }
        }
      }
    });
    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }
    res.json(venue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create venue
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      name, address, city, state, zipCode, capacity,
      contactName, contactPhone, contactEmail, notes, hasKitchen, parkingInfo
    } = req.body;

    const venue = await req.prisma.venue.create({
      data: {
        name,
        address,
        city,
        state,
        zipCode,
        capacity: parseInt(capacity),
        contactName,
        contactPhone,
        contactEmail,
        notes,
        hasKitchen: hasKitchen || false,
        parkingInfo
      }
    });
    res.status(201).json(venue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update venue
router.put('/:id', authenticate, async (req, res) => {
  try {
    const {
      name, address, city, state, zipCode, capacity,
      contactName, contactPhone, contactEmail, notes, hasKitchen, parkingInfo
    } = req.body;

    const venue = await req.prisma.venue.update({
      where: { id: req.params.id },
      data: {
        name,
        address,
        city,
        state,
        zipCode,
        capacity: capacity ? parseInt(capacity) : undefined,
        contactName,
        contactPhone,
        contactEmail,
        notes,
        hasKitchen,
        parkingInfo
      }
    });
    res.json(venue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete venue
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await req.prisma.venue.delete({ where: { id: req.params.id } });
    res.json({ message: 'Venue deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk delete venues
router.post('/bulk-delete', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ error: 'No IDs provided' });
    await req.prisma.venue.deleteMany({ where: { id: { in: ids } } });
    res.json({ message: `${ids.length} venues deleted` });
  } catch (error) { next(error); }
});

// Bulk update venues
router.put('/bulk-update', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { ids, data } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ error: 'No IDs provided' });
    await req.prisma.venue.updateMany({ where: { id: { in: ids } }, data });
    res.json({ message: `${ids.length} venues updated` });
  } catch (error) { next(error); }
});

// Export venues for PDF
router.get('/export/pdf', authenticate, async (req, res, next) => {
  try {
    const venues = await req.prisma.venue.findMany({
      orderBy: { name: 'asc' }
    });
    const exportData = venues.map(v => ({
      name: v.name,
      address: v.address,
      city: v.city,
      state: v.state,
      capacity: v.capacity,
      contactName: v.contactName || '',
      contactPhone: v.contactPhone || ''
    }));
    res.json({ title: 'Venues Report', columns: ['Name', 'Address', 'City', 'State', 'Capacity', 'Contact', 'Phone'], rows: exportData });
  } catch (error) { next(error); }
});

module.exports = router;
