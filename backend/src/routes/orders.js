const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validatePagination } = require('../middleware/validate');

// Get all orders
router.get('/', authenticate, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder || 'desc';
    const { status, eventId, clientId } = req.query;

    const where = {};
    if (status) where.status = status;
    if (eventId) where.eventId = eventId;
    if (clientId) where.clientId = clientId;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { event: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const [orders, total] = await Promise.all([
      req.prisma.order.findMany({
        where,
        include: {
          event: { select: { name: true, date: true, venue: { select: { name: true } } } },
          client: { select: { name: true, email: true } },
          package: true,
          items: { include: { menuItem: true } },
          _count: { select: { prepLists: true, packLists: true } }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit
      }),
      req.prisma.order.count({ where })
    ]);

    res.json({ data: orders, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});

// Get order by ID
router.get('/:id', async (req, res) => {
  try {
    const order = await req.prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        event: { include: { venue: true, client: true } },
        client: true,
        package: { include: { items: { include: { menuItem: true } } } },
        items: { include: { menuItem: true } },
        prepLists: { include: { items: true } },
        packLists: { include: { items: true } }
      }
    });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create order
router.post('/', authenticate, async (req, res) => {
  try {
    const { eventId, clientId, packageId, guestCount, specialRequests, items, totalAmount } = req.body;

    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

    const order = await req.prisma.order.create({
      data: {
        orderNumber,
        eventId,
        clientId,
        packageId: packageId || null,
        guestCount: parseInt(guestCount),
        specialRequests,
        totalAmount: parseFloat(totalAmount),
        items: items ? {
          create: items.map(item => ({
            menuItemId: item.menuItemId,
            quantity: parseInt(item.quantity),
            unitPrice: parseFloat(item.unitPrice),
            notes: item.notes,
            dietaryMods: item.dietaryMods
          }))
        } : undefined
      },
      include: {
        event: true,
        client: true,
        package: true,
        items: { include: { menuItem: true } }
      }
    });
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { status, guestCount, finalHeadcount, specialRequests, internalNotes, totalAmount } = req.body;

    const order = await req.prisma.order.update({
      where: { id: req.params.id },
      data: {
        status,
        guestCount: guestCount ? parseInt(guestCount) : undefined,
        finalHeadcount: finalHeadcount ? parseInt(finalHeadcount) : undefined,
        specialRequests,
        internalNotes,
        totalAmount: totalAmount ? parseFloat(totalAmount) : undefined
      },
      include: {
        event: true,
        client: true,
        package: true,
        items: { include: { menuItem: true } }
      }
    });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete order
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await req.prisma.order.delete({ where: { id: req.params.id } });
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add item to order
router.post('/:id/items', async (req, res) => {
  try {
    const { menuItemId, quantity, unitPrice, notes, dietaryMods } = req.body;

    const item = await req.prisma.orderItem.create({
      data: {
        orderId: req.params.id,
        menuItemId,
        quantity: parseInt(quantity),
        unitPrice: parseFloat(unitPrice),
        notes,
        dietaryMods
      },
      include: { menuItem: true }
    });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order item
router.put('/:id/items/:itemId', async (req, res) => {
  try {
    const { quantity, notes, dietaryMods } = req.body;

    const item = await req.prisma.orderItem.update({
      where: { id: req.params.itemId },
      data: {
        quantity: quantity ? parseInt(quantity) : undefined,
        notes,
        dietaryMods
      },
      include: { menuItem: true }
    });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete order item
router.delete('/:id/items/:itemId', async (req, res) => {
  try {
    await req.prisma.orderItem.delete({ where: { id: req.params.itemId } });
    res.json({ message: 'Item removed from order' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get order statuses (for dropdown)
router.get('/options/statuses', async (req, res) => {
  res.json([
    { value: 'PENDING', label: 'Pending' },
    { value: 'CONFIRMED', label: 'Confirmed' },
    { value: 'IN_PREP', label: 'In Preparation' },
    { value: 'READY', label: 'Ready' },
    { value: 'IN_TRANSIT', label: 'In Transit' },
    { value: 'DELIVERED', label: 'Delivered' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' }
  ]);
});

// Bulk delete orders
router.post('/bulk-delete', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ error: 'No IDs provided' });
    await req.prisma.order.deleteMany({ where: { id: { in: ids } } });
    res.json({ message: `${ids.length} orders deleted` });
  } catch (error) { next(error); }
});

// Bulk update orders
router.put('/bulk-update', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { ids, data } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ error: 'No IDs provided' });
    await req.prisma.order.updateMany({ where: { id: { in: ids } }, data });
    res.json({ message: `${ids.length} orders updated` });
  } catch (error) { next(error); }
});

// Export orders for PDF
router.get('/export/pdf', authenticate, async (req, res, next) => {
  try {
    const orders = await req.prisma.order.findMany({
      include: {
        event: { select: { name: true } },
        client: { select: { name: true } },
        package: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    const exportData = orders.map(o => ({
      orderNumber: o.orderNumber,
      event: o.event?.name || '',
      client: o.client?.name || '',
      package: o.package?.name || '',
      guestCount: o.guestCount,
      totalAmount: o.totalAmount,
      status: o.status
    }));
    res.json({ title: 'Orders Report', columns: ['Order #', 'Event', 'Client', 'Package', 'Guests', 'Total', 'Status'], rows: exportData });
  } catch (error) { next(error); }
});

module.exports = router;
