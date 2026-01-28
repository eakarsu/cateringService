const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Get all orders
router.get('/', async (req, res) => {
  try {
    const { status, eventId, clientId } = req.query;
    const where = {};
    if (status) where.status = status;
    if (eventId) where.eventId = eventId;
    if (clientId) where.clientId = clientId;

    const orders = await req.prisma.order.findMany({
      where,
      include: {
        event: { select: { name: true, date: true, venue: { select: { name: true } } } },
        client: { select: { name: true, email: true } },
        package: true,
        items: { include: { menuItem: true } },
        _count: { select: { prepLists: true, packLists: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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
router.post('/', async (req, res) => {
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
router.put('/:id', async (req, res) => {
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
router.delete('/:id', async (req, res) => {
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

module.exports = router;
