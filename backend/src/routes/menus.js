const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validatePagination } = require('../middleware/validate');

// ==================== MENU PACKAGES ====================

// Get all packages
router.get('/packages', authenticate, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const sortBy = req.query.sortBy || 'name';
    const sortOrder = req.query.sortOrder || 'asc';
    const { category, isActive } = req.query;

    const where = {};
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [packages, total] = await Promise.all([
      req.prisma.menuPackage.findMany({
        where,
        include: {
          items: { include: { menuItem: true } }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit
      }),
      req.prisma.menuPackage.count({ where })
    ]);

    res.json({ data: packages, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});

// Get package by ID
router.get('/packages/:id', async (req, res) => {
  try {
    const pkg = await req.prisma.menuPackage.findUnique({
      where: { id: req.params.id },
      include: {
        items: { include: { menuItem: true } }
      }
    });
    if (!pkg) {
      return res.status(404).json({ error: 'Package not found' });
    }
    res.json(pkg);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create package
router.post('/packages', authenticate, async (req, res) => {
  try {
    const { name, description, pricePerPerson, minGuests, maxGuests, category, items } = req.body;

    const pkg = await req.prisma.menuPackage.create({
      data: {
        name,
        description,
        pricePerPerson: parseFloat(pricePerPerson),
        minGuests: parseInt(minGuests) || 10,
        maxGuests: maxGuests ? parseInt(maxGuests) : null,
        category: category || 'BUFFET',
        items: items ? {
          create: items.map(item => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity || 1,
            isRequired: item.isRequired !== false
          }))
        } : undefined
      },
      include: { items: { include: { menuItem: true } } }
    });
    res.status(201).json(pkg);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update package
router.put('/packages/:id', authenticate, async (req, res) => {
  try {
    const { name, description, pricePerPerson, minGuests, maxGuests, category, isActive } = req.body;

    const pkg = await req.prisma.menuPackage.update({
      where: { id: req.params.id },
      data: {
        name,
        description,
        pricePerPerson: pricePerPerson ? parseFloat(pricePerPerson) : undefined,
        minGuests: minGuests ? parseInt(minGuests) : undefined,
        maxGuests: maxGuests ? parseInt(maxGuests) : undefined,
        category,
        isActive
      },
      include: { items: { include: { menuItem: true } } }
    });
    res.json(pkg);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete package
router.delete('/packages/:id', authenticate, async (req, res) => {
  try {
    await req.prisma.menuPackage.delete({ where: { id: req.params.id } });
    res.json({ message: 'Package deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add item to package
router.post('/packages/:id/items', async (req, res) => {
  try {
    const { menuItemId, quantity, isRequired } = req.body;
    const item = await req.prisma.menuPackageItem.create({
      data: {
        packageId: req.params.id,
        menuItemId,
        quantity: quantity || 1,
        isRequired: isRequired !== false
      },
      include: { menuItem: true }
    });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove item from package
router.delete('/packages/:id/items/:itemId', async (req, res) => {
  try {
    await req.prisma.menuPackageItem.delete({ where: { id: req.params.itemId } });
    res.json({ message: 'Item removed from package' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== MENU ITEMS ====================

// Get all menu items
router.get('/items', authenticate, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const sortBy = req.query.sortBy || 'name';
    const sortOrder = req.query.sortOrder || 'asc';
    const { category, isActive, dietary } = req.query;

    const where = {};
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (dietary) {
      if (dietary === 'vegetarian') where.isVegetarian = true;
      if (dietary === 'vegan') where.isVegan = true;
      if (dietary === 'gluten-free') where.isGlutenFree = true;
      if (dietary === 'dairy-free') where.isDairyFree = true;
      if (dietary === 'nut-free') where.isNutFree = true;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [items, total] = await Promise.all([
      req.prisma.menuItem.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit
      }),
      req.prisma.menuItem.count({ where })
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});

// Get menu item by ID
router.get('/items/:id', async (req, res) => {
  try {
    const item = await req.prisma.menuItem.findUnique({
      where: { id: req.params.id },
      include: { recipes: true }
    });
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create menu item
router.post('/items', authenticate, async (req, res) => {
  try {
    const {
      name, description, price, category,
      isVegetarian, isVegan, isGlutenFree, isDairyFree, isNutFree, allergens
    } = req.body;

    const item = await req.prisma.menuItem.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        category,
        isVegetarian: isVegetarian || false,
        isVegan: isVegan || false,
        isGlutenFree: isGlutenFree || false,
        isDairyFree: isDairyFree || false,
        isNutFree: isNutFree || false,
        allergens
      }
    });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update menu item
router.put('/items/:id', authenticate, async (req, res) => {
  try {
    const {
      name, description, price, category, isActive,
      isVegetarian, isVegan, isGlutenFree, isDairyFree, isNutFree, allergens
    } = req.body;

    const item = await req.prisma.menuItem.update({
      where: { id: req.params.id },
      data: {
        name,
        description,
        price: price ? parseFloat(price) : undefined,
        category,
        isActive,
        isVegetarian,
        isVegan,
        isGlutenFree,
        isDairyFree,
        isNutFree,
        allergens
      }
    });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete menu item
router.delete('/items/:id', authenticate, async (req, res) => {
  try {
    await req.prisma.menuItem.delete({ where: { id: req.params.id } });
    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get menu categories (for dropdown)
router.get('/options/categories', async (req, res) => {
  res.json([
    { value: 'APPETIZER', label: 'Appetizer' },
    { value: 'SALAD', label: 'Salad' },
    { value: 'SOUP', label: 'Soup' },
    { value: 'MAIN', label: 'Main Course' },
    { value: 'SIDE', label: 'Side Dish' },
    { value: 'DESSERT', label: 'Dessert' },
    { value: 'BEVERAGE', label: 'Beverage' },
    { value: 'OTHER', label: 'Other' }
  ]);
});

// Get package categories (for dropdown)
router.get('/options/package-categories', async (req, res) => {
  res.json([
    { value: 'BUFFET', label: 'Buffet' },
    { value: 'PLATED', label: 'Plated' },
    { value: 'COCKTAIL', label: 'Cocktail' },
    { value: 'BBQ', label: 'BBQ' },
    { value: 'BREAKFAST', label: 'Breakfast' },
    { value: 'LUNCH', label: 'Lunch' },
    { value: 'DINNER', label: 'Dinner' },
    { value: 'DESSERT', label: 'Dessert' }
  ]);
});

// Bulk delete packages
router.post('/packages/bulk-delete', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ error: 'No IDs provided' });
    await req.prisma.menuPackage.deleteMany({ where: { id: { in: ids } } });
    res.json({ message: `${ids.length} packages deleted` });
  } catch (error) { next(error); }
});

// Bulk update packages
router.put('/packages/bulk-update', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { ids, data } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ error: 'No IDs provided' });
    await req.prisma.menuPackage.updateMany({ where: { id: { in: ids } }, data });
    res.json({ message: `${ids.length} packages updated` });
  } catch (error) { next(error); }
});

// Bulk delete menu items
router.post('/items/bulk-delete', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ error: 'No IDs provided' });
    await req.prisma.menuItem.deleteMany({ where: { id: { in: ids } } });
    res.json({ message: `${ids.length} menu items deleted` });
  } catch (error) { next(error); }
});

// Bulk update menu items
router.put('/items/bulk-update', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { ids, data } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ error: 'No IDs provided' });
    await req.prisma.menuItem.updateMany({ where: { id: { in: ids } }, data });
    res.json({ message: `${ids.length} menu items updated` });
  } catch (error) { next(error); }
});

// Export menu items for PDF
router.get('/items/export/pdf', authenticate, async (req, res, next) => {
  try {
    const items = await req.prisma.menuItem.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }]
    });
    const exportData = items.map(i => ({
      name: i.name,
      category: i.category,
      price: i.price,
      description: i.description || '',
      vegetarian: i.isVegetarian ? 'Yes' : 'No',
      vegan: i.isVegan ? 'Yes' : 'No',
      glutenFree: i.isGlutenFree ? 'Yes' : 'No'
    }));
    res.json({ title: 'Menu Items Report', columns: ['Name', 'Category', 'Price', 'Description', 'Vegetarian', 'Vegan', 'Gluten Free'], rows: exportData });
  } catch (error) { next(error); }
});

module.exports = router;
