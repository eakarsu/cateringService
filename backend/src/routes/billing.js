const express = require('express');
const router = express.Router();

// ==================== INVOICES ====================

// Get all invoices
router.get('/invoices', async (req, res) => {
  try {
    const { status, type, eventId } = req.query;
    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (eventId) where.eventId = eventId;

    const invoices = await req.prisma.invoice.findMany({
      where,
      include: {
        event: { include: { client: { select: { name: true, email: true } }, venue: true } },
        createdBy: { select: { name: true } },
        lineItems: true,
        payments: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get invoice by ID
router.get('/invoices/:id', async (req, res) => {
  try {
    const invoice = await req.prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        event: { include: { client: true, venue: true, orders: true } },
        createdBy: { select: { name: true, email: true } },
        lineItems: true,
        payments: true
      }
    });
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create invoice
router.post('/invoices', async (req, res) => {
  try {
    const {
      eventId, createdById, type, subtotal, taxRate, gratuity, dueDate, notes, lineItems
    } = req.body;

    const taxAmount = (parseFloat(subtotal) * (parseFloat(taxRate) || 0)) / 100;
    const total = parseFloat(subtotal) + taxAmount + (parseFloat(gratuity) || 0);

    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;

    const invoice = await req.prisma.invoice.create({
      data: {
        invoiceNumber,
        eventId,
        createdById,
        type: type || 'FINAL',
        subtotal: parseFloat(subtotal),
        taxRate: parseFloat(taxRate) || 0,
        taxAmount,
        gratuity: parseFloat(gratuity) || 0,
        total,
        dueDate: new Date(dueDate),
        notes,
        lineItems: lineItems ? {
          create: lineItems.map(item => ({
            description: item.description,
            quantity: parseInt(item.quantity) || 1,
            unitPrice: parseFloat(item.unitPrice),
            total: (parseInt(item.quantity) || 1) * parseFloat(item.unitPrice)
          }))
        } : undefined
      },
      include: {
        event: { include: { client: true } },
        lineItems: true
      }
    });
    res.status(201).json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update invoice
router.put('/invoices/:id', async (req, res) => {
  try {
    const { status, subtotal, taxRate, gratuity, dueDate, notes } = req.body;

    let updateData = { status, notes };

    if (dueDate) updateData.dueDate = new Date(dueDate);

    if (subtotal !== undefined) {
      const taxAmount = (parseFloat(subtotal) * (parseFloat(taxRate) || 0)) / 100;
      const total = parseFloat(subtotal) + taxAmount + (parseFloat(gratuity) || 0);
      updateData = {
        ...updateData,
        subtotal: parseFloat(subtotal),
        taxRate: parseFloat(taxRate) || 0,
        taxAmount,
        gratuity: parseFloat(gratuity) || 0,
        total
      };
    }

    const invoice = await req.prisma.invoice.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        event: { include: { client: true } },
        lineItems: true,
        payments: true
      }
    });
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete invoice
router.delete('/invoices/:id', async (req, res) => {
  try {
    await req.prisma.invoice.delete({ where: { id: req.params.id } });
    res.json({ message: 'Invoice deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send invoice
router.post('/invoices/:id/send', async (req, res) => {
  try {
    const invoice = await req.prisma.invoice.update({
      where: { id: req.params.id },
      data: { status: 'SENT' }
    });
    // In production, send email here
    res.json({ message: 'Invoice sent', invoice });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add line item to invoice
router.post('/invoices/:id/line-items', async (req, res) => {
  try {
    const { description, quantity, unitPrice } = req.body;
    const total = (parseInt(quantity) || 1) * parseFloat(unitPrice);

    const lineItem = await req.prisma.invoiceLineItem.create({
      data: {
        invoiceId: req.params.id,
        description,
        quantity: parseInt(quantity) || 1,
        unitPrice: parseFloat(unitPrice),
        total
      }
    });

    // Recalculate invoice totals
    const allItems = await req.prisma.invoiceLineItem.findMany({
      where: { invoiceId: req.params.id }
    });
    const invoice = await req.prisma.invoice.findUnique({
      where: { id: req.params.id }
    });

    const subtotal = allItems.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = (subtotal * invoice.taxRate) / 100;
    const newTotal = subtotal + taxAmount + invoice.gratuity;

    await req.prisma.invoice.update({
      where: { id: req.params.id },
      data: { subtotal, taxAmount, total: newTotal }
    });

    res.status(201).json(lineItem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete line item
router.delete('/invoices/:id/line-items/:itemId', async (req, res) => {
  try {
    await req.prisma.invoiceLineItem.delete({ where: { id: req.params.itemId } });
    res.json({ message: 'Line item deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== PAYMENTS ====================

// Get all payments
router.get('/payments', async (req, res) => {
  try {
    const { invoiceId, method, startDate, endDate } = req.query;
    const where = {};
    if (invoiceId) where.invoiceId = invoiceId;
    if (method) where.method = method;
    if (startDate || endDate) {
      where.receivedAt = {};
      if (startDate) where.receivedAt.gte = new Date(startDate);
      if (endDate) where.receivedAt.lte = new Date(endDate);
    }

    const payments = await req.prisma.payment.findMany({
      where,
      include: {
        invoice: {
          include: {
            event: { select: { name: true, client: { select: { name: true } } } }
          }
        }
      },
      orderBy: { receivedAt: 'desc' }
    });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Record payment
router.post('/payments', async (req, res) => {
  try {
    const { invoiceId, amount, method, reference, notes } = req.body;

    const payment = await req.prisma.payment.create({
      data: {
        invoiceId,
        amount: parseFloat(amount),
        method,
        reference,
        notes
      },
      include: { invoice: true }
    });

    // Calculate total paid and update invoice status
    const allPayments = await req.prisma.payment.findMany({
      where: { invoiceId }
    });
    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);

    const invoice = await req.prisma.invoice.findUnique({
      where: { id: invoiceId }
    });

    let newStatus = invoice.status;
    if (totalPaid >= invoice.total) {
      newStatus = 'PAID';
    } else if (totalPaid > 0) {
      newStatus = 'PARTIALLY_PAID';
    }

    await req.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: newStatus }
    });

    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete payment
router.delete('/payments/:id', async (req, res) => {
  try {
    await req.prisma.payment.delete({ where: { id: req.params.id } });
    res.json({ message: 'Payment deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get invoice types (for dropdown)
router.get('/options/invoice-types', async (req, res) => {
  res.json([
    { value: 'DEPOSIT', label: 'Deposit' },
    { value: 'PROGRESS', label: 'Progress Billing' },
    { value: 'FINAL', label: 'Final Invoice' }
  ]);
});

// Get invoice statuses (for dropdown)
router.get('/options/invoice-statuses', async (req, res) => {
  res.json([
    { value: 'DRAFT', label: 'Draft' },
    { value: 'SENT', label: 'Sent' },
    { value: 'VIEWED', label: 'Viewed' },
    { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
    { value: 'PAID', label: 'Paid' },
    { value: 'OVERDUE', label: 'Overdue' },
    { value: 'CANCELLED', label: 'Cancelled' }
  ]);
});

// Get payment methods (for dropdown)
router.get('/options/payment-methods', async (req, res) => {
  res.json([
    { value: 'CASH', label: 'Cash' },
    { value: 'CHECK', label: 'Check' },
    { value: 'CREDIT_CARD', label: 'Credit Card' },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
    { value: 'VENMO', label: 'Venmo' },
    { value: 'ZELLE', label: 'Zelle' },
    { value: 'OTHER', label: 'Other' }
  ]);
});

module.exports = router;
