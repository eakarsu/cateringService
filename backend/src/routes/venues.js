const express = require('express');
const router = express.Router();

// Get all venues
router.get('/', async (req, res) => {
  try {
    const venues = await req.prisma.venue.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { events: true } }
      }
    });
    res.json(venues);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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
router.post('/', async (req, res) => {
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
router.put('/:id', async (req, res) => {
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
router.delete('/:id', async (req, res) => {
  try {
    await req.prisma.venue.delete({ where: { id: req.params.id } });
    res.json({ message: 'Venue deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
