const express = require('express');
const router = express.Router();

// ==================== PREP LISTS ====================

// Get all prep lists
router.get('/prep-lists', async (req, res) => {
  try {
    const { status, date, orderId } = req.query;
    const where = {};
    if (status) where.status = status;
    if (orderId) where.orderId = orderId;
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      where.date = { gte: startOfDay, lte: endOfDay };
    }

    const prepLists = await req.prisma.prepList.findMany({
      where,
      include: {
        order: { include: { event: { select: { name: true, date: true } } } },
        items: true
      },
      orderBy: { date: 'asc' }
    });
    res.json(prepLists);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get prep list by ID
router.get('/prep-lists/:id', async (req, res) => {
  try {
    const prepList = await req.prisma.prepList.findUnique({
      where: { id: req.params.id },
      include: {
        order: { include: { event: true, items: { include: { menuItem: true } } } },
        items: true
      }
    });
    if (!prepList) {
      return res.status(404).json({ error: 'Prep list not found' });
    }
    res.json(prepList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create prep list
router.post('/prep-lists', async (req, res) => {
  try {
    const { orderId, date, assignedTo, notes, items } = req.body;

    const prepList = await req.prisma.prepList.create({
      data: {
        orderId,
        date: new Date(date),
        assignedTo,
        notes,
        items: items ? {
          create: items.map(item => ({
            task: item.task,
            quantity: item.quantity,
            notes: item.notes
          }))
        } : undefined
      },
      include: { order: true, items: true }
    });
    res.status(201).json(prepList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update prep list
router.put('/prep-lists/:id', async (req, res) => {
  try {
    const { status, assignedTo, notes } = req.body;

    const prepList = await req.prisma.prepList.update({
      where: { id: req.params.id },
      data: { status, assignedTo, notes },
      include: { order: true, items: true }
    });
    res.json(prepList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete prep list
router.delete('/prep-lists/:id', async (req, res) => {
  try {
    await req.prisma.prepList.delete({ where: { id: req.params.id } });
    res.json({ message: 'Prep list deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add item to prep list
router.post('/prep-lists/:id/items', async (req, res) => {
  try {
    const { task, quantity, notes } = req.body;

    const item = await req.prisma.prepListItem.create({
      data: {
        prepListId: req.params.id,
        task,
        quantity,
        notes
      }
    });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update prep list item (mark complete)
router.put('/prep-lists/:id/items/:itemId', async (req, res) => {
  try {
    const { completed, notes } = req.body;

    const item = await req.prisma.prepListItem.update({
      where: { id: req.params.itemId },
      data: {
        completed,
        completedAt: completed ? new Date() : null,
        notes
      }
    });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== PACK LISTS ====================

// Get all pack lists
router.get('/pack-lists', async (req, res) => {
  try {
    const { status, orderId } = req.query;
    const where = {};
    if (status) where.status = status;
    if (orderId) where.orderId = orderId;

    const packLists = await req.prisma.packList.findMany({
      where,
      include: {
        order: { include: { event: { select: { name: true, date: true } } } },
        items: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(packLists);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pack list by ID
router.get('/pack-lists/:id', async (req, res) => {
  try {
    const packList = await req.prisma.packList.findUnique({
      where: { id: req.params.id },
      include: {
        order: { include: { event: true, items: { include: { menuItem: true } } } },
        items: true
      }
    });
    if (!packList) {
      return res.status(404).json({ error: 'Pack list not found' });
    }
    res.json(packList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create pack list
router.post('/pack-lists', async (req, res) => {
  try {
    const { orderId, packedBy, notes, items } = req.body;

    const packList = await req.prisma.packList.create({
      data: {
        orderId,
        packedBy,
        notes,
        items: items ? {
          create: items.map(item => ({
            item: item.item,
            quantity: parseInt(item.quantity),
            notes: item.notes
          }))
        } : undefined
      },
      include: { order: true, items: true }
    });
    res.status(201).json(packList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update pack list
router.put('/pack-lists/:id', async (req, res) => {
  try {
    const { status, packedBy, checkedBy, notes } = req.body;

    const packList = await req.prisma.packList.update({
      where: { id: req.params.id },
      data: { status, packedBy, checkedBy, notes },
      include: { order: true, items: true }
    });
    res.json(packList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update pack list item
router.put('/pack-lists/:id/items/:itemId', async (req, res) => {
  try {
    const { packed, notes } = req.body;

    const item = await req.prisma.packListItem.update({
      where: { id: req.params.itemId },
      data: { packed, notes }
    });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== RECIPES ====================

// Get all recipes
router.get('/recipes', async (req, res) => {
  try {
    const recipes = await req.prisma.recipe.findMany({
      include: {
        menuItem: { select: { name: true, category: true } },
        ingredients: { include: { ingredient: true } }
      },
      orderBy: { name: 'asc' }
    });
    res.json(recipes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get recipe by ID
router.get('/recipes/:id', async (req, res) => {
  try {
    const recipe = await req.prisma.recipe.findUnique({
      where: { id: req.params.id },
      include: {
        menuItem: true,
        ingredients: { include: { ingredient: true } }
      }
    });
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.json(recipe);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create recipe
router.post('/recipes', async (req, res) => {
  try {
    const { menuItemId, name, instructions, prepTime, cookTime, servings, ingredients } = req.body;

    const recipe = await req.prisma.recipe.create({
      data: {
        menuItemId,
        name,
        instructions,
        prepTime: parseInt(prepTime),
        cookTime: parseInt(cookTime),
        servings: parseInt(servings),
        ingredients: ingredients ? {
          create: ingredients.map(ing => ({
            ingredientId: ing.ingredientId,
            quantity: parseFloat(ing.quantity),
            unit: ing.unit,
            notes: ing.notes
          }))
        } : undefined
      },
      include: { menuItem: true, ingredients: { include: { ingredient: true } } }
    });
    res.status(201).json(recipe);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update recipe
router.put('/recipes/:id', async (req, res) => {
  try {
    const { name, instructions, prepTime, cookTime, servings } = req.body;

    const recipe = await req.prisma.recipe.update({
      where: { id: req.params.id },
      data: {
        name,
        instructions,
        prepTime: prepTime ? parseInt(prepTime) : undefined,
        cookTime: cookTime ? parseInt(cookTime) : undefined,
        servings: servings ? parseInt(servings) : undefined
      },
      include: { menuItem: true, ingredients: { include: { ingredient: true } } }
    });
    res.json(recipe);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== INGREDIENTS ====================

// Get all ingredients
router.get('/ingredients', async (req, res) => {
  try {
    const { category, lowStock } = req.query;
    const where = { isActive: true };
    if (category) where.category = category;

    let ingredients = await req.prisma.ingredient.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }]
    });

    if (lowStock === 'true') {
      ingredients = ingredients.filter(ing =>
        ing.parLevel && ing.currentStock < ing.parLevel
      );
    }

    res.json(ingredients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get ingredient by ID
router.get('/ingredients/:id', async (req, res) => {
  try {
    const ingredient = await req.prisma.ingredient.findUnique({
      where: { id: req.params.id },
      include: {
        recipeIngredients: { include: { recipe: { include: { menuItem: true } } } },
        inventoryLogs: { orderBy: { createdAt: 'desc' }, take: 20 }
      }
    });
    if (!ingredient) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }
    res.json(ingredient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create ingredient
router.post('/ingredients', async (req, res) => {
  try {
    const { name, unit, costPerUnit, supplier, parLevel, currentStock, category } = req.body;

    const ingredient = await req.prisma.ingredient.create({
      data: {
        name,
        unit,
        costPerUnit: parseFloat(costPerUnit),
        supplier,
        parLevel: parLevel ? parseFloat(parLevel) : null,
        currentStock: parseFloat(currentStock) || 0,
        category
      }
    });
    res.status(201).json(ingredient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update ingredient
router.put('/ingredients/:id', async (req, res) => {
  try {
    const { name, unit, costPerUnit, supplier, parLevel, currentStock, category, isActive } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (unit !== undefined) updateData.unit = unit;
    if (costPerUnit !== undefined) updateData.costPerUnit = parseFloat(costPerUnit);
    if (supplier !== undefined) updateData.supplier = supplier;
    if (parLevel !== undefined) updateData.parLevel = parLevel ? parseFloat(parLevel) : null;
    if (currentStock !== undefined) updateData.currentStock = parseFloat(currentStock);
    if (category !== undefined) updateData.category = category;
    if (isActive !== undefined) updateData.isActive = isActive;

    const ingredient = await req.prisma.ingredient.update({
      where: { id: req.params.id },
      data: updateData
    });
    res.json(ingredient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update ingredient stock
router.post('/ingredients/:id/adjust', async (req, res) => {
  try {
    const { type, quantity, notes } = req.body; // type: IN, OUT, ADJUSTMENT

    const ingredient = await req.prisma.ingredient.findUnique({
      where: { id: req.params.id }
    });

    let newStock = ingredient.currentStock;
    if (type === 'IN') newStock += parseFloat(quantity);
    else if (type === 'OUT') newStock -= parseFloat(quantity);
    else newStock = parseFloat(quantity);

    await req.prisma.ingredient.update({
      where: { id: req.params.id },
      data: { currentStock: newStock }
    });

    await req.prisma.inventoryLog.create({
      data: {
        ingredientId: req.params.id,
        type,
        quantity: parseFloat(quantity),
        notes
      }
    });

    res.json({ message: 'Stock adjusted', newStock });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get prep statuses (for dropdown)
router.get('/options/prep-statuses', async (req, res) => {
  res.json([
    { value: 'PENDING', label: 'Pending' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' }
  ]);
});

// Get ingredient categories (for dropdown)
router.get('/options/ingredient-categories', async (req, res) => {
  res.json([
    { value: 'PRODUCE', label: 'Produce' },
    { value: 'MEAT', label: 'Meat' },
    { value: 'SEAFOOD', label: 'Seafood' },
    { value: 'DAIRY', label: 'Dairy' },
    { value: 'BAKERY', label: 'Bakery' },
    { value: 'DRY_GOODS', label: 'Dry Goods' },
    { value: 'SPICES', label: 'Spices' },
    { value: 'BEVERAGES', label: 'Beverages' },
    { value: 'OTHER', label: 'Other' }
  ]);
});

// ==================== RECIPE SCALING ====================

// Scale a recipe for a specific guest count
router.post('/scale-recipe', async (req, res) => {
  try {
    const { recipeId, targetServings, bufferPercent = 10 } = req.body;

    const recipe = await req.prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: {
          include: { ingredient: true }
        },
        menuItem: true
      }
    });

    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    const scaleFactor = targetServings / recipe.servings;
    const bufferMultiplier = 1 + (bufferPercent / 100);

    const scaledIngredients = recipe.ingredients.map(ri => {
      const scaledQuantity = ri.quantity * scaleFactor * bufferMultiplier;
      return {
        ingredient: ri.ingredient.name,
        ingredientId: ri.ingredientId,
        originalQuantity: ri.quantity,
        scaledQuantity: Math.round(scaledQuantity * 100) / 100,
        unit: ri.unit,
        notes: ri.notes,
        category: ri.ingredient.category,
        costPerUnit: ri.ingredient.costPerUnit,
        estimatedCost: Math.round(scaledQuantity * ri.ingredient.costPerUnit * 100) / 100,
        currentStock: ri.ingredient.currentStock,
        needToOrder: Math.max(0, scaledQuantity - ri.ingredient.currentStock)
      };
    });

    const totalEstimatedCost = scaledIngredients.reduce((sum, ing) => sum + ing.estimatedCost, 0);

    res.json({
      recipe: {
        name: recipe.name,
        menuItem: recipe.menuItem?.name,
        originalServings: recipe.servings,
        targetServings,
        scaleFactor: Math.round(scaleFactor * 100) / 100,
        bufferPercent,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime
      },
      ingredients: scaledIngredients,
      summary: {
        totalIngredients: scaledIngredients.length,
        totalEstimatedCost: Math.round(totalEstimatedCost * 100) / 100,
        needToOrder: scaledIngredients.filter(i => i.needToOrder > 0).length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate shopping list for an event
router.get('/shopping-list/:eventId', async (req, res) => {
  try {
    const { bufferPercent = 15 } = req.query;

    const event = await req.prisma.event.findUnique({
      where: { id: req.params.eventId },
      include: {
        orders: {
          include: {
            package: {
              include: {
                items: {
                  include: {
                    menuItem: {
                      include: {
                        recipes: {
                          include: {
                            ingredients: {
                              include: { ingredient: true }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            items: {
              include: {
                menuItem: {
                  include: {
                    recipes: {
                      include: {
                        ingredients: {
                          include: { ingredient: true }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const guestCount = event.guestCount;
    const bufferMultiplier = 1 + (parseInt(bufferPercent) / 100);

    // Aggregate all ingredients needed
    const ingredientMap = new Map();

    event.orders.forEach(order => {
      // From package items
      order.package?.items?.forEach(pkgItem => {
        pkgItem.menuItem.recipes?.forEach(recipe => {
          const scaleFactor = guestCount / recipe.servings;
          recipe.ingredients.forEach(ri => {
            const key = ri.ingredientId;
            const quantity = ri.quantity * scaleFactor * bufferMultiplier;
            if (ingredientMap.has(key)) {
              const existing = ingredientMap.get(key);
              existing.quantity += quantity;
            } else {
              ingredientMap.set(key, {
                ingredientId: ri.ingredientId,
                name: ri.ingredient.name,
                quantity,
                unit: ri.unit,
                category: ri.ingredient.category,
                costPerUnit: ri.ingredient.costPerUnit,
                currentStock: ri.ingredient.currentStock,
                supplier: ri.ingredient.supplier
              });
            }
          });
        });
      });

      // From individual order items
      order.items?.forEach(orderItem => {
        orderItem.menuItem.recipes?.forEach(recipe => {
          const scaleFactor = (orderItem.quantity * guestCount) / recipe.servings;
          recipe.ingredients.forEach(ri => {
            const key = ri.ingredientId;
            const quantity = ri.quantity * scaleFactor * bufferMultiplier;
            if (ingredientMap.has(key)) {
              const existing = ingredientMap.get(key);
              existing.quantity += quantity;
            } else {
              ingredientMap.set(key, {
                ingredientId: ri.ingredientId,
                name: ri.ingredient.name,
                quantity,
                unit: ri.unit,
                category: ri.ingredient.category,
                costPerUnit: ri.ingredient.costPerUnit,
                currentStock: ri.ingredient.currentStock,
                supplier: ri.ingredient.supplier
              });
            }
          });
        });
      });
    });

    // Convert map to array and calculate needs
    const shoppingList = Array.from(ingredientMap.values()).map(ing => ({
      ...ing,
      quantity: Math.round(ing.quantity * 100) / 100,
      estimatedCost: Math.round(ing.quantity * ing.costPerUnit * 100) / 100,
      needToOrder: Math.max(0, Math.round((ing.quantity - ing.currentStock) * 100) / 100),
      inStock: ing.currentStock >= ing.quantity
    }));

    // Group by category
    const byCategory = shoppingList.reduce((acc, item) => {
      const cat = item.category || 'OTHER';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {});

    const totalCost = shoppingList.reduce((sum, item) => sum + item.estimatedCost, 0);
    const itemsToOrder = shoppingList.filter(i => !i.inStock);

    res.json({
      event: {
        name: event.name,
        date: event.date,
        guestCount
      },
      bufferPercent: parseInt(bufferPercent),
      shoppingList,
      byCategory,
      summary: {
        totalItems: shoppingList.length,
        totalEstimatedCost: Math.round(totalCost * 100) / 100,
        itemsInStock: shoppingList.filter(i => i.inStock).length,
        itemsToOrder: itemsToOrder.length,
        orderCost: Math.round(itemsToOrder.reduce((sum, i) => sum + (i.needToOrder * i.costPerUnit), 0) * 100) / 100
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Scale multiple recipes for a menu package
router.post('/scale-package', async (req, res) => {
  try {
    const { packageId, guestCount, bufferPercent = 15 } = req.body;

    const menuPackage = await req.prisma.menuPackage.findUnique({
      where: { id: packageId },
      include: {
        items: {
          include: {
            menuItem: {
              include: {
                recipes: {
                  include: {
                    ingredients: {
                      include: { ingredient: true }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!menuPackage) {
      return res.status(404).json({ error: 'Menu package not found' });
    }

    const bufferMultiplier = 1 + (bufferPercent / 100);
    const ingredientMap = new Map();
    const recipeDetails = [];

    menuPackage.items.forEach(pkgItem => {
      pkgItem.menuItem.recipes?.forEach(recipe => {
        const scaleFactor = guestCount / recipe.servings;

        recipeDetails.push({
          menuItem: pkgItem.menuItem.name,
          recipe: recipe.name,
          originalServings: recipe.servings,
          scaledServings: guestCount,
          prepTime: recipe.prepTime,
          cookTime: recipe.cookTime
        });

        recipe.ingredients.forEach(ri => {
          const key = ri.ingredientId;
          const quantity = ri.quantity * scaleFactor * bufferMultiplier;
          if (ingredientMap.has(key)) {
            const existing = ingredientMap.get(key);
            existing.quantity += quantity;
          } else {
            ingredientMap.set(key, {
              ingredientId: ri.ingredientId,
              name: ri.ingredient.name,
              quantity,
              unit: ri.unit,
              category: ri.ingredient.category,
              costPerUnit: ri.ingredient.costPerUnit,
              currentStock: ri.ingredient.currentStock
            });
          }
        });
      });
    });

    const ingredients = Array.from(ingredientMap.values()).map(ing => ({
      ...ing,
      quantity: Math.round(ing.quantity * 100) / 100,
      estimatedCost: Math.round(ing.quantity * ing.costPerUnit * 100) / 100,
      needToOrder: Math.max(0, Math.round((ing.quantity - ing.currentStock) * 100) / 100)
    }));

    const totalCost = ingredients.reduce((sum, i) => sum + i.estimatedCost, 0);

    res.json({
      package: {
        name: menuPackage.name,
        guestCount,
        bufferPercent
      },
      recipes: recipeDetails,
      ingredients,
      summary: {
        totalIngredients: ingredients.length,
        totalEstimatedCost: Math.round(totalCost * 100) / 100,
        needToOrder: ingredients.filter(i => i.needToOrder > 0).length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
