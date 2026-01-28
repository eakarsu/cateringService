const express = require('express');
const router = express.Router();

// Get all proposals
router.get('/', async (req, res) => {
  try {
    const { status, eventId } = req.query;
    const where = {};
    if (status) where.status = status;
    if (eventId) where.eventId = eventId;

    const proposals = await req.prisma.proposal.findMany({
      where,
      include: {
        event: { include: { client: { select: { name: true, email: true } }, venue: true } },
        createdBy: { select: { name: true } },
        menus: { include: { package: true } },
        lineItems: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(proposals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get proposal by ID
router.get('/:id', async (req, res) => {
  try {
    const proposal = await req.prisma.proposal.findUnique({
      where: { id: req.params.id },
      include: {
        event: { include: { client: true, venue: true } },
        createdBy: { select: { name: true, email: true } },
        menus: { include: { package: { include: { items: { include: { menuItem: true } } } } } },
        lineItems: true
      }
    });
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    res.json(proposal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create proposal
router.post('/', async (req, res) => {
  try {
    const { eventId, createdById, totalAmount, validUntil, notes, menus, lineItems } = req.body;

    const proposal = await req.prisma.proposal.create({
      data: {
        eventId,
        createdById,
        totalAmount: parseFloat(totalAmount),
        validUntil: new Date(validUntil),
        notes,
        menus: menus ? {
          create: menus.map(m => ({
            packageId: m.packageId,
            guestCount: parseInt(m.guestCount),
            pricePerPerson: parseFloat(m.pricePerPerson),
            notes: m.notes
          }))
        } : undefined,
        lineItems: lineItems ? {
          create: lineItems.map(l => ({
            description: l.description,
            quantity: parseInt(l.quantity) || 1,
            unitPrice: parseFloat(l.unitPrice),
            total: parseFloat(l.total),
            category: l.category
          }))
        } : undefined
      },
      include: {
        event: { include: { client: true } },
        menus: { include: { package: true } },
        lineItems: true
      }
    });
    res.status(201).json(proposal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update proposal
router.put('/:id', async (req, res) => {
  try {
    const { status, totalAmount, validUntil, notes, signatureUrl, signedAt, signedBy } = req.body;

    const proposal = await req.prisma.proposal.update({
      where: { id: req.params.id },
      data: {
        status,
        totalAmount: totalAmount ? parseFloat(totalAmount) : undefined,
        validUntil: validUntil ? new Date(validUntil) : undefined,
        notes,
        signatureUrl,
        signedAt: signedAt ? new Date(signedAt) : undefined,
        signedBy
      },
      include: {
        event: { include: { client: true } },
        menus: { include: { package: true } },
        lineItems: true
      }
    });
    res.json(proposal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete proposal
router.delete('/:id', async (req, res) => {
  try {
    await req.prisma.proposal.delete({ where: { id: req.params.id } });
    res.json({ message: 'Proposal deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send proposal
router.post('/:id/send', async (req, res) => {
  try {
    const proposal = await req.prisma.proposal.update({
      where: { id: req.params.id },
      data: { status: 'SENT' }
    });
    // In production, send email here
    res.json({ message: 'Proposal sent successfully', proposal });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sign proposal (e-signature)
router.post('/:id/sign', async (req, res) => {
  try {
    const { signatureUrl, signedBy } = req.body;

    const proposal = await req.prisma.proposal.update({
      where: { id: req.params.id },
      data: {
        status: 'ACCEPTED',
        signatureUrl,
        signedAt: new Date(),
        signedBy
      }
    });

    // Update event status
    await req.prisma.event.update({
      where: { id: proposal.eventId },
      data: { status: 'CONFIRMED' }
    });

    res.json({ message: 'Proposal signed successfully', proposal });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add line item to proposal
router.post('/:id/line-items', async (req, res) => {
  try {
    const { description, quantity, unitPrice, category } = req.body;
    const total = (parseInt(quantity) || 1) * parseFloat(unitPrice);

    const lineItem = await req.prisma.proposalLineItem.create({
      data: {
        proposalId: req.params.id,
        description,
        quantity: parseInt(quantity) || 1,
        unitPrice: parseFloat(unitPrice),
        total,
        category
      }
    });

    // Recalculate total
    const allLineItems = await req.prisma.proposalLineItem.findMany({
      where: { proposalId: req.params.id }
    });
    const allMenus = await req.prisma.proposalMenu.findMany({
      where: { proposalId: req.params.id }
    });
    const newTotal = allLineItems.reduce((sum, item) => sum + item.total, 0) +
      allMenus.reduce((sum, m) => sum + (m.guestCount * m.pricePerPerson), 0);

    await req.prisma.proposal.update({
      where: { id: req.params.id },
      data: { totalAmount: newTotal }
    });

    res.status(201).json(lineItem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete line item
router.delete('/:id/line-items/:itemId', async (req, res) => {
  try {
    await req.prisma.proposalLineItem.delete({ where: { id: req.params.itemId } });
    res.json({ message: 'Line item deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get proposal statuses (for dropdown)
router.get('/options/statuses', async (req, res) => {
  res.json([
    { value: 'DRAFT', label: 'Draft' },
    { value: 'SENT', label: 'Sent' },
    { value: 'VIEWED', label: 'Viewed' },
    { value: 'ACCEPTED', label: 'Accepted' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'EXPIRED', label: 'Expired' }
  ]);
});

module.exports = router;
