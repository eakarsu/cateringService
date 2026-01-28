const express = require('express');
const router = express.Router();

// ==================== SUPPLIERS ====================

// Get all suppliers
router.get('/', async (req, res) => {
  try {
    const { category, active } = req.query;
    const where = {};
    if (category) where.category = category;
    if (active !== undefined) where.isActive = active === 'true';

    const suppliers = await req.prisma.supplier.findMany({
      where,
      include: {
        purchaseOrders: {
          orderBy: { orderDate: 'desc' },
          take: 5
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get supplier by ID
router.get('/:id', async (req, res) => {
  try {
    const supplier = await req.prisma.supplier.findUnique({
      where: { id: req.params.id },
      include: {
        purchaseOrders: {
          include: { items: true },
          orderBy: { orderDate: 'desc' }
        }
      }
    });
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create supplier
router.post('/', async (req, res) => {
  try {
    const { name, contactName, email, phone, address, category, notes } = req.body;

    const supplier = await req.prisma.supplier.create({
      data: {
        name,
        contactName,
        email,
        phone,
        address,
        category,
        notes
      }
    });
    res.status(201).json(supplier);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update supplier
router.put('/:id', async (req, res) => {
  try {
    const { name, contactName, email, phone, address, category, notes, isActive } = req.body;

    const supplier = await req.prisma.supplier.update({
      where: { id: req.params.id },
      data: {
        name,
        contactName,
        email,
        phone,
        address,
        category,
        notes,
        isActive
      }
    });
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete supplier
router.delete('/:id', async (req, res) => {
  try {
    await req.prisma.supplier.delete({ where: { id: req.params.id } });
    res.json({ message: 'Supplier deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get supplier categories
router.get('/options/categories', async (req, res) => {
  res.json([
    { value: 'PRODUCE', label: 'Produce' },
    { value: 'MEAT', label: 'Meat & Poultry' },
    { value: 'SEAFOOD', label: 'Seafood' },
    { value: 'DAIRY', label: 'Dairy' },
    { value: 'BAKERY', label: 'Bakery' },
    { value: 'DRY_GOODS', label: 'Dry Goods' },
    { value: 'BEVERAGES', label: 'Beverages' },
    { value: 'EQUIPMENT', label: 'Equipment' },
    { value: 'LINENS', label: 'Linens & Decor' },
    { value: 'OTHER', label: 'Other' }
  ]);
});

// ==================== PURCHASE ORDERS ====================

// Get all purchase orders
router.get('/purchase-orders/all', async (req, res) => {
  try {
    const { status, supplierId } = req.query;
    const where = {};
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;

    const orders = await req.prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: true,
        items: true
      },
      orderBy: { orderDate: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get purchase order by ID
router.get('/purchase-orders/:id', async (req, res) => {
  try {
    const order = await req.prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
      include: {
        supplier: true,
        items: true
      }
    });
    if (!order) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate next PO number
const generatePONumber = async (prisma) => {
  const lastPO = await prisma.purchaseOrder.findFirst({
    orderBy: { orderNumber: 'desc' }
  });

  const year = new Date().getFullYear();
  if (lastPO && lastPO.orderNumber.startsWith(`PO-${year}`)) {
    const num = parseInt(lastPO.orderNumber.split('-')[2]) + 1;
    return `PO-${year}-${String(num).padStart(4, '0')}`;
  }
  return `PO-${year}-0001`;
};

// Create purchase order
router.post('/purchase-orders', async (req, res) => {
  try {
    const { supplierId, expectedDate, notes, items } = req.body;

    const orderNumber = await generatePONumber(req.prisma);
    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

    const order = await req.prisma.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId,
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        notes,
        totalAmount,
        items: {
          create: items.map(item => ({
            ingredientId: item.ingredientId || null,
            description: item.description,
            quantity: parseFloat(item.quantity),
            unit: item.unit,
            unitPrice: parseFloat(item.unitPrice),
            total: parseFloat(item.quantity) * parseFloat(item.unitPrice)
          }))
        }
      },
      include: { supplier: true, items: true }
    });
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update purchase order status
router.put('/purchase-orders/:id', async (req, res) => {
  try {
    const { status, expectedDate, notes } = req.body;

    const order = await req.prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: {
        status,
        expectedDate: expectedDate ? new Date(expectedDate) : undefined,
        notes
      },
      include: { supplier: true, items: true }
    });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete purchase order
router.delete('/purchase-orders/:id', async (req, res) => {
  try {
    await req.prisma.purchaseOrder.delete({ where: { id: req.params.id } });
    res.json({ message: 'Purchase order deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate PO from low-stock ingredients
router.post('/purchase-orders/from-low-stock', async (req, res) => {
  try {
    const { supplierId, ingredientIds } = req.body;

    // Get low-stock ingredients
    let ingredients;
    if (ingredientIds && ingredientIds.length > 0) {
      ingredients = await req.prisma.ingredient.findMany({
        where: { id: { in: ingredientIds } }
      });
    } else {
      ingredients = await req.prisma.ingredient.findMany({
        where: {
          isActive: true,
          parLevel: { not: null },
          currentStock: { lt: req.prisma.ingredient.fields.parLevel }
        }
      });
      // Filter in JS since Prisma doesn't support comparing two fields directly
      ingredients = ingredients.filter(ing => ing.currentStock < ing.parLevel);
    }

    if (ingredients.length === 0) {
      return res.status(400).json({ error: 'No low-stock ingredients found' });
    }

    const orderNumber = await generatePONumber(req.prisma);
    const items = ingredients.map(ing => ({
      ingredientId: ing.id,
      description: ing.name,
      quantity: (ing.parLevel - ing.currentStock) * 1.2, // Order 20% extra
      unit: ing.unit,
      unitPrice: ing.costPerUnit,
      total: ((ing.parLevel - ing.currentStock) * 1.2) * ing.costPerUnit
    }));

    const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

    const order = await req.prisma.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId,
        totalAmount,
        notes: 'Auto-generated from low-stock alert',
        items: {
          create: items
        }
      },
      include: { supplier: true, items: true }
    });

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get PO status options
router.get('/purchase-orders/options/statuses', async (req, res) => {
  res.json([
    { value: 'DRAFT', label: 'Draft' },
    { value: 'SUBMITTED', label: 'Submitted' },
    { value: 'CONFIRMED', label: 'Confirmed' },
    { value: 'SHIPPED', label: 'Shipped' },
    { value: 'RECEIVED', label: 'Received' },
    { value: 'CANCELLED', label: 'Cancelled' }
  ]);
});

module.exports = router;
