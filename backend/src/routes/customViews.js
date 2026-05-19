// Custom Views: 4 endpoints for catering custom features
// VIZ 1: Event Calendar, VIZ 2: Menu Pricing Chart
// NON-VIZ 1: Event Quote PDF, NON-VIZ 2: Staff Roster Wizard
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

let PDFDocument = null;
try { PDFDocument = require('pdfkit'); } catch (_) { PDFDocument = null; }

// GET /api/custom-views/event-calendar?month=YYYY-MM
router.get('/event-calendar', authenticate, async (req, res, next) => {
  try {
    const month = String(req.query.month || '');
    const now = new Date();
    let year = now.getUTCFullYear();
    let mon = now.getUTCMonth();
    if (/^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split('-').map(Number);
      year = y; mon = m - 1;
    }
    const start = new Date(Date.UTC(year, mon, 1));
    const end = new Date(Date.UTC(year, mon + 1, 1));

    const events = await req.prisma.event.findMany({
      where: { date: { gte: start, lt: end } },
      select: {
        id: true, name: true, eventType: true, date: true,
        startTime: true, endTime: true, guestCount: true, status: true,
        client: { select: { name: true } },
        venue: { select: { name: true, city: true } }
      },
      orderBy: { date: 'asc' }
    });

    const statusColors = {
      INQUIRY: '#9ca3af',
      PROPOSAL_SENT: '#3b82f6',
      CONFIRMED: '#10b981',
      IN_PROGRESS: '#f59e0b',
      COMPLETED: '#6366f1',
      CANCELLED: '#ef4444'
    };

    const items = events.map(e => ({
      id: e.id,
      name: e.name,
      type: e.eventType,
      date: e.date,
      day: new Date(e.date).getUTCDate(),
      startTime: e.startTime,
      endTime: e.endTime,
      guestCount: e.guestCount,
      status: e.status,
      color: statusColors[e.status] || '#64748b',
      clientName: e.client?.name || null,
      venueName: e.venue?.name || null,
      venueCity: e.venue?.city || null
    }));

    res.json({
      month: `${year}-${String(mon + 1).padStart(2, '0')}`,
      year,
      monthIndex: mon,
      daysInMonth: new Date(Date.UTC(year, mon + 1, 0)).getUTCDate(),
      firstDayOfWeek: new Date(Date.UTC(year, mon, 1)).getUTCDay(),
      legend: statusColors,
      events: items,
      total: items.length
    });
  } catch (e) { next(e); }
});

// GET /api/custom-views/menu-pricing
router.get('/menu-pricing', authenticate, async (req, res, next) => {
  try {
    const items = await req.prisma.menuItem.findMany({
      where: { isActive: true },
      select: { id: true, name: true, price: true, costPrice: true, category: true }
    });

    const byCategory = new Map();
    for (const it of items) {
      const key = it.category || 'Uncategorized';
      if (!byCategory.has(key)) byCategory.set(key, { category: key, items: [], totalPrice: 0, totalCost: 0, count: 0 });
      const slot = byCategory.get(key);
      slot.items.push({ id: it.id, name: it.name, price: it.price, costPrice: it.costPrice });
      slot.totalPrice += Number(it.price || 0);
      slot.totalCost += Number(it.costPrice || 0);
      slot.count += 1;
    }

    const data = Array.from(byCategory.values()).map(c => {
      const avgPrice = c.count ? +(c.totalPrice / c.count).toFixed(2) : 0;
      const avgCost = c.count ? +(c.totalCost / c.count).toFixed(2) : 0;
      const margin = +(avgPrice - avgCost).toFixed(2);
      const minPrice = c.items.length ? Math.min(...c.items.map(i => i.price)) : 0;
      const maxPrice = c.items.length ? Math.max(...c.items.map(i => i.price)) : 0;
      return {
        category: c.category,
        count: c.count,
        avgPrice,
        avgCost,
        margin,
        minPrice: +minPrice.toFixed(2),
        maxPrice: +maxPrice.toFixed(2),
      };
    }).sort((a, b) => b.avgPrice - a.avgPrice);

    res.json({
      categories: data,
      totalItems: items.length,
      totalCategories: data.length
    });
  } catch (e) { next(e); }
});

// GET /api/custom-views/quote-options - clients, events, menu packages for picker
router.get('/quote-options', authenticate, async (req, res, next) => {
  try {
    const [clients, events, packages] = await Promise.all([
      req.prisma.user.findMany({
        where: { role: 'CLIENT' },
        select: { id: true, name: true, email: true, phone: true },
        orderBy: { name: 'asc' }
      }),
      req.prisma.event.findMany({
        select: {
          id: true, name: true, date: true, guestCount: true,
          eventType: true, clientId: true,
          venue: { select: { name: true, city: true, state: true } }
        },
        orderBy: { date: 'desc' },
        take: 100
      }),
      req.prisma.menuPackage.findMany({
        where: { isActive: true },
        select: { id: true, name: true, description: true, pricePerPerson: true, category: true },
        orderBy: { name: 'asc' }
      })
    ]);
    res.json({ clients, events, packages });
  } catch (e) { next(e); }
});

// POST /api/custom-views/event-quote-pdf
router.post('/event-quote-pdf', authenticate, async (req, res, next) => {
  try {
    if (!PDFDocument) {
      return res.status(503).json({ error: 'pdfkit not installed on server' });
    }
    const { clientId, eventId, packageId, taxRate = 0.08, additionalItems = [] } = req.body || {};
    if (!clientId || !eventId || !packageId) {
      return res.status(400).json({ error: 'clientId, eventId, packageId are required' });
    }

    const [client, event, pkg] = await Promise.all([
      req.prisma.user.findUnique({ where: { id: clientId } }),
      req.prisma.event.findUnique({
        where: { id: eventId },
        include: { venue: true }
      }),
      req.prisma.menuPackage.findUnique({
        where: { id: packageId },
        include: { items: { include: { menuItem: true } } }
      })
    ]);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (!pkg) return res.status(404).json({ error: 'Menu package not found' });

    const guestCount = event.guestCount || pkg.minGuests || 10;
    const packageSubtotal = +(pkg.pricePerPerson * guestCount).toFixed(2);
    const addOnSubtotal = Array.isArray(additionalItems)
      ? additionalItems.reduce((s, it) => s + (Number(it.quantity || 0) * Number(it.unitPrice || 0)), 0)
      : 0;
    const subtotal = +(packageSubtotal + addOnSubtotal).toFixed(2);
    const tax = +(subtotal * Number(taxRate)).toFixed(2);
    const total = +(subtotal + tax).toFixed(2);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="event-quote-${event.id.slice(0, 8)}.pdf"`);

    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    doc.pipe(res);

    doc.fontSize(20).fillColor('#111').text('Catering Pro - Event Quote', { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#666').text(`Generated: ${new Date().toLocaleString()}`);
    doc.moveDown();

    doc.fontSize(12).fillColor('#000').text('Client', { underline: true });
    doc.fontSize(10).fillColor('#333');
    doc.text(`Name:  ${client.name}`);
    doc.text(`Email: ${client.email || ''}`);
    doc.text(`Phone: ${client.phone || ''}`);
    doc.moveDown();

    doc.fontSize(12).fillColor('#000').text('Event', { underline: true });
    doc.fontSize(10).fillColor('#333');
    doc.text(`Name:        ${event.name}`);
    doc.text(`Type:        ${event.eventType}`);
    doc.text(`Date:        ${new Date(event.date).toLocaleDateString()}`);
    doc.text(`Guest count: ${guestCount}`);
    if (event.venue) {
      doc.text(`Venue:       ${event.venue.name} (${event.venue.city}, ${event.venue.state})`);
    }
    doc.moveDown();

    doc.fontSize(12).fillColor('#000').text('Menu Package', { underline: true });
    doc.fontSize(10).fillColor('#333');
    doc.text(`${pkg.name}  [${pkg.category}]`);
    if (pkg.description) doc.text(pkg.description);
    doc.text(`Price per person: $${pkg.pricePerPerson.toFixed(2)}`);
    if (pkg.items && pkg.items.length) {
      doc.moveDown(0.3);
      doc.fillColor('#000').text('Includes:');
      doc.fillColor('#333');
      pkg.items.slice(0, 20).forEach(pi => {
        doc.text(`  - ${pi.menuItem?.name || 'Item'} x ${pi.quantity}`);
      });
    }
    doc.moveDown();

    doc.fontSize(12).fillColor('#000').text('Line Items', { underline: true });
    doc.fontSize(10).fillColor('#333');
    const col = { desc: 50, qty: 320, unit: 380, total: 470 };
    let y = doc.y + 6;
    doc.text('Description', col.desc, y);
    doc.text('Qty', col.qty, y);
    doc.text('Unit', col.unit, y);
    doc.text('Total', col.total, y);
    y += 14;
    doc.moveTo(50, y - 2).lineTo(560, y - 2).strokeColor('#ccc').stroke();

    const writeRow = (desc, qty, unit, total) => {
      doc.text(desc, col.desc, y, { width: 260 });
      doc.text(String(qty), col.qty, y);
      doc.text(`$${Number(unit).toFixed(2)}`, col.unit, y);
      doc.text(`$${Number(total).toFixed(2)}`, col.total, y);
      y += 18;
    };

    writeRow(`Menu package: ${pkg.name}`, guestCount, pkg.pricePerPerson, packageSubtotal);
    if (Array.isArray(additionalItems)) {
      additionalItems.forEach(it => {
        const lineTotal = Number(it.quantity || 0) * Number(it.unitPrice || 0);
        writeRow(it.description || 'Add-on', it.quantity || 0, it.unitPrice || 0, lineTotal);
      });
    }

    y += 8;
    doc.moveTo(50, y).lineTo(560, y).strokeColor('#ccc').stroke();
    y += 8;
    doc.fillColor('#000');
    doc.text('Subtotal', col.unit, y); doc.text(`$${subtotal.toFixed(2)}`, col.total, y); y += 16;
    doc.text(`Tax (${(Number(taxRate) * 100).toFixed(2)}%)`, col.unit, y); doc.text(`$${tax.toFixed(2)}`, col.total, y); y += 16;
    doc.fontSize(12).text('TOTAL', col.unit, y); doc.text(`$${total.toFixed(2)}`, col.total, y);

    doc.moveDown(4);
    doc.fontSize(9).fillColor('#888').text('This quote is valid for 30 days from the generation date.', 50, doc.y);

    doc.end();
  } catch (e) {
    console.error('event-quote-pdf error', e);
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
});

// GET /api/custom-views/staff-roster/options - events + roles
router.get('/staff-roster/options', authenticate, async (req, res, next) => {
  try {
    const events = await req.prisma.event.findMany({
      where: { status: { in: ['INQUIRY', 'PROPOSAL_SENT', 'CONFIRMED', 'IN_PROGRESS'] } },
      select: {
        id: true, name: true, date: true, startTime: true, endTime: true,
        guestCount: true, status: true,
        venue: { select: { name: true } }
      },
      orderBy: { date: 'asc' },
      take: 50
    });
    const positions = await req.prisma.staff.findMany({
      where: { isActive: true },
      select: { position: true },
      distinct: ['position']
    });
    const roles = positions.map(p => p.position).filter(Boolean).sort();
    res.json({ events, roles });
  } catch (e) { next(e); }
});

// POST /api/custom-views/staff-roster/suggest
// body: { eventId, requiredRoles: [{ role, count }] }
router.post('/staff-roster/suggest', authenticate, async (req, res, next) => {
  try {
    const { eventId, requiredRoles = [] } = req.body || {};
    if (!eventId) return res.status(400).json({ error: 'eventId is required' });

    const event = await req.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, name: true, date: true, startTime: true, endTime: true, guestCount: true }
    });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Existing assignments for this event
    const existing = await req.prisma.staffAssignment.findMany({
      where: { eventId },
      select: { staffId: true, role: true }
    });
    const usedIds = new Set(existing.map(a => a.staffId));

    // Find conflicting assignments on the same date for any staff
    const sameDay = await req.prisma.staffAssignment.findMany({
      where: {
        startTime: { lte: event.endTime },
        endTime: { gte: event.startTime },
        NOT: { eventId }
      },
      select: { staffId: true }
    });
    const busyIds = new Set(sameDay.map(a => a.staffId));

    const allActive = await req.prisma.staff.findMany({
      where: { isActive: true },
      select: {
        id: true, position: true, hourlyRate: true, skills: true,
        user: { select: { id: true, name: true, email: true } }
      }
    });

    const roleSpecs = Array.isArray(requiredRoles) && requiredRoles.length
      ? requiredRoles
      : [{ role: 'Server', count: Math.max(2, Math.ceil((event.guestCount || 20) / 15)) }];

    const suggestions = roleSpecs.map(spec => {
      const role = String(spec.role || '').trim();
      const need = Math.max(1, Number(spec.count || 1));
      const candidates = allActive
        .filter(s => !usedIds.has(s.id) && !busyIds.has(s.id))
        .map(s => {
          let score = 0;
          if (s.position && role && s.position.toLowerCase() === role.toLowerCase()) score += 100;
          else if (s.position && role && s.position.toLowerCase().includes(role.toLowerCase())) score += 60;
          if (s.skills && role && s.skills.toLowerCase().includes(role.toLowerCase())) score += 20;
          score += Math.max(0, 50 - (s.hourlyRate || 0));
          return { ...s, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, need);

      return {
        role,
        required: need,
        suggested: candidates.map(c => ({
          staffId: c.id,
          userId: c.user?.id,
          name: c.user?.name,
          email: c.user?.email,
          position: c.position,
          hourlyRate: c.hourlyRate,
          score: c.score
        }))
      };
    });

    res.json({ event, suggestions, existingAssignments: existing.length });
  } catch (e) { next(e); }
});

// POST /api/custom-views/staff-roster/confirm
// body: { eventId, assignments: [{ staffId, role }] }
router.post('/staff-roster/confirm', authenticate, async (req, res, next) => {
  try {
    const { eventId, assignments = [] } = req.body || {};
    if (!eventId) return res.status(400).json({ error: 'eventId is required' });
    if (!Array.isArray(assignments) || !assignments.length) {
      return res.status(400).json({ error: 'assignments array required' });
    }
    const event = await req.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, startTime: true, endTime: true }
    });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const created = [];
    for (const a of assignments) {
      if (!a.staffId || !a.role) continue;
      const dup = await req.prisma.staffAssignment.findFirst({
        where: { eventId, staffId: a.staffId }
      });
      if (dup) continue;
      const rec = await req.prisma.staffAssignment.create({
        data: {
          eventId,
          staffId: a.staffId,
          role: a.role,
          startTime: event.startTime,
          endTime: event.endTime,
          confirmed: true
        }
      });
      created.push(rec);
    }

    res.json({ created: created.length, assignments: created });
  } catch (e) { next(e); }
});

module.exports = router;
