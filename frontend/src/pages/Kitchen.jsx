import { useState, useEffect } from 'react';
import api from '../utils/api';
import { format } from 'date-fns';
import { Plus, ChefHat, CheckCircle, Clock, Package, AlertTriangle, Trash2, Scale, ShoppingCart, Printer, X, Edit, TrendingUp, TrendingDown } from 'lucide-react';

export default function Kitchen() {
  const [prepLists, setPrepLists] = useState([]);
  const [packLists, setPackLists] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [orders, setOrders] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [menuPackages, setMenuPackages] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('prep');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('prep');
  const [formData, setFormData] = useState({ orderId: '', date: '', items: [] });
  const [error, setError] = useState('');
  const [selectedList, setSelectedList] = useState(null);

  // Scaling state
  const [scalingType, setScalingType] = useState('recipe');
  const [selectedRecipe, setSelectedRecipe] = useState('');
  const [selectedPackage, setSelectedPackage] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [guestCount, setGuestCount] = useState(50);
  const [bufferPercent, setBufferPercent] = useState(10);
  const [scaledIngredients, setScaledIngredients] = useState([]);
  const [shoppingList, setShoppingList] = useState([]);
  const [scalingLoading, setScalingLoading] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('IN');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [prepRes, packRes, ingredientsRes, ordersRes, recipesRes, packagesRes, eventsRes] = await Promise.all([
        api.get('/kitchen/prep-lists'),
        api.get('/kitchen/pack-lists'),
        api.get('/kitchen/ingredients'),
        api.get('/orders'),
        api.get('/kitchen/recipes').catch(() => ({ data: [] })),
        api.get('/menus/packages').catch(() => ({ data: [] })),
        api.get('/events').catch(() => ({ data: [] }))
      ]);
      setPrepLists(prepRes.data);
      setPackLists(packRes.data);
      setIngredients(ingredientsRes.data);
      setOrders(ordersRes.data);
      setRecipes(recipesRes.data);
      setMenuPackages(packagesRes.data);
      setEvents(eventsRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScaleRecipe = async () => {
    if (!selectedRecipe) {
      alert('Please select a recipe first');
      return;
    }
    setScalingLoading(true);
    setError('');
    try {
      const response = await api.post('/kitchen/scale-recipe', {
        recipeId: selectedRecipe,
        targetServings: guestCount,
        bufferPercent
      });
      // Map response to expected format
      const ingredients = response.data.ingredients || [];
      if (ingredients.length === 0) {
        setError('No ingredients found for this recipe');
      }
      setScaledIngredients(ingredients.map(ing => ({
        name: ing.ingredient,
        category: ing.category,
        scaledQuantity: ing.scaledQuantity,
        unit: ing.unit,
        estimatedCost: ing.estimatedCost
      })));
    } catch (err) {
      console.error('Failed to scale recipe:', err);
      setError('Failed to scale recipe: ' + (err.response?.data?.error || err.message));
    } finally {
      setScalingLoading(false);
    }
  };

  const handleScalePackage = async () => {
    if (!selectedPackage) {
      alert('Please select a package first');
      return;
    }
    setScalingLoading(true);
    setError('');
    try {
      const response = await api.post('/kitchen/scale-package', {
        packageId: selectedPackage,
        guestCount,
        bufferPercent
      });
      // Map response to expected format
      const ingredients = response.data.ingredients || [];
      if (ingredients.length === 0) {
        setError('No ingredients found. Make sure the package has recipes with ingredients.');
      }
      setScaledIngredients(ingredients.map(ing => ({
        name: ing.name,
        category: ing.category,
        scaledQuantity: ing.quantity,
        unit: ing.unit,
        estimatedCost: ing.estimatedCost
      })));
    } catch (err) {
      console.error('Failed to scale package:', err);
      setError('Failed to scale package: ' + (err.response?.data?.error || err.message));
    } finally {
      setScalingLoading(false);
    }
  };

  const handleGenerateShoppingList = async () => {
    if (!selectedEvent) {
      alert('Please select an event first');
      return;
    }
    setScalingLoading(true);
    setError('');
    try {
      const response = await api.get(`/kitchen/shopping-list/${selectedEvent}`);
      // Map response to expected format
      const items = response.data.shoppingList || [];
      if (items.length === 0) {
        setError('No ingredients found. Make sure the event has orders with recipes.');
      }
      setShoppingList(items.map(item => ({
        name: item.name,
        category: item.category,
        totalQuantity: item.quantity,
        unit: item.unit,
        estimatedCost: item.estimatedCost,
        needToOrder: item.needToOrder,
        inStock: item.inStock
      })));
    } catch (err) {
      console.error('Failed to generate shopping list:', err);
      setError('Failed to generate shopping list: ' + (err.response?.data?.error || err.message));
    } finally {
      setScalingLoading(false);
    }
  };

  const handlePrintShoppingList = () => {
    const printContent = shoppingList.map(item =>
      `${item.name}: ${item.totalQuantity.toFixed(2)} ${item.unit} (Est. $${item.estimatedCost.toFixed(2)})`
    ).join('\n');
    const printWindow = window.open('', '', 'width=600,height=800');
    printWindow.document.write(`
      <html>
        <head><title>Shopping List</title></head>
        <body style="font-family: monospace; padding: 20px;">
          <h2>Shopping List</h2>
          <pre>${printContent}</pre>
          <p>Total Estimated Cost: $${shoppingList.reduce((sum, item) => sum + item.estimatedCost, 0).toFixed(2)}</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const openModal = (type) => {
    setModalType(type);
    setError('');
    setFormData({
      orderId: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      items: [{ task: '', quantity: '', notes: '' }]
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const endpoint = modalType === 'prep' ? '/kitchen/prep-lists' : '/kitchen/pack-lists';
      const payload = modalType === 'prep'
        ? { ...formData }
        : { orderId: formData.orderId, items: formData.items.map(i => ({ item: i.task, quantity: parseInt(i.quantity) || 1, notes: i.notes })) };
      await api.post(endpoint, payload);
      setShowModal(false);
      loadData();
    } catch (err) {
      console.error('Failed to create:', err);
      setError(err.response?.data?.error || 'Failed to create. Please try again.');
    }
  };

  const togglePrepItem = async (listId, itemId, completed) => {
    try {
      await api.put(`/kitchen/prep-lists/${listId}/items/${itemId}`, { completed: !completed });
      loadData();
    } catch (error) {
      console.error('Failed to update:', error);
    }
  };

  const togglePackItem = async (listId, itemId, packed) => {
    try {
      await api.put(`/kitchen/pack-lists/${listId}/items/${itemId}`, { packed: !packed });
      loadData();
    } catch (error) {
      console.error('Failed to update:', error);
    }
  };

  const updateListStatus = async (type, id, status) => {
    try {
      const endpoint = type === 'prep' ? `/kitchen/prep-lists/${id}` : `/kitchen/pack-lists/${id}`;
      await api.put(endpoint, { status });
      loadData();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const lowStockIngredients = ingredients.filter(ing => ing.parLevel && ing.currentStock < ing.parLevel);

  const handleAdjustStock = async () => {
    if (!selectedIngredient || !adjustmentAmount) return;

    try {
      const amount = parseFloat(adjustmentAmount);
      let newStock = selectedIngredient.currentStock;

      if (adjustmentType === 'IN') {
        newStock += amount;
      } else if (adjustmentType === 'OUT') {
        newStock -= amount;
      } else {
        newStock = amount; // Direct adjustment
      }

      await api.put(`/kitchen/ingredients/${selectedIngredient.id}`, {
        currentStock: Math.max(0, newStock)
      });

      loadData();
      setSelectedIngredient(null);
      setAdjustmentAmount('');
      setAdjustmentType('IN');
    } catch (err) {
      console.error('Failed to adjust stock:', err);
      alert('Failed to adjust stock: ' + (err.response?.data?.error || err.message));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kitchen Operations</h1>
          <p className="text-gray-500">Manage prep lists, pack lists, and inventory</p>
        </div>
        <button
          onClick={() => openModal(activeTab === 'prep' ? 'prep' : 'pack')}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          New {activeTab === 'prep' ? 'Prep List' : 'Pack List'}
        </button>
      </div>

      {/* Low Stock Alert */}
      {lowStockIngredients.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-800 font-medium mb-2">
            <AlertTriangle size={20} />
            Low Stock Alert
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockIngredients.map(ing => (
              <span key={ing.id} className="badge badge-warning">
                {ing.name}: {ing.currentStock} / {ing.parLevel} {ing.unit}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {[
            { id: 'prep', label: 'Prep Lists', count: prepLists.length },
            { id: 'pack', label: 'Pack Lists', count: packLists.length },
            { id: 'inventory', label: 'Inventory', count: ingredients.length },
            { id: 'scaling', label: 'Scaling Calculator', icon: Scale }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2
                ${activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              {tab.icon && <tab.icon size={16} />}
              {tab.label} {tab.count !== undefined && `(${tab.count})`}
            </button>
          ))}
        </nav>
      </div>

      {/* Prep Lists */}
      {activeTab === 'prep' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {prepLists.map((list) => (
            <div key={list.id} className="card cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedList({type: 'prep', data: list})}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium text-gray-900">{list.order?.event?.name}</p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(list.date), 'MMM d, yyyy')}
                  </p>
                </div>
                <select
                  value={list.status}
                  onChange={(e) => updateListStatus('prep', list.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className={`badge ${
                    list.status === 'COMPLETED' ? 'badge-success' :
                    list.status === 'IN_PROGRESS' ? 'badge-info' : 'badge-warning'
                  } border-0`}
                >
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              <div className="space-y-2">
                {list.items?.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-2 rounded ${
                      item.completed ? 'bg-green-50' : 'bg-gray-50'
                    }`}
                  >
                    <button
                      onClick={() => togglePrepItem(list.id, item.id, item.completed)}
                      className={item.completed ? 'text-green-600' : 'text-gray-400'}
                    >
                      <CheckCircle size={20} />
                    </button>
                    <div className="flex-1">
                      <p className={item.completed ? 'line-through text-gray-500' : ''}>
                        {item.task}
                      </p>
                      {item.quantity && (
                        <p className="text-sm text-gray-500">{item.quantity}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-500">
                {list.items?.filter(i => i.completed).length} / {list.items?.length} completed
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pack Lists */}
      {activeTab === 'pack' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packLists.map((list) => (
            <div key={list.id} className="card cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedList({type: 'pack', data: list})}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium text-gray-900">{list.order?.event?.name}</p>
                  <p className="text-sm text-gray-500">
                    Order: {list.order?.orderNumber}
                  </p>
                </div>
                <select
                  value={list.status}
                  onChange={(e) => updateListStatus('pack', list.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className={`badge ${
                    list.status === 'COMPLETED' ? 'badge-success' :
                    list.status === 'IN_PROGRESS' ? 'badge-info' : 'badge-warning'
                  } border-0`}
                >
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              <div className="space-y-2">
                {list.items?.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-2 rounded ${
                      item.packed ? 'bg-green-50' : 'bg-gray-50'
                    }`}
                  >
                    <button
                      onClick={() => togglePackItem(list.id, item.id, item.packed)}
                      className={item.packed ? 'text-green-600' : 'text-gray-400'}
                    >
                      <Package size={20} />
                    </button>
                    <div className="flex-1">
                      <p className={item.packed ? 'line-through text-gray-500' : ''}>
                        {item.item}
                      </p>
                      <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inventory */}
      {activeTab === 'inventory' && (
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>Ingredient</th>
                <th>Category</th>
                <th>Current Stock</th>
                <th>Par Level</th>
                <th>Unit</th>
                <th>Cost/Unit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {ingredients.map((ing) => (
                <tr
                  key={ing.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedIngredient(ing)}
                >
                  <td className="font-medium">{ing.name}</td>
                  <td>{ing.category || '-'}</td>
                  <td>{ing.currentStock}</td>
                  <td>{ing.parLevel || '-'}</td>
                  <td>{ing.unit}</td>
                  <td>${ing.costPerUnit.toFixed(2)}</td>
                  <td>
                    {ing.parLevel && ing.currentStock < ing.parLevel ? (
                      <span className="badge badge-danger">Low Stock</span>
                    ) : (
                      <span className="badge badge-success">OK</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Scaling Calculator */}
      {activeTab === 'scaling' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scaling Controls */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Scale size={20} className="text-indigo-600" />
              Ingredient Scaling Calculator
            </h3>

            <div className="space-y-4">
              {/* Scaling Type Selection */}
              <div className="flex gap-2">
                <button
                  onClick={() => { setScalingType('recipe'); setScaledIngredients([]); }}
                  className={`flex-1 py-2 px-4 rounded-lg border ${
                    scalingType === 'recipe' ? 'bg-indigo-50 border-indigo-600 text-indigo-600' : 'border-gray-200'
                  }`}
                >
                  Scale Recipe
                </button>
                <button
                  onClick={() => { setScalingType('package'); setScaledIngredients([]); }}
                  className={`flex-1 py-2 px-4 rounded-lg border ${
                    scalingType === 'package' ? 'bg-indigo-50 border-indigo-600 text-indigo-600' : 'border-gray-200'
                  }`}
                >
                  Scale Package
                </button>
                <button
                  onClick={() => { setScalingType('shopping'); setShoppingList([]); }}
                  className={`flex-1 py-2 px-4 rounded-lg border ${
                    scalingType === 'shopping' ? 'bg-indigo-50 border-indigo-600 text-indigo-600' : 'border-gray-200'
                  }`}
                >
                  Shopping List
                </button>
              </div>

              {/* Recipe Selection */}
              {scalingType === 'recipe' && (
                <div>
                  <label className="label">Select Recipe ({recipes.length} available)</label>
                  <select
                    className="select"
                    value={selectedRecipe}
                    onChange={(e) => setSelectedRecipe(e.target.value)}
                  >
                    <option value="">Choose a recipe...</option>
                    {recipes.map(recipe => (
                      <option key={recipe.id} value={recipe.id}>
                        {recipe.name} (serves {recipe.servings || 1})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Package Selection */}
              {scalingType === 'package' && (
                <div>
                  <label className="label">Select Menu Package ({menuPackages.length} available)</label>
                  <select
                    className="select"
                    value={selectedPackage}
                    onChange={(e) => setSelectedPackage(e.target.value)}
                  >
                    <option value="">Choose a package...</option>
                    {menuPackages.map(pkg => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} (${pkg.pricePerPerson}/person)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Event Selection for Shopping List */}
              {scalingType === 'shopping' && (
                <div>
                  <label className="label">Select Event ({events.filter(e => e.status === 'CONFIRMED').length} confirmed)</label>
                  <select
                    className="select"
                    value={selectedEvent}
                    onChange={(e) => setSelectedEvent(e.target.value)}
                  >
                    <option value="">Choose an event...</option>
                    {events.filter(e => e.status === 'CONFIRMED').map(event => (
                      <option key={event.id} value={event.id}>
                        {event.name} ({event.guestCount} guests)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Guest Count & Buffer */}
              {(scalingType === 'recipe' || scalingType === 'package') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Guest Count</label>
                    <input
                      type="number"
                      className="input"
                      value={guestCount}
                      onChange={(e) => setGuestCount(parseInt(e.target.value) || 0)}
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="label">Buffer % (extra)</label>
                    <input
                      type="number"
                      className="input"
                      value={bufferPercent}
                      onChange={(e) => setBufferPercent(parseInt(e.target.value) || 0)}
                      min="0"
                      max="50"
                    />
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4">
                {scalingType === 'recipe' && (
                  <button
                    onClick={handleScaleRecipe}
                    disabled={!selectedRecipe || scalingLoading}
                    className="btn btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {scalingLoading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Scale size={18} />
                        Scale Recipe
                      </>
                    )}
                  </button>
                )}
                {scalingType === 'package' && (
                  <button
                    onClick={handleScalePackage}
                    disabled={!selectedPackage || scalingLoading}
                    className="btn btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {scalingLoading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Scale size={18} />
                        Scale Package
                      </>
                    )}
                  </button>
                )}
                {scalingType === 'shopping' && (
                  <button
                    onClick={handleGenerateShoppingList}
                    disabled={!selectedEvent || scalingLoading}
                    className="btn btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {scalingLoading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <ShoppingCart size={18} />
                        Generate Shopping List
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">
                {scalingType === 'shopping' ? 'Shopping List' : 'Scaled Ingredients'}
              </h3>
              {scalingType === 'shopping' && shoppingList.length > 0 && (
                <button
                  onClick={handlePrintShoppingList}
                  className="btn btn-secondary flex items-center gap-2"
                >
                  <Printer size={16} />
                  Print
                </button>
              )}
            </div>

            {/* Scaled Ingredients Results */}
            {(scalingType === 'recipe' || scalingType === 'package') && (
              scaledIngredients.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Scale size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Select a {scalingType} and guest count, then click Scale to see results</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {scaledIngredients.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-500">{item.category || 'Uncategorized'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{item.scaledQuantity?.toFixed(2)} {item.unit}</p>
                        <p className="text-sm text-gray-500">Est. ${item.estimatedCost?.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex justify-between font-semibold">
                      <span>Total Estimated Cost:</span>
                      <span>${scaledIngredients.reduce((sum, item) => sum + (item.estimatedCost || 0), 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )
            )}

            {/* Shopping List Results */}
            {scalingType === 'shopping' && (
              shoppingList.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <ShoppingCart size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Select an event to generate a shopping list</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {shoppingList.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-500">{item.category || 'Uncategorized'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{item.totalQuantity?.toFixed(2)} {item.unit}</p>
                        <p className="text-sm text-gray-500">Est. ${item.estimatedCost?.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex justify-between font-semibold">
                      <span>Total Estimated Cost:</span>
                      <span>${shoppingList.reduce((sum, item) => sum + (item.estimatedCost || 0), 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                New {modalType === 'prep' ? 'Prep' : 'Pack'} List
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Order</label>
                  <select
                    className="select"
                    value={formData.orderId}
                    onChange={(e) => setFormData({...formData, orderId: e.target.value})}
                    required
                  >
                    <option value="">Select Order</option>
                    {orders.map(order => (
                      <option key={order.id} value={order.id}>
                        {order.orderNumber} - {order.event?.name}
                      </option>
                    ))}
                  </select>
                </div>
                {modalType === 'prep' && (
                  <div>
                    <label className="label">Date</label>
                    <input
                      type="date"
                      className="input"
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      required
                    />
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label">Items</label>
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      items: [...formData.items, { task: '', quantity: '', notes: '' }]
                    })}
                    className="text-indigo-600 text-sm hover:text-indigo-800"
                  >
                    + Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        className="input"
                        style={{ flex: 1 }}
                        placeholder={modalType === 'prep' ? 'Task description...' : 'Item name...'}
                        value={item.task}
                        onChange={(e) => {
                          const items = [...formData.items];
                          items[idx].task = e.target.value;
                          setFormData({...formData, items});
                        }}
                        required
                      />
                      <input
                        type="text"
                        className="input"
                        style={{ width: '80px' }}
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => {
                          const items = [...formData.items];
                          items[idx].quantity = e.target.value;
                          setFormData({...formData, items});
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          items: formData.items.filter((_, i) => i !== idx)
                        })}
                        className="text-red-500 hover:text-red-700 p-1"
                        disabled={formData.items.length === 1}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View List Modal */}
      {selectedList && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedList.type === 'prep' ? 'Prep List' : 'Pack List'} Details
                </h2>
                <span className={`badge ${
                  selectedList.data.status === 'COMPLETED' ? 'badge-success' :
                  selectedList.data.status === 'IN_PROGRESS' ? 'badge-info' : 'badge-warning'
                }`}>
                  {selectedList.data.status}
                </span>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Event</p>
                  <p className="font-medium">{selectedList.data.order?.event?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Order</p>
                  <p className="font-medium">{selectedList.data.order?.orderNumber}</p>
                </div>
                {selectedList.type === 'prep' && (
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-medium">{format(new Date(selectedList.data.date), 'MMMM d, yyyy')}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Progress</p>
                  <p className="font-medium">
                    {selectedList.data.items?.filter(i => selectedList.type === 'prep' ? i.completed : i.packed).length} / {selectedList.data.items?.length} items
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-2">Items</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedList.data.items?.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-3 rounded ${
                        (selectedList.type === 'prep' ? item.completed : item.packed) ? 'bg-green-50' : 'bg-gray-50'
                      }`}
                    >
                      <div>
                        <p className={(selectedList.type === 'prep' ? item.completed : item.packed) ? 'line-through text-gray-500' : 'font-medium'}>
                          {selectedList.type === 'prep' ? item.task : item.item}
                        </p>
                        {item.quantity && <p className="text-sm text-gray-500">Qty: {item.quantity}</p>}
                        {item.notes && <p className="text-sm text-gray-400">{item.notes}</p>}
                      </div>
                      <span className={`badge ${(selectedList.type === 'prep' ? item.completed : item.packed) ? 'badge-success' : 'badge-gray'}`}>
                        {(selectedList.type === 'prep' ? item.completed : item.packed) ? 'Done' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button onClick={() => setSelectedList(null)} className="btn btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Ingredient Detail Modal */}
      {selectedIngredient && (
        <div className="modal-overlay">
          <div className="modal-content max-w-lg">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedIngredient.name}
                </h2>
                <button
                  onClick={() => {
                    setSelectedIngredient(null);
                    setAdjustmentAmount('');
                    setAdjustmentType('IN');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Ingredient Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="font-medium">{selectedIngredient.category || 'Uncategorized'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Unit</p>
                  <p className="font-medium">{selectedIngredient.unit}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Current Stock</p>
                  <p className={`font-medium text-lg ${
                    selectedIngredient.parLevel && selectedIngredient.currentStock < selectedIngredient.parLevel
                      ? 'text-red-600'
                      : 'text-green-600'
                  }`}>
                    {selectedIngredient.currentStock} {selectedIngredient.unit}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Par Level</p>
                  <p className="font-medium">{selectedIngredient.parLevel || 'Not set'} {selectedIngredient.parLevel ? selectedIngredient.unit : ''}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Cost Per Unit</p>
                  <p className="font-medium">${selectedIngredient.costPerUnit?.toFixed(2) || '0.00'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Value</p>
                  <p className="font-medium">
                    ${(selectedIngredient.currentStock * (selectedIngredient.costPerUnit || 0)).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Stock Status */}
              <div className="p-4 rounded-lg bg-gray-50">
                <p className="text-sm font-medium text-gray-700 mb-2">Stock Status</p>
                {selectedIngredient.parLevel ? (
                  <div className="space-y-2">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${
                          selectedIngredient.currentStock >= selectedIngredient.parLevel
                            ? 'bg-green-500'
                            : selectedIngredient.currentStock >= selectedIngredient.parLevel * 0.5
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{
                          width: `${Math.min(100, (selectedIngredient.currentStock / selectedIngredient.parLevel) * 100)}%`
                        }}
                      />
                    </div>
                    <p className="text-sm text-gray-500">
                      {Math.round((selectedIngredient.currentStock / selectedIngredient.parLevel) * 100)}% of par level
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Set a par level to track stock status</p>
                )}
              </div>

              {/* Stock Adjustment */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">Adjust Stock</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAdjustmentType('IN')}
                    className={`flex-1 py-2 px-3 rounded-lg border flex items-center justify-center gap-2 ${
                      adjustmentType === 'IN'
                        ? 'bg-green-50 border-green-600 text-green-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <TrendingUp size={18} />
                    Stock In
                  </button>
                  <button
                    onClick={() => setAdjustmentType('OUT')}
                    className={`flex-1 py-2 px-3 rounded-lg border flex items-center justify-center gap-2 ${
                      adjustmentType === 'OUT'
                        ? 'bg-red-50 border-red-600 text-red-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <TrendingDown size={18} />
                    Stock Out
                  </button>
                  <button
                    onClick={() => setAdjustmentType('SET')}
                    className={`flex-1 py-2 px-3 rounded-lg border flex items-center justify-center gap-2 ${
                      adjustmentType === 'SET'
                        ? 'bg-blue-50 border-blue-600 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Edit size={18} />
                    Set Value
                  </button>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <input
                      type="number"
                      className="input"
                      placeholder={adjustmentType === 'SET' ? 'New quantity...' : 'Quantity...'}
                      value={adjustmentAmount}
                      onChange={(e) => setAdjustmentAmount(e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <button
                    onClick={handleAdjustStock}
                    disabled={!adjustmentAmount}
                    className="btn btn-primary"
                  >
                    {adjustmentType === 'IN' ? 'Add Stock' : adjustmentType === 'OUT' ? 'Remove Stock' : 'Update'}
                  </button>
                </div>
                {adjustmentAmount && (
                  <p className="text-sm text-gray-500">
                    {adjustmentType === 'IN' && `New stock: ${selectedIngredient.currentStock + parseFloat(adjustmentAmount || 0)} ${selectedIngredient.unit}`}
                    {adjustmentType === 'OUT' && `New stock: ${Math.max(0, selectedIngredient.currentStock - parseFloat(adjustmentAmount || 0))} ${selectedIngredient.unit}`}
                    {adjustmentType === 'SET' && `Will set stock to: ${parseFloat(adjustmentAmount || 0)} ${selectedIngredient.unit}`}
                  </p>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => {
                  setSelectedIngredient(null);
                  setAdjustmentAmount('');
                  setAdjustmentType('IN');
                }}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
