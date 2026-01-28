const express = require('express');
const router = express.Router();

// ==================== STAFF ====================

// Get all staff
router.get('/', async (req, res) => {
  try {
    const { position, isActive } = req.query;
    const where = {};
    if (position) where.position = position;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const staff = await req.prisma.staff.findMany({
      where,
      include: {
        user: { select: { name: true, email: true, phone: true } },
        assignments: {
          where: { event: { date: { gte: new Date() } } },
          include: { event: { select: { name: true, date: true } } },
          orderBy: { startTime: 'asc' },
          take: 5
        }
      },
      orderBy: { user: { name: 'asc' } }
    });
    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get staff by ID
router.get('/:id', async (req, res) => {
  try {
    const staff = await req.prisma.staff.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        assignments: {
          orderBy: { startTime: 'desc' },
          include: { event: { include: { venue: true } } }
        },
        timeEntries: {
          orderBy: { date: 'desc' },
          take: 30
        }
      }
    });
    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }
    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create staff profile (with optional new user creation)
router.post('/', async (req, res) => {
  try {
    const {
      userId, position, hourlyRate, skills, uniformSize,
      availability, emergencyContact, emergencyPhone, notes,
      createNew, newUserName, newUserEmail, newUserPhone
    } = req.body;

    let finalUserId = userId;

    // If creating a new user along with staff profile
    if (createNew && newUserName && newUserEmail) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('password123', 10);

      const newUser = await req.prisma.user.create({
        data: {
          email: newUserEmail,
          password: hashedPassword,
          name: newUserName,
          phone: newUserPhone || null,
          role: 'STAFF'
        }
      });
      finalUserId = newUser.id;
    }

    const staff = await req.prisma.staff.create({
      data: {
        userId: finalUserId,
        position,
        hourlyRate: parseFloat(hourlyRate),
        skills,
        uniformSize,
        availability,
        emergencyContact,
        emergencyPhone,
        notes
      },
      include: { user: { select: { name: true, email: true, phone: true } } }
    });
    res.status(201).json(staff);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update staff
router.put('/:id', async (req, res) => {
  try {
    const {
      position, hourlyRate, skills, uniformSize,
      availability, emergencyContact, emergencyPhone, notes, isActive
    } = req.body;

    const staff = await req.prisma.staff.update({
      where: { id: req.params.id },
      data: {
        position,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
        skills,
        uniformSize,
        availability,
        emergencyContact,
        emergencyPhone,
        notes,
        isActive
      },
      include: { user: { select: { name: true, email: true, phone: true } } }
    });
    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete staff
router.delete('/:id', async (req, res) => {
  try {
    await req.prisma.staff.delete({ where: { id: req.params.id } });
    res.json({ message: 'Staff deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ASSIGNMENTS ====================

// Get all assignments
router.get('/assignments/all', async (req, res) => {
  try {
    const { eventId, staffId, date } = req.query;
    const where = {};
    if (eventId) where.eventId = eventId;
    if (staffId) where.staffId = staffId;
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      where.startTime = { gte: startOfDay, lte: endOfDay };
    }

    const assignments = await req.prisma.staffAssignment.findMany({
      where,
      include: {
        staff: { include: { user: { select: { name: true, phone: true } } } },
        event: { include: { venue: true } }
      },
      orderBy: { startTime: 'asc' }
    });
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get assignment by ID
router.get('/assignments/:id', async (req, res) => {
  try {
    const assignment = await req.prisma.staffAssignment.findUnique({
      where: { id: req.params.id },
      include: {
        staff: { include: { user: true } },
        event: { include: { venue: true, client: true } }
      }
    });
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    res.json(assignment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create assignment
router.post('/assignments', async (req, res) => {
  try {
    const { staffId, eventId, role, startTime, endTime, notes } = req.body;

    const assignment = await req.prisma.staffAssignment.create({
      data: {
        staffId,
        eventId,
        role,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        notes
      },
      include: {
        staff: { include: { user: { select: { name: true } } } },
        event: { select: { name: true, date: true } }
      }
    });
    res.status(201).json(assignment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update assignment
router.put('/assignments/:id', async (req, res) => {
  try {
    const { role, startTime, endTime, confirmed, notes } = req.body;

    const assignment = await req.prisma.staffAssignment.update({
      where: { id: req.params.id },
      data: {
        role,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        confirmed,
        notes
      },
      include: {
        staff: { include: { user: { select: { name: true } } } },
        event: { select: { name: true, date: true } }
      }
    });
    res.json(assignment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete assignment
router.delete('/assignments/:id', async (req, res) => {
  try {
    await req.prisma.staffAssignment.delete({ where: { id: req.params.id } });
    res.json({ message: 'Assignment deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== TIME TRACKING ====================

// Get all time entries
router.get('/time-entries/all', async (req, res) => {
  try {
    const { staffId, startDate, endDate, approved } = req.query;
    const where = {};
    if (staffId) where.staffId = staffId;
    if (approved !== undefined) where.approved = approved === 'true';
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const entries = await req.prisma.timeEntry.findMany({
      where,
      include: {
        staff: { include: { user: { select: { name: true } } } }
      },
      orderBy: { date: 'desc' }
    });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clock in
router.post('/time-entries/clock-in', async (req, res) => {
  try {
    const { staffId, notes } = req.body;

    const entry = await req.prisma.timeEntry.create({
      data: {
        staffId,
        date: new Date(),
        clockIn: new Date(),
        notes
      },
      include: { staff: { include: { user: { select: { name: true } } } } }
    });
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clock out
router.post('/time-entries/:id/clock-out', async (req, res) => {
  try {
    const { breakMinutes } = req.body;

    const entry = await req.prisma.timeEntry.findUnique({
      where: { id: req.params.id }
    });

    const clockOut = new Date();
    const totalMinutes = (clockOut - new Date(entry.clockIn)) / 60000;
    const totalHours = (totalMinutes - (breakMinutes || 0)) / 60;

    const updated = await req.prisma.timeEntry.update({
      where: { id: req.params.id },
      data: {
        clockOut,
        breakMinutes: breakMinutes || 0,
        totalHours: Math.round(totalHours * 100) / 100
      },
      include: { staff: { include: { user: { select: { name: true } } } } }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve time entry
router.post('/time-entries/:id/approve', async (req, res) => {
  try {
    const entry = await req.prisma.timeEntry.update({
      where: { id: req.params.id },
      data: { approved: true }
    });
    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get staff positions (for dropdown)
router.get('/options/positions', async (req, res) => {
  res.json([
    { value: 'SERVER', label: 'Server' },
    { value: 'BARTENDER', label: 'Bartender' },
    { value: 'CHEF', label: 'Chef' },
    { value: 'SOUS_CHEF', label: 'Sous Chef' },
    { value: 'LINE_COOK', label: 'Line Cook' },
    { value: 'PREP_COOK', label: 'Prep Cook' },
    { value: 'DISHWASHER', label: 'Dishwasher' },
    { value: 'EVENT_CAPTAIN', label: 'Event Captain' },
    { value: 'DRIVER', label: 'Driver' },
    { value: 'SETUP_CREW', label: 'Setup Crew' },
    { value: 'MANAGER', label: 'Manager' }
  ]);
});

// Get uniform sizes (for dropdown)
router.get('/options/uniform-sizes', async (req, res) => {
  res.json([
    { value: 'XS', label: 'Extra Small' },
    { value: 'S', label: 'Small' },
    { value: 'M', label: 'Medium' },
    { value: 'L', label: 'Large' },
    { value: 'XL', label: 'Extra Large' },
    { value: 'XXL', label: '2XL' },
    { value: 'XXXL', label: '3XL' }
  ]);
});

module.exports = router;
