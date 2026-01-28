const express = require('express');
const router = express.Router();

// Default labor cost per hour (can be overridden)
const DEFAULT_LABOR_COST_PER_HOUR = 25;
const DEFAULT_OVERHEAD_PERCENT = 15;
const DEFAULT_TAX_RATE = 8;

// Calculate cost estimate
router.post('/estimate', async (req, res) => {
  try {
    const {
      eventId,
      guestCount,
      packageId,
      staffHours,
      equipmentIds,
      additionalCosts,
      profitMarginPercent = 25,
      laborCostPerHour = DEFAULT_LABOR_COST_PER_HOUR,
      overheadPercent = DEFAULT_OVERHEAD_PERCENT,
      taxRate = DEFAULT_TAX_RATE
    } = req.body;

    // Get menu package cost
    let foodCost = 0;
    let packageDetails = null;
    if (packageId) {
      const menuPackage = await req.prisma.menuPackage.findUnique({
        where: { id: packageId },
        include: {
          items: {
            include: { menuItem: true }
          }
        }
      });

      if (menuPackage) {
        packageDetails = menuPackage;
        // Use costPerPerson if set, otherwise estimate as 40% of price
        const costPerPerson = menuPackage.costPerPerson > 0
          ? menuPackage.costPerPerson
          : menuPackage.pricePerPerson * 0.4;
        foodCost = costPerPerson * guestCount;
      }
    }

    // Calculate labor cost
    let laborCost = 0;
    let laborDetails = [];
    if (staffHours && Array.isArray(staffHours)) {
      staffHours.forEach(sh => {
        const cost = sh.hours * (sh.hourlyRate || laborCostPerHour);
        laborCost += cost;
        laborDetails.push({
          role: sh.role,
          hours: sh.hours,
          rate: sh.hourlyRate || laborCostPerHour,
          cost
        });
      });
    } else if (staffHours && typeof staffHours === 'number') {
      laborCost = staffHours * laborCostPerHour;
      laborDetails.push({
        role: 'General Staff',
        hours: staffHours,
        rate: laborCostPerHour,
        cost: laborCost
      });
    } else {
      // Estimate staff needed based on guest count
      const serversNeeded = Math.ceil(guestCount / 20);
      const chefHours = Math.ceil(guestCount / 50) * 6;
      const serverHours = serversNeeded * 6;

      laborCost = (chefHours * 35) + (serverHours * 25);
      laborDetails = [
        { role: 'Chef', hours: chefHours, rate: 35, cost: chefHours * 35 },
        { role: 'Servers', hours: serverHours, rate: 25, cost: serverHours * 25 }
      ];
    }

    // Calculate equipment cost
    let equipmentCost = 0;
    let equipmentDetails = [];
    if (equipmentIds && equipmentIds.length > 0) {
      const equipment = await req.prisma.equipment.findMany({
        where: { id: { in: equipmentIds } }
      });
      // Estimate equipment rental at $5 per unit
      equipment.forEach(eq => {
        const cost = 5 * (eq.quantity || 1);
        equipmentCost += cost;
        equipmentDetails.push({
          name: eq.name,
          quantity: eq.quantity || 1,
          cost
        });
      });
    } else {
      // Estimate equipment based on guest count
      equipmentCost = Math.ceil(guestCount / 10) * 15; // $15 per 10 guests
      equipmentDetails.push({
        name: 'Standard Equipment Package',
        quantity: 1,
        cost: equipmentCost
      });
    }

    // Calculate additional costs
    let additionalTotal = 0;
    if (additionalCosts && Array.isArray(additionalCosts)) {
      additionalCosts.forEach(ac => {
        additionalTotal += ac.amount || 0;
      });
    }

    // Calculate totals
    const directCosts = foodCost + laborCost + equipmentCost + additionalTotal;
    const overheadAmount = directCosts * (overheadPercent / 100);
    const subtotal = directCosts + overheadAmount;
    const profitAmount = subtotal * (profitMarginPercent / 100);
    const preTaxTotal = subtotal + profitAmount;
    const taxAmount = preTaxTotal * (taxRate / 100);
    const total = preTaxTotal + taxAmount;

    // Calculate per-person pricing
    const pricePerPerson = guestCount > 0 ? total / guestCount : 0;

    res.json({
      summary: {
        guestCount,
        pricePerPerson: Math.round(pricePerPerson * 100) / 100,
        total: Math.round(total * 100) / 100
      },
      breakdown: {
        foodCost: Math.round(foodCost * 100) / 100,
        laborCost: Math.round(laborCost * 100) / 100,
        equipmentCost: Math.round(equipmentCost * 100) / 100,
        additionalCosts: Math.round(additionalTotal * 100) / 100,
        directCosts: Math.round(directCosts * 100) / 100,
        overhead: {
          percent: overheadPercent,
          amount: Math.round(overheadAmount * 100) / 100
        },
        subtotal: Math.round(subtotal * 100) / 100,
        profit: {
          percent: profitMarginPercent,
          amount: Math.round(profitAmount * 100) / 100
        },
        preTaxTotal: Math.round(preTaxTotal * 100) / 100,
        tax: {
          rate: taxRate,
          amount: Math.round(taxAmount * 100) / 100
        },
        total: Math.round(total * 100) / 100
      },
      details: {
        package: packageDetails ? {
          name: packageDetails.name,
          pricePerPerson: packageDetails.pricePerPerson,
          costPerPerson: packageDetails.costPerPerson || packageDetails.pricePerPerson * 0.4
        } : null,
        labor: laborDetails,
        equipment: equipmentDetails,
        additional: additionalCosts || []
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get quick estimate for event
router.get('/quick-estimate/:eventId', async (req, res) => {
  try {
    const event = await req.prisma.event.findUnique({
      where: { id: req.params.eventId },
      include: {
        orders: {
          include: { package: true }
        }
      }
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const guestCount = event.guestCount;
    const pkg = event.orders[0]?.package;

    // Basic estimation
    const foodCostPerPerson = pkg
      ? (pkg.costPerPerson > 0 ? pkg.costPerPerson : pkg.pricePerPerson * 0.4)
      : 25;
    const foodCost = foodCostPerPerson * guestCount;

    // Labor estimate: 1 server per 20 guests, 1 chef per 50 guests
    const servers = Math.ceil(guestCount / 20);
    const chefs = Math.ceil(guestCount / 50);
    const laborHours = (servers * 6) + (chefs * 6);
    const laborCost = (servers * 6 * 25) + (chefs * 6 * 35);

    // Equipment: $15 per 10 guests
    const equipmentCost = Math.ceil(guestCount / 10) * 15;

    const directCosts = foodCost + laborCost + equipmentCost;
    const overhead = directCosts * 0.15;
    const subtotal = directCosts + overhead;
    const profit = subtotal * 0.25;
    const preTax = subtotal + profit;
    const tax = preTax * 0.08;
    const total = preTax + tax;

    res.json({
      eventName: event.name,
      guestCount,
      suggestedPrice: Math.round(total * 100) / 100,
      pricePerPerson: Math.round((total / guestCount) * 100) / 100,
      breakdown: {
        food: Math.round(foodCost),
        labor: Math.round(laborCost),
        equipment: Math.round(equipmentCost),
        overhead: Math.round(overhead),
        profit: Math.round(profit),
        tax: Math.round(tax)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get profit margin analysis for an event
router.get('/margin-analysis/:eventId', async (req, res) => {
  try {
    const event = await req.prisma.event.findUnique({
      where: { id: req.params.eventId },
      include: {
        proposals: { where: { status: 'ACCEPTED' } },
        invoices: { where: { status: 'PAID' } },
        orders: { include: { package: true } }
      }
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Get actual revenue
    const revenue = event.invoices.reduce((sum, inv) => sum + inv.total, 0);

    // Estimate costs (in a real system, this would track actual costs)
    const pkg = event.orders[0]?.package;
    const estimatedFoodCost = pkg
      ? (pkg.costPerPerson > 0 ? pkg.costPerPerson : pkg.pricePerPerson * 0.4) * event.guestCount
      : event.guestCount * 25;

    const estimatedLaborCost = (Math.ceil(event.guestCount / 20) * 6 * 25) +
                               (Math.ceil(event.guestCount / 50) * 6 * 35);
    const estimatedEquipmentCost = Math.ceil(event.guestCount / 10) * 15;
    const estimatedTotalCost = estimatedFoodCost + estimatedLaborCost + estimatedEquipmentCost;

    const grossProfit = revenue - estimatedTotalCost;
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    res.json({
      eventName: event.name,
      revenue: Math.round(revenue * 100) / 100,
      estimatedCosts: {
        food: Math.round(estimatedFoodCost),
        labor: Math.round(estimatedLaborCost),
        equipment: Math.round(estimatedEquipmentCost),
        total: Math.round(estimatedTotalCost)
      },
      grossProfit: Math.round(grossProfit * 100) / 100,
      grossMarginPercent: Math.round(grossMargin * 100) / 100
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Calculate break-even point
router.post('/break-even', async (req, res) => {
  try {
    const {
      fixedCosts = 0,
      variableCostPerPerson,
      pricePerPerson
    } = req.body;

    if (!variableCostPerPerson || !pricePerPerson) {
      return res.status(400).json({ error: 'Variable cost and price per person required' });
    }

    const contributionMargin = pricePerPerson - variableCostPerPerson;
    const breakEvenGuests = fixedCosts > 0 ? Math.ceil(fixedCosts / contributionMargin) : 0;

    res.json({
      breakEvenGuests,
      contributionMargin,
      fixedCosts,
      profitAtGuests: {
        50: (50 * contributionMargin) - fixedCosts,
        100: (100 * contributionMargin) - fixedCosts,
        150: (150 * contributionMargin) - fixedCosts,
        200: (200 * contributionMargin) - fixedCosts
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all saved estimates
router.get('/estimates', async (req, res) => {
  try {
    const estimates = await req.prisma.costEstimate.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(estimates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single estimate
router.get('/estimates/:id', async (req, res) => {
  try {
    const estimate = await req.prisma.costEstimate.findUnique({
      where: { id: req.params.id }
    });
    if (!estimate) {
      return res.status(404).json({ error: 'Estimate not found' });
    }
    res.json(estimate);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save a new estimate
router.post('/estimates', async (req, res) => {
  try {
    const {
      name,
      eventId,
      guestCount,
      packageId,
      profitMarginPercent,
      overheadPercent,
      taxRate,
      laborCostPerHour,
      foodCost,
      laborCost,
      equipmentCost,
      additionalCost,
      overheadAmount,
      subtotal,
      profitAmount,
      taxAmount,
      totalAmount,
      pricePerPerson,
      staffDetails,
      additionalDetails,
      notes,
      status
    } = req.body;

    const estimate = await req.prisma.costEstimate.create({
      data: {
        name: name || `Estimate - ${new Date().toLocaleDateString()}`,
        eventId: eventId || null,
        guestCount,
        packageId: packageId || null,
        profitMarginPercent,
        overheadPercent,
        taxRate,
        laborCostPerHour,
        foodCost,
        laborCost,
        equipmentCost,
        additionalCost: additionalCost || 0,
        overheadAmount,
        subtotal,
        profitAmount,
        taxAmount,
        totalAmount,
        pricePerPerson,
        staffDetails: staffDetails || null,
        additionalDetails: additionalDetails || null,
        notes: notes || null,
        status: status || 'DRAFT'
      }
    });

    res.status(201).json(estimate);
  } catch (error) {
    console.error('Error saving estimate:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update an estimate
router.put('/estimates/:id', async (req, res) => {
  try {
    const {
      name,
      eventId,
      guestCount,
      packageId,
      profitMarginPercent,
      overheadPercent,
      taxRate,
      laborCostPerHour,
      foodCost,
      laborCost,
      equipmentCost,
      additionalCost,
      overheadAmount,
      subtotal,
      profitAmount,
      taxAmount,
      totalAmount,
      pricePerPerson,
      staffDetails,
      additionalDetails,
      notes,
      status
    } = req.body;

    const estimate = await req.prisma.costEstimate.update({
      where: { id: req.params.id },
      data: {
        name,
        eventId: eventId || null,
        guestCount,
        packageId: packageId || null,
        profitMarginPercent,
        overheadPercent,
        taxRate,
        laborCostPerHour,
        foodCost,
        laborCost,
        equipmentCost,
        additionalCost: additionalCost || 0,
        overheadAmount,
        subtotal,
        profitAmount,
        taxAmount,
        totalAmount,
        pricePerPerson,
        staffDetails: staffDetails || null,
        additionalDetails: additionalDetails || null,
        notes,
        status
      }
    });

    res.json(estimate);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete an estimate
router.delete('/estimates/:id', async (req, res) => {
  try {
    await req.prisma.costEstimate.delete({
      where: { id: req.params.id }
    });
    res.json({ message: 'Estimate deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Convert estimate to proposal
router.post('/estimates/:id/convert-to-proposal', async (req, res) => {
  try {
    const estimate = await req.prisma.costEstimate.findUnique({
      where: { id: req.params.id }
    });

    if (!estimate) {
      return res.status(404).json({ error: 'Estimate not found' });
    }

    if (!estimate.eventId) {
      return res.status(400).json({ error: 'Estimate must be linked to an event to create a proposal' });
    }

    // Create proposal from estimate
    const proposal = await req.prisma.proposal.create({
      data: {
        eventId: estimate.eventId,
        createdById: req.body.userId,
        status: 'DRAFT',
        totalAmount: estimate.totalAmount,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        notes: estimate.notes,
        lineItems: {
          create: [
            {
              description: 'Food & Beverage',
              quantity: estimate.guestCount,
              unitPrice: estimate.foodCost / estimate.guestCount,
              total: estimate.foodCost,
              category: 'Food'
            },
            {
              description: 'Labor & Service',
              quantity: 1,
              unitPrice: estimate.laborCost,
              total: estimate.laborCost,
              category: 'Labor'
            },
            {
              description: 'Equipment Rental',
              quantity: 1,
              unitPrice: estimate.equipmentCost,
              total: estimate.equipmentCost,
              category: 'Equipment'
            }
          ]
        }
      }
    });

    // Update estimate status
    await req.prisma.costEstimate.update({
      where: { id: req.params.id },
      data: { status: 'CONVERTED_TO_PROPOSAL' }
    });

    res.json({ proposal, message: 'Proposal created from estimate' });
  } catch (error) {
    console.error('Error converting estimate to proposal:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
