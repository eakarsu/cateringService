const express = require('express');
const router = express.Router();

// Get all guests for an event
router.get('/event/:eventId', async (req, res) => {
  try {
    const guests = await req.prisma.guest.findMany({
      where: { eventId: req.params.eventId },
      orderBy: { name: 'asc' }
    });
    res.json(guests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get dietary summary for an event
router.get('/event/:eventId/dietary-summary', async (req, res) => {
  try {
    const guests = await req.prisma.guest.findMany({
      where: { eventId: req.params.eventId }
    });

    const summary = {
      total: guests.length,
      vegetarian: guests.filter(g => g.isVegetarian).length,
      vegan: guests.filter(g => g.isVegan).length,
      glutenFree: guests.filter(g => g.isGlutenFree).length,
      dairyFree: guests.filter(g => g.isDairyFree).length,
      nutFree: guests.filter(g => g.isNutFree).length,
      withAllergies: guests.filter(g => g.otherAllergies).length,
      rsvpConfirmed: guests.filter(g => g.rsvpStatus === 'CONFIRMED').length,
      rsvpPending: guests.filter(g => g.rsvpStatus === 'PENDING').length,
      rsvpDeclined: guests.filter(g => g.rsvpStatus === 'DECLINED').length
    };

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get guest by ID
router.get('/:id', async (req, res) => {
  try {
    const guest = await req.prisma.guest.findUnique({
      where: { id: req.params.id },
      include: { event: true }
    });
    if (!guest) {
      return res.status(404).json({ error: 'Guest not found' });
    }
    res.json(guest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create guest
router.post('/', async (req, res) => {
  try {
    const {
      eventId, name, email, phone,
      isVegetarian, isVegan, isGlutenFree, isDairyFree, isNutFree,
      otherAllergies, mealPreference, notes, rsvpStatus
    } = req.body;

    // Validate required fields
    if (!eventId) {
      return res.status(400).json({ error: 'Event ID is required' });
    }
    if (!name) {
      return res.status(400).json({ error: 'Guest name is required' });
    }

    // Verify event exists
    const event = await req.prisma.event.findUnique({
      where: { id: eventId }
    });
    if (!event) {
      return res.status(400).json({ error: 'Event not found. Please select a valid event.' });
    }

    const guest = await req.prisma.guest.create({
      data: {
        eventId,
        name,
        email: email || null,
        phone: phone || null,
        isVegetarian: isVegetarian || false,
        isVegan: isVegan || false,
        isGlutenFree: isGlutenFree || false,
        isDairyFree: isDairyFree || false,
        isNutFree: isNutFree || false,
        otherAllergies: otherAllergies || null,
        mealPreference: mealPreference || null,
        notes: notes || null,
        rsvpStatus: rsvpStatus || 'PENDING'
      }
    });
    res.status(201).json(guest);
  } catch (error) {
    console.error('Error creating guest:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update guest
router.put('/:id', async (req, res) => {
  try {
    const {
      name, email, phone,
      isVegetarian, isVegan, isGlutenFree, isDairyFree, isNutFree,
      otherAllergies, mealPreference, notes, rsvpStatus
    } = req.body;

    const guest = await req.prisma.guest.update({
      where: { id: req.params.id },
      data: {
        name,
        email,
        phone,
        isVegetarian,
        isVegan,
        isGlutenFree,
        isDairyFree,
        isNutFree,
        otherAllergies,
        mealPreference,
        notes,
        rsvpStatus
      }
    });
    res.json(guest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete guest
router.delete('/:id', async (req, res) => {
  try {
    await req.prisma.guest.delete({ where: { id: req.params.id } });
    res.json({ message: 'Guest deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk import guests
router.post('/bulk-import', async (req, res) => {
  try {
    const { eventId, guests } = req.body;

    const createdGuests = await req.prisma.guest.createMany({
      data: guests.map(g => ({
        eventId,
        name: g.name,
        email: g.email,
        phone: g.phone,
        isVegetarian: g.isVegetarian || false,
        isVegan: g.isVegan || false,
        isGlutenFree: g.isGlutenFree || false,
        isDairyFree: g.isDairyFree || false,
        isNutFree: g.isNutFree || false,
        otherAllergies: g.otherAllergies,
        mealPreference: g.mealPreference,
        notes: g.notes,
        rsvpStatus: g.rsvpStatus || 'PENDING'
      }))
    });

    res.status(201).json({ count: createdGuests.count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export guests for an event
router.get('/event/:eventId/export', async (req, res) => {
  try {
    const guests = await req.prisma.guest.findMany({
      where: { eventId: req.params.eventId },
      orderBy: { name: 'asc' }
    });

    const event = await req.prisma.event.findUnique({
      where: { id: req.params.eventId },
      select: { name: true }
    });

    // Return CSV-formatted data
    const headers = ['Name', 'Email', 'Phone', 'RSVP', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Other Allergies', 'Meal Preference', 'Notes'];
    const rows = guests.map(g => [
      g.name,
      g.email || '',
      g.phone || '',
      g.rsvpStatus,
      g.isVegetarian ? 'Yes' : 'No',
      g.isVegan ? 'Yes' : 'No',
      g.isGlutenFree ? 'Yes' : 'No',
      g.isDairyFree ? 'Yes' : 'No',
      g.isNutFree ? 'Yes' : 'No',
      g.otherAllergies || '',
      g.mealPreference || '',
      g.notes || ''
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${event?.name || 'guests'}-guest-list.csv"`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get RSVP status options
router.get('/options/rsvp-statuses', async (req, res) => {
  res.json([
    { value: 'PENDING', label: 'Pending' },
    { value: 'CONFIRMED', label: 'Confirmed' },
    { value: 'DECLINED', label: 'Declined' },
    { value: 'MAYBE', label: 'Maybe' }
  ]);
});

module.exports = router;
