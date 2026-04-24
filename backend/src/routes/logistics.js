const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validatePagination } = require('../middleware/validate');

// ==================== VEHICLES ====================

// Get all vehicles
router.get('/vehicles', authenticate, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const sortBy = req.query.sortBy || 'name';
    const sortOrder = req.query.sortOrder || 'asc';
    const { available } = req.query;

    const where = {};
    if (available !== undefined) where.isAvailable = available === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { licensePlate: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [vehicles, total] = await Promise.all([
      req.prisma.vehicle.findMany({
        where,
        include: {
          deliveries: {
            where: { status: { notIn: ['RETURNED'] } },
            include: { event: { select: { name: true, date: true } } }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit
      }),
      req.prisma.vehicle.count({ where })
    ]);

    res.json({ data: vehicles, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});

// Get vehicle by ID
router.get('/vehicles/:id', async (req, res) => {
  try {
    const vehicle = await req.prisma.vehicle.findUnique({
      where: { id: req.params.id },
      include: {
        deliveries: {
          orderBy: { scheduledTime: 'desc' },
          include: { event: true }
        }
      }
    });
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    res.json(vehicle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create vehicle
router.post('/vehicles', authenticate, async (req, res) => {
  try {
    const { name, type, licensePlate, capacity, notes } = req.body;

    const vehicle = await req.prisma.vehicle.create({
      data: { name, type, licensePlate, capacity, notes }
    });
    res.status(201).json(vehicle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update vehicle
router.put('/vehicles/:id', authenticate, async (req, res) => {
  try {
    const { name, type, licensePlate, capacity, isAvailable, notes } = req.body;

    const vehicle = await req.prisma.vehicle.update({
      where: { id: req.params.id },
      data: { name, type, licensePlate, capacity, isAvailable, notes }
    });
    res.json(vehicle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete vehicle
router.delete('/vehicles/:id', authenticate, async (req, res) => {
  try {
    await req.prisma.vehicle.delete({ where: { id: req.params.id } });
    res.json({ message: 'Vehicle deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== DELIVERIES ====================

// Get all deliveries
router.get('/deliveries', authenticate, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const sortBy = req.query.sortBy || 'scheduledTime';
    const sortOrder = req.query.sortOrder || 'asc';
    const { status, date, vehicleId, eventId } = req.query;

    const where = {};
    if (status) where.status = status;
    if (vehicleId) where.vehicleId = vehicleId;
    if (eventId) where.eventId = eventId;
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      where.scheduledTime = { gte: startOfDay, lte: endOfDay };
    }
    if (search) {
      where.OR = [
        { driverName: { contains: search, mode: 'insensitive' } },
        { event: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const [deliveries, total] = await Promise.all([
      req.prisma.delivery.findMany({
        where,
        include: {
          event: { include: { venue: true, client: { select: { name: true } } } },
          vehicle: true
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit
      }),
      req.prisma.delivery.count({ where })
    ]);

    res.json({ data: deliveries, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});

// Get delivery by ID
router.get('/deliveries/:id', async (req, res) => {
  try {
    const delivery = await req.prisma.delivery.findUnique({
      where: { id: req.params.id },
      include: {
        event: { include: { venue: true, client: true, orders: true } },
        vehicle: true
      }
    });
    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    res.json(delivery);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create delivery
router.post('/deliveries', authenticate, async (req, res) => {
  try {
    const { eventId, vehicleId, scheduledTime, driverName, routeNotes, setupCrew } = req.body;

    const delivery = await req.prisma.delivery.create({
      data: {
        eventId,
        vehicleId: vehicleId || null,
        scheduledTime: new Date(scheduledTime),
        driverName,
        routeNotes,
        setupCrew
      },
      include: { event: true, vehicle: true }
    });
    res.status(201).json(delivery);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update delivery
router.put('/deliveries/:id', authenticate, async (req, res) => {
  try {
    const {
      vehicleId, scheduledTime, actualDeparture, actualArrival,
      status, driverName, routeNotes, setupCrew
    } = req.body;

    const delivery = await req.prisma.delivery.update({
      where: { id: req.params.id },
      data: {
        vehicleId: vehicleId || null,
        scheduledTime: scheduledTime ? new Date(scheduledTime) : undefined,
        actualDeparture: actualDeparture ? new Date(actualDeparture) : undefined,
        actualArrival: actualArrival ? new Date(actualArrival) : undefined,
        status,
        driverName,
        routeNotes,
        setupCrew
      },
      include: { event: true, vehicle: true }
    });
    res.json(delivery);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update delivery status
router.post('/deliveries/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const updateData = { status };

    if (status === 'IN_TRANSIT') {
      updateData.actualDeparture = new Date();
    } else if (status === 'ARRIVED') {
      updateData.actualArrival = new Date();
    }

    const delivery = await req.prisma.delivery.update({
      where: { id: req.params.id },
      data: updateData,
      include: { event: true, vehicle: true }
    });
    res.json(delivery);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete delivery
router.delete('/deliveries/:id', authenticate, async (req, res) => {
  try {
    await req.prisma.delivery.delete({ where: { id: req.params.id } });
    res.json({ message: 'Delivery deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== EQUIPMENT ====================

// Get all equipment
router.get('/equipment', async (req, res) => {
  try {
    const { category } = req.query;
    const where = {};
    if (category) where.category = category;

    const equipment = await req.prisma.equipment.findMany({
      where,
      include: {
        bookings: {
          where: { returned: false },
          include: { event: { select: { name: true, date: true } } }
        }
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }]
    });
    res.json(equipment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get equipment by ID
router.get('/equipment/:id', async (req, res) => {
  try {
    const equipment = await req.prisma.equipment.findUnique({
      where: { id: req.params.id },
      include: {
        bookings: {
          orderBy: { createdAt: 'desc' },
          include: { event: true }
        }
      }
    });
    if (!equipment) {
      return res.status(404).json({ error: 'Equipment not found' });
    }
    res.json(equipment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create equipment
router.post('/equipment', async (req, res) => {
  try {
    const { name, category, quantity, description, notes } = req.body;

    const equipment = await req.prisma.equipment.create({
      data: {
        name,
        category,
        quantity: parseInt(quantity),
        available: parseInt(quantity),
        description,
        notes
      }
    });
    res.status(201).json(equipment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update equipment
router.put('/equipment/:id', async (req, res) => {
  try {
    const { name, category, quantity, available, description, notes } = req.body;

    const equipment = await req.prisma.equipment.update({
      where: { id: req.params.id },
      data: {
        name,
        category,
        quantity: quantity ? parseInt(quantity) : undefined,
        available: available !== undefined ? parseInt(available) : undefined,
        description,
        notes
      }
    });
    res.json(equipment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Book equipment for event
router.post('/equipment/:id/book', async (req, res) => {
  try {
    const { eventId, quantity, notes } = req.body;

    const equipment = await req.prisma.equipment.findUnique({
      where: { id: req.params.id }
    });

    if (equipment.available < parseInt(quantity)) {
      return res.status(400).json({ error: 'Not enough equipment available' });
    }

    const booking = await req.prisma.equipmentBooking.create({
      data: {
        equipmentId: req.params.id,
        eventId,
        quantity: parseInt(quantity),
        notes
      },
      include: { equipment: true, event: true }
    });

    await req.prisma.equipment.update({
      where: { id: req.params.id },
      data: { available: equipment.available - parseInt(quantity) }
    });

    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Return equipment
router.post('/equipment/bookings/:bookingId/return', async (req, res) => {
  try {
    const booking = await req.prisma.equipmentBooking.findUnique({
      where: { id: req.params.bookingId },
      include: { equipment: true }
    });

    if (booking.returned) {
      return res.status(400).json({ error: 'Equipment already returned' });
    }

    await req.prisma.equipmentBooking.update({
      where: { id: req.params.bookingId },
      data: { returned: true }
    });

    await req.prisma.equipment.update({
      where: { id: booking.equipmentId },
      data: { available: booking.equipment.available + booking.quantity }
    });

    res.json({ message: 'Equipment returned' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get delivery statuses (for dropdown)
router.get('/options/delivery-statuses', async (req, res) => {
  res.json([
    { value: 'SCHEDULED', label: 'Scheduled' },
    { value: 'LOADING', label: 'Loading' },
    { value: 'IN_TRANSIT', label: 'In Transit' },
    { value: 'ARRIVED', label: 'Arrived' },
    { value: 'SETUP_COMPLETE', label: 'Setup Complete' },
    { value: 'RETURNED', label: 'Returned' }
  ]);
});

// Get vehicle types (for dropdown)
router.get('/options/vehicle-types', async (req, res) => {
  res.json([
    { value: 'VAN', label: 'Van' },
    { value: 'TRUCK', label: 'Truck' },
    { value: 'REFRIGERATED', label: 'Refrigerated Truck' },
    { value: 'CAR', label: 'Car' },
    { value: 'OTHER', label: 'Other' }
  ]);
});

// Get equipment categories (for dropdown)
router.get('/options/equipment-categories', async (req, res) => {
  res.json([
    { value: 'SERVING', label: 'Serving Equipment' },
    { value: 'COOKING', label: 'Cooking Equipment' },
    { value: 'TABLES', label: 'Tables' },
    { value: 'CHAIRS', label: 'Chairs' },
    { value: 'LINENS', label: 'Linens' },
    { value: 'DECOR', label: 'Decor' },
    { value: 'CHAFING', label: 'Chafing Dishes' },
    { value: 'BEVERAGE', label: 'Beverage Equipment' },
    { value: 'OTHER', label: 'Other' }
  ]);
});

// Bulk delete vehicles
router.post('/vehicles/bulk-delete', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ error: 'No IDs provided' });
    await req.prisma.vehicle.deleteMany({ where: { id: { in: ids } } });
    res.json({ message: `${ids.length} vehicles deleted` });
  } catch (error) { next(error); }
});

// Bulk update vehicles
router.put('/vehicles/bulk-update', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { ids, data } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ error: 'No IDs provided' });
    await req.prisma.vehicle.updateMany({ where: { id: { in: ids } }, data });
    res.json({ message: `${ids.length} vehicles updated` });
  } catch (error) { next(error); }
});

// Bulk delete deliveries
router.post('/deliveries/bulk-delete', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ error: 'No IDs provided' });
    await req.prisma.delivery.deleteMany({ where: { id: { in: ids } } });
    res.json({ message: `${ids.length} deliveries deleted` });
  } catch (error) { next(error); }
});

// Bulk update deliveries
router.put('/deliveries/bulk-update', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { ids, data } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ error: 'No IDs provided' });
    await req.prisma.delivery.updateMany({ where: { id: { in: ids } }, data });
    res.json({ message: `${ids.length} deliveries updated` });
  } catch (error) { next(error); }
});

// Export vehicles for PDF
router.get('/vehicles/export/pdf', authenticate, async (req, res, next) => {
  try {
    const vehicles = await req.prisma.vehicle.findMany({
      orderBy: { name: 'asc' }
    });
    const exportData = vehicles.map(v => ({
      name: v.name,
      type: v.type,
      licensePlate: v.licensePlate || '',
      capacity: v.capacity || '',
      isAvailable: v.isAvailable ? 'Available' : 'Unavailable'
    }));
    res.json({ title: 'Vehicles Report', columns: ['Name', 'Type', 'License Plate', 'Capacity', 'Status'], rows: exportData });
  } catch (error) { next(error); }
});

// Export deliveries for PDF
router.get('/deliveries/export/pdf', authenticate, async (req, res, next) => {
  try {
    const deliveries = await req.prisma.delivery.findMany({
      include: {
        event: { select: { name: true } },
        vehicle: { select: { name: true } }
      },
      orderBy: { scheduledTime: 'desc' }
    });
    const exportData = deliveries.map(d => ({
      event: d.event?.name || '',
      vehicle: d.vehicle?.name || '',
      driverName: d.driverName || '',
      scheduledTime: d.scheduledTime,
      status: d.status
    }));
    res.json({ title: 'Deliveries Report', columns: ['Event', 'Vehicle', 'Driver', 'Scheduled Time', 'Status'], rows: exportData });
  } catch (error) { next(error); }
});

module.exports = router;
