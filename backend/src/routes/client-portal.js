const express = require('express');
const router = express.Router();

// Get client's events
router.get('/events', async (req, res) => {
  try {
    const { clientId } = req.query;

    if (!clientId) {
      return res.status(400).json({ error: 'Client ID required' });
    }

    const events = await req.prisma.event.findMany({
      where: { clientId },
      include: {
        venue: true,
        proposals: {
          where: { status: { in: ['SENT', 'VIEWED', 'ACCEPTED'] } }
        },
        orders: true,
        invoices: true
      },
      orderBy: { date: 'desc' }
    });

    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single event for client
router.get('/events/:id', async (req, res) => {
  try {
    const { clientId } = req.query;

    const event = await req.prisma.event.findFirst({
      where: {
        id: req.params.id,
        clientId
      },
      include: {
        venue: true,
        timeline: { orderBy: { time: 'asc' } },
        proposals: {
          include: {
            menus: {
              include: {
                package: {
                  include: {
                    items: {
                      include: { menuItem: true }
                    }
                  }
                }
              }
            },
            lineItems: true
          }
        },
        orders: true,
        invoices: {
          include: { payments: true }
        },
        guests: true,
        photos: {
          where: { isPublic: true }
        }
      }
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get proposal details for client
router.get('/proposals/:id', async (req, res) => {
  try {
    const proposal = await req.prisma.proposal.findUnique({
      where: { id: req.params.id },
      include: {
        event: {
          include: {
            venue: true,
            client: { select: { name: true, email: true, phone: true } }
          }
        },
        menus: {
          include: {
            package: {
              include: {
                items: {
                  include: {
                    menuItem: {
                      select: {
                        name: true,
                        description: true,
                        isVegetarian: true,
                        isVegan: true,
                        isGlutenFree: true,
                        isDairyFree: true,
                        isNutFree: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        lineItems: true
      }
    });

    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    // Mark as viewed if status is SENT
    if (proposal.status === 'SENT') {
      await req.prisma.proposal.update({
        where: { id: req.params.id },
        data: { status: 'VIEWED' }
      });
    }

    res.json(proposal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Select menu options from proposal
router.post('/proposals/:id/select-menu', async (req, res) => {
  try {
    const { selectedMenuId, dietaryNotes, specialRequests } = req.body;

    const proposal = await req.prisma.proposal.findUnique({
      where: { id: req.params.id },
      include: { event: true }
    });

    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    // Update proposal with selection
    await req.prisma.proposal.update({
      where: { id: req.params.id },
      data: {
        notes: `${proposal.notes || ''}\n\nClient Selection:\nMenu: ${selectedMenuId}\nDietary Notes: ${dietaryNotes || 'None'}\nSpecial Requests: ${specialRequests || 'None'}`
      }
    });

    // Update event with dietary notes
    if (dietaryNotes || specialRequests) {
      await req.prisma.event.update({
        where: { id: proposal.eventId },
        data: {
          notes: `${proposal.event.notes || ''}\n\nClient Dietary Notes: ${dietaryNotes || 'None'}\nSpecial Requests: ${specialRequests || 'None'}`
        }
      });
    }

    res.json({ message: 'Menu selection saved' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sign proposal (accept)
router.post('/proposals/:id/sign', async (req, res) => {
  try {
    const { signedBy, signatureData } = req.body;

    const proposal = await req.prisma.proposal.findUnique({
      where: { id: req.params.id }
    });

    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    if (proposal.status === 'ACCEPTED') {
      return res.status(400).json({ error: 'Proposal already accepted' });
    }

    const updatedProposal = await req.prisma.proposal.update({
      where: { id: req.params.id },
      data: {
        status: 'ACCEPTED',
        signedBy,
        signedAt: new Date(),
        signatureUrl: signatureData // Base64 signature data
      }
    });

    // Update event status to confirmed
    await req.prisma.event.update({
      where: { id: proposal.eventId },
      data: { status: 'CONFIRMED' }
    });

    res.json(updatedProposal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject proposal
router.post('/proposals/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;

    const proposal = await req.prisma.proposal.update({
      where: { id: req.params.id },
      data: {
        status: 'REJECTED',
        notes: `${proposal?.notes || ''}\n\nRejection Reason: ${reason || 'Not specified'}`
      }
    });

    res.json(proposal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit dietary preferences for guests
router.post('/events/:eventId/dietary-preferences', async (req, res) => {
  try {
    const { guests } = req.body;

    // Create or update guests with dietary info
    const results = await Promise.all(
      guests.map(async (guest) => {
        if (guest.id) {
          return req.prisma.guest.update({
            where: { id: guest.id },
            data: {
              isVegetarian: guest.isVegetarian,
              isVegan: guest.isVegan,
              isGlutenFree: guest.isGlutenFree,
              isDairyFree: guest.isDairyFree,
              isNutFree: guest.isNutFree,
              otherAllergies: guest.otherAllergies,
              mealPreference: guest.mealPreference
            }
          });
        } else {
          return req.prisma.guest.create({
            data: {
              eventId: req.params.eventId,
              name: guest.name,
              email: guest.email,
              isVegetarian: guest.isVegetarian || false,
              isVegan: guest.isVegan || false,
              isGlutenFree: guest.isGlutenFree || false,
              isDairyFree: guest.isDairyFree || false,
              isNutFree: guest.isNutFree || false,
              otherAllergies: guest.otherAllergies,
              mealPreference: guest.mealPreference,
              rsvpStatus: 'CONFIRMED'
            }
          });
        }
      })
    );

    res.json({ message: 'Dietary preferences saved', count: results.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get invoice for client
router.get('/invoices/:id', async (req, res) => {
  try {
    const invoice = await req.prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        event: true,
        lineItems: true,
        payments: true
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Mark as viewed if status is SENT
    if (invoice.status === 'SENT') {
      await req.prisma.invoice.update({
        where: { id: req.params.id },
        data: { status: 'VIEWED' }
      });
    }

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get client dashboard summary
router.get('/dashboard', async (req, res) => {
  try {
    const { clientId } = req.query;

    if (!clientId) {
      return res.status(400).json({ error: 'Client ID required' });
    }

    const [events, pendingProposals, pendingInvoices] = await Promise.all([
      req.prisma.event.findMany({
        where: { clientId },
        orderBy: { date: 'asc' },
        take: 5
      }),
      req.prisma.proposal.findMany({
        where: {
          event: { clientId },
          status: { in: ['SENT', 'VIEWED'] }
        },
        include: { event: { select: { name: true, date: true } } }
      }),
      req.prisma.invoice.findMany({
        where: {
          event: { clientId },
          status: { in: ['SENT', 'VIEWED', 'PARTIALLY_PAID'] }
        },
        include: { event: { select: { name: true } } }
      })
    ]);

    res.json({
      upcomingEvents: events.filter(e => new Date(e.date) >= new Date()),
      pendingProposals,
      pendingInvoices,
      totalEvents: events.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
