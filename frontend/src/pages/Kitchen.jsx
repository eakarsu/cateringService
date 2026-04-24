import { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import { format } from 'date-fns';
import {
  Plus, ChefHat, CheckCircle, Clock, Package, AlertTriangle, Trash2,
  Scale, ShoppingCart, Printer, X, Edit, TrendingUp, TrendingDown,
  Search, ArrowUpDown, CheckSquare, Square, FileText
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import { SkeletonGrid, SkeletonTable } from '../components/SkeletonLoader';
import { useToast } from '../context/ToastContext';

export default function Kitchen() {
  const toast = useToast();

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
  const [formErrors, setFormErrors] = useState({});
  const [error, setError] = useState('');
  const [selectedList, setSelectedList] = useState(null);

  // Scaling state
  const [scalingType, setScalingType] = useState('recipe');
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [guestCount, setGuestCount] = useState(50);
  const [bufferPercent, setBufferPercent] = useState(10);
  const [scaledIngredients, setScaledIngredients] = useState([]);
  const [shoppingList, setShoppingList] = useState([]);
  const [scalingLoading, setScalingLoading] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('IN');

  // Search, sort, pagination per tab
  const [prepSearch, setPrepSearch] = useState('');
  const [packSearch, setPackSearch] = useState('');
  const [recipeSearch, setRecipeSearch] = useState('');
  const [ingredientSearch, setIngredientSearch] = useState('');

  const [prepSort, setPrepSort] = useState({ field: 'date', dir: 'desc' });
  const [packSort, setPackSort] = useState({ field: 'status', dir: 'asc' });
  const [recipeSort, setRecipeSort] = useState({ field: 'name', dir: 'asc' });
  const [ingredientSort, setIngredientSort] = useState({ field: 'name', dir: 'asc' });

  const [prepPage, setPrepPage] = useState(1);
  const [packPage, setPackPage] = useState(1);
  const [recipePage, setRecipePage] = useState(1);
  const [ingredientPage, setIngredientPage] = useState(1);
  const pageLimit = 12;

  // Bulk select
  const [prepSelected, setPrepSelected] = useState([]);
  const [packSelected, setPackSelected] = useState([]);
  const [recipeSelected, setRecipeSelected] = useState([]);
  const [ingredientSelected, setIngredientSelected] = useState([]);

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Detail modal for recipe
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  // Edit recipe modal
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [recipeForm, setRecipeForm] = useState({ name: '', servings: '', instructions: '' });
  const [recipeFormErrors, setRecipeFormErrors] = useState({});

  // Edit ingredient modal
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [ingredientForm, setIngredientForm] = useState({ name: '', category: '', unit: '', costPerUnit: '', parLevel: '', currentStock: '' });
  const [ingredientFormErrors, setIngredientFormErrors] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const extractArray = (data) => {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    return [];
  };

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
      setPrepLists(extractArray(prepRes.data));
      setPackLists(extractArray(packRes.data));
      setIngredients(extractArray(ingredientsRes.data));
      setOrders(extractArray(ordersRes.data));
      setRecipes(extractArray(recipesRes.data));
      setMenuPackages(extractArray(packagesRes.data));
      setEvents(extractArray(eventsRes.data));
    } catch (err) {
      console.error('Failed to load data:', err);
      toast?.error('Failed to load kitchen data');
    } finally {
      setLoading(false);
    }
  };

  // --- Sorting helper ---
  const sortItems = (items, sort) => {
    return [...items].sort((a, b) => {
      let aVal = a[sort.field];
      let bVal = b[sort.field];
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return sort.dir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const toggleSort = (setter, currentSort, field) => {
    setter({ field, dir: currentSort.field === field && currentSort.dir === 'asc' ? 'desc' : 'asc' });
  };

  // --- Filtered + sorted + paginated data ---
  const filteredPrep = useMemo(() => {
    let items = prepLists.filter(l =>
      (l.order?.event?.name || '').toLowerCase().includes(prepSearch.toLowerCase()) ||
      (l.status || '').toLowerCase().includes(prepSearch.toLowerCase())
    );
    return sortItems(items, prepSort);
  }, [prepLists, prepSearch, prepSort]);

  const paginatedPrep = useMemo(() => {
    const start = (prepPage - 1) * pageLimit;
    return filteredPrep.slice(start, start + pageLimit);
  }, [filteredPrep, prepPage]);

  const filteredPack = useMemo(() => {
    let items = packLists.filter(l =>
      (l.order?.event?.name || '').toLowerCase().includes(packSearch.toLowerCase()) ||
      (l.order?.orderNumber || '').toLowerCase().includes(packSearch.toLowerCase())
    );
    return sortItems(items, packSort);
  }, [packLists, packSearch, packSort]);

  const paginatedPack = useMemo(() => {
    const start = (packPage - 1) * pageLimit;
    return filteredPack.slice(start, start + pageLimit);
  }, [filteredPack, packPage]);

  const filteredRecipes = useMemo(() => {
    let items = recipes.filter(r =>
      (r.name || '').toLowerCase().includes(recipeSearch.toLowerCase())
    );
    return sortItems(items, recipeSort);
  }, [recipes, recipeSearch, recipeSort]);

  const paginatedRecipes = useMemo(() => {
    const start = (recipePage - 1) * pageLimit;
    return filteredRecipes.slice(start, start + pageLimit);
  }, [filteredRecipes, recipePage]);

  const filteredIngredients = useMemo(() => {
    let items = ingredients.filter(i =>
      (i.name || '').toLowerCase().includes(ingredientSearch.toLowerCase()) ||
      (i.category || '').toLowerCase().includes(ingredientSearch.toLowerCase())
    );
    return sortItems(items, ingredientSort);
  }, [ingredients, ingredientSearch, ingredientSort]);

  const paginatedIngredients = useMemo(() => {
    const start = (ingredientPage - 1) * pageLimit;
    return filteredIngredients.slice(start, start + pageLimit);
  }, [filteredIngredients, ingredientPage]);

  // --- Bulk select helpers ---
  const toggleSelectAll = (filtered, selected, setSelected) => {
    const ids = filtered.map(i => i.id);
    if (ids.every(id => selected.includes(id))) {
      setSelected([]);
    } else {
      setSelected(ids);
    }
  };

  const toggleSelectOne = (id, selected, setSelected) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // --- Bulk delete ---
  const handleBulkDelete = (type, ids, setSelected) => {
    if (ids.length === 0) return;
    setConfirmDialog({
      isOpen: true,
      title: `Delete ${ids.length} item(s)?`,
      message: `This will permanently delete ${ids.length} selected item(s). This action cannot be undone.`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          let endpoint;
          if (type === 'prep') endpoint = '/kitchen/prep-lists';
          else if (type === 'pack') endpoint = '/kitchen/pack-lists';
          else if (type === 'recipe') endpoint = '/kitchen/recipes';
          else endpoint = '/kitchen/ingredients';

          await Promise.all(ids.map(id => api.delete(`${endpoint}/${id}`)));
          setSelected([]);
          toast?.success(`${ids.length} item(s) deleted successfully`);
          loadData();
        } catch (err) {
          console.error('Failed to bulk delete:', err);
          toast?.error('Failed to delete some items');
        }
      }
    });
  };

  // --- PDF export ---
  const exportPDF = (title, columns, rows) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(title, 14, 20);
    doc.setFontSize(10);
    doc.text(`Exported: ${format(new Date(), 'MMM d, yyyy h:mm a')}`, 14, 28);
    autoTable(doc, {
      startY: 35,
      head: [columns],
      body: rows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [79, 70, 229] }
    });
    doc.save(`${title.replace(/\s+/g, '_').toLowerCase()}.pdf`);
    toast?.success('PDF exported successfully');
  };

  const exportPrepPDF = () => {
    exportPDF('Prep Lists', ['Event', 'Date', 'Status', 'Progress'], filteredPrep.map(l => [
      l.order?.event?.name || '',
      format(new Date(l.date), 'MMM d, yyyy'),
      l.status,
      `${l.items?.filter(i => i.completed).length || 0}/${l.items?.length || 0}`
    ]));
  };

  const exportPackPDF = () => {
    exportPDF('Pack Lists', ['Event', 'Order', 'Status', 'Progress'], filteredPack.map(l => [
      l.order?.event?.name || '',
      l.order?.orderNumber || '',
      l.status,
      `${l.items?.filter(i => i.packed).length || 0}/${l.items?.length || 0}`
    ]));
  };

  const exportRecipesPDF = () => {
    exportPDF('Recipes', ['Name', 'Servings', 'Prep Time', 'Cook Time'], filteredRecipes.map(r => [
      r.name,
      r.servings || '-',
      r.prepTime ? `${r.prepTime} min` : '-',
      r.cookTime ? `${r.cookTime} min` : '-'
    ]));
  };

  const exportIngredientsPDF = () => {
    exportPDF('Ingredients', ['Name', 'Category', 'Stock', 'Par Level', 'Unit', 'Cost/Unit'], filteredIngredients.map(i => [
      i.name,
      i.category || '-',
      i.currentStock,
      i.parLevel || '-',
      i.unit,
      `$${(i.costPerUnit || 0).toFixed(2)}`
    ]));
  };

  // --- Scaling ---
  const handleScaleRecipe = async () => {
    if (!selectedRecipeId) { toast?.warning('Please select a recipe first'); return; }
    setScalingLoading(true);
    setError('');
    try {
      const response = await api.post('/kitchen/scale-recipe', { recipeId: selectedRecipeId, targetServings: guestCount, bufferPercent });
      const ings = response.data.ingredients || [];
      if (ings.length === 0) setError('No ingredients found for this recipe');
      setScaledIngredients(ings.map(ing => ({ name: ing.ingredient, category: ing.category, scaledQuantity: ing.scaledQuantity, unit: ing.unit, estimatedCost: ing.estimatedCost })));
      toast?.success('Recipe scaled successfully');
    } catch (err) {
      console.error('Failed to scale recipe:', err);
      setError('Failed to scale recipe: ' + (err.response?.data?.error || err.message));
      toast?.error('Failed to scale recipe');
    } finally { setScalingLoading(false); }
  };

  const handleScalePackage = async () => {
    if (!selectedPackageId) { toast?.warning('Please select a package first'); return; }
    setScalingLoading(true);
    setError('');
    try {
      const response = await api.post('/kitchen/scale-package', { packageId: selectedPackageId, guestCount, bufferPercent });
      const ings = response.data.ingredients || [];
      if (ings.length === 0) setError('No ingredients found. Make sure the package has recipes with ingredients.');
      setScaledIngredients(ings.map(ing => ({ name: ing.name, category: ing.category, scaledQuantity: ing.quantity, unit: ing.unit, estimatedCost: ing.estimatedCost })));
      toast?.success('Package scaled successfully');
    } catch (err) {
      console.error('Failed to scale package:', err);
      setError('Failed to scale package: ' + (err.response?.data?.error || err.message));
      toast?.error('Failed to scale package');
    } finally { setScalingLoading(false); }
  };

  const handleGenerateShoppingList = async () => {
    if (!selectedEventId) { toast?.warning('Please select an event first'); return; }
    setScalingLoading(true);
    setError('');
    try {
      const response = await api.get(`/kitchen/shopping-list/${selectedEventId}`);
      const items = response.data.shoppingList || [];
      if (items.length === 0) setError('No ingredients found. Make sure the event has orders with recipes.');
      setShoppingList(items.map(item => ({ name: item.name, category: item.category, totalQuantity: item.quantity, unit: item.unit, estimatedCost: item.estimatedCost, needToOrder: item.needToOrder, inStock: item.inStock })));
      toast?.success('Shopping list generated');
    } catch (err) {
      console.error('Failed to generate shopping list:', err);
      setError('Failed to generate shopping list: ' + (err.response?.data?.error || err.message));
      toast?.error('Failed to generate shopping list');
    } finally { setScalingLoading(false); }
  };

  const handlePrintShoppingList = () => {
    const printContent = shoppingList.map(item =>
      `${item.name}: ${item.totalQuantity.toFixed(2)} ${item.unit} (Est. $${item.estimatedCost.toFixed(2)})`
    ).join('\n');
    const printWindow = window.open('', '', 'width=600,height=800');
    printWindow.document.write(`<html><head><title>Shopping List</title></head><body style="font-family: monospace; padding: 20px;"><h2>Shopping List</h2><pre>${printContent}</pre><p>Total Estimated Cost: $${shoppingList.reduce((sum, item) => sum + item.estimatedCost, 0).toFixed(2)}</p></body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  // --- Create prep/pack list ---
  const validateListForm = () => {
    const errors = {};
    if (!formData.orderId) errors.orderId = 'Order is required';
    if (modalType === 'prep' && !formData.date) errors.date = 'Date is required';
    if (!formData.items || formData.items.length === 0) errors.items = 'At least one item is required';
    formData.items?.forEach((item, idx) => {
      if (!item.task?.trim()) errors[`item_${idx}`] = 'Item description is required';
    });
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openModal = (type) => {
    setModalType(type);
    setError('');
    setFormErrors({});
    setFormData({ orderId: '', date: format(new Date(), 'yyyy-MM-dd'), items: [{ task: '', quantity: '', notes: '' }] });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateListForm()) return;
    setError('');
    try {
      const endpoint = modalType === 'prep' ? '/kitchen/prep-lists' : '/kitchen/pack-lists';
      const payload = modalType === 'prep'
        ? { ...formData }
        : { orderId: formData.orderId, items: formData.items.map(i => ({ item: i.task, quantity: parseInt(i.quantity) || 1, notes: i.notes })) };
      await api.post(endpoint, payload);
      setShowModal(false);
      toast?.success(`${modalType === 'prep' ? 'Prep' : 'Pack'} list created successfully`);
      loadData();
    } catch (err) {
      console.error('Failed to create:', err);
      setError(err.response?.data?.error || 'Failed to create. Please try again.');
      toast?.error('Failed to create list');
    }
  };

  const togglePrepItem = async (listId, itemId, completed) => {
    try {
      await api.put(`/kitchen/prep-lists/${listId}/items/${itemId}`, { completed: !completed });
      loadData();
    } catch (err) {
      console.error('Failed to update:', err);
      toast?.error('Failed to update item');
    }
  };

  const togglePackItem = async (listId, itemId, packed) => {
    try {
      await api.put(`/kitchen/pack-lists/${listId}/items/${itemId}`, { packed: !packed });
      loadData();
    } catch (err) {
      console.error('Failed to update:', err);
      toast?.error('Failed to update item');
    }
  };

  const updateListStatus = async (type, id, status) => {
    try {
      const endpoint = type === 'prep' ? `/kitchen/prep-lists/${id}` : `/kitchen/pack-lists/${id}`;
      await api.put(endpoint, { status });
      toast?.success('Status updated');
      loadData();
    } catch (err) {
      console.error('Failed to update status:', err);
      toast?.error('Failed to update status');
    }
  };

  const handleDeleteList = (type, id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete List',
      message: 'Are you sure you want to delete this list? This action cannot be undone.',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          const endpoint = type === 'prep' ? `/kitchen/prep-lists/${id}` : `/kitchen/pack-lists/${id}`;
          await api.delete(endpoint);
          setSelectedList(null);
          toast?.success('List deleted');
          loadData();
        } catch (err) {
          console.error('Failed to delete:', err);
          toast?.error('Failed to delete list');
        }
      }
    });
  };

  // --- Recipe CRUD ---
  const validateRecipeForm = () => {
    const errors = {};
    if (!recipeForm.name?.trim()) errors.name = 'Recipe name is required';
    if (recipeForm.servings && (isNaN(recipeForm.servings) || recipeForm.servings < 1)) errors.servings = 'Servings must be a positive number';
    setRecipeFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openRecipeForm = (recipe = null) => {
    setEditingRecipe(recipe);
    setRecipeFormErrors({});
    setRecipeForm(recipe ? { name: recipe.name, servings: recipe.servings || '', instructions: recipe.instructions || '' } : { name: '', servings: '', instructions: '' });
    setShowRecipeModal(true);
  };

  const handleRecipeSubmit = async (e) => {
    e.preventDefault();
    if (!validateRecipeForm()) return;
    try {
      if (editingRecipe) {
        await api.put(`/kitchen/recipes/${editingRecipe.id}`, recipeForm);
        toast?.success('Recipe updated');
      } else {
        await api.post('/kitchen/recipes', recipeForm);
        toast?.success('Recipe created');
      }
      setShowRecipeModal(false);
      setSelectedRecipe(null);
      loadData();
    } catch (err) {
      console.error('Failed to save recipe:', err);
      toast?.error('Failed to save recipe');
    }
  };

  const handleDeleteRecipe = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Recipe',
      message: 'Are you sure you want to delete this recipe? This cannot be undone.',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          await api.delete(`/kitchen/recipes/${id}`);
          setSelectedRecipe(null);
          toast?.success('Recipe deleted');
          loadData();
        } catch (err) {
          console.error('Failed to delete recipe:', err);
          toast?.error('Failed to delete recipe');
        }
      }
    });
  };

  // --- Ingredient CRUD ---
  const validateIngredientForm = () => {
    const errors = {};
    if (!ingredientForm.name?.trim()) errors.name = 'Ingredient name is required';
    if (!ingredientForm.unit?.trim()) errors.unit = 'Unit is required';
    if (ingredientForm.costPerUnit && isNaN(parseFloat(ingredientForm.costPerUnit))) errors.costPerUnit = 'Cost must be a number';
    if (ingredientForm.currentStock && isNaN(parseFloat(ingredientForm.currentStock))) errors.currentStock = 'Stock must be a number';
    setIngredientFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openIngredientForm = (ingredient = null) => {
    setEditingIngredient(ingredient);
    setIngredientFormErrors({});
    setIngredientForm(ingredient ? {
      name: ingredient.name, category: ingredient.category || '', unit: ingredient.unit,
      costPerUnit: ingredient.costPerUnit?.toString() || '', parLevel: ingredient.parLevel?.toString() || '',
      currentStock: ingredient.currentStock?.toString() || ''
    } : { name: '', category: '', unit: '', costPerUnit: '', parLevel: '', currentStock: '' });
    setShowIngredientModal(true);
  };

  const handleIngredientSubmit = async (e) => {
    e.preventDefault();
    if (!validateIngredientForm()) return;
    try {
      const payload = { ...ingredientForm, costPerUnit: parseFloat(ingredientForm.costPerUnit) || 0, parLevel: parseFloat(ingredientForm.parLevel) || null, currentStock: parseFloat(ingredientForm.currentStock) || 0 };
      if (editingIngredient) {
        await api.put(`/kitchen/ingredients/${editingIngredient.id}`, payload);
        toast?.success('Ingredient updated');
      } else {
        await api.post('/kitchen/ingredients', payload);
        toast?.success('Ingredient created');
      }
      setShowIngredientModal(false);
      setSelectedIngredient(null);
      loadData();
    } catch (err) {
      console.error('Failed to save ingredient:', err);
      toast?.error('Failed to save ingredient');
    }
  };

  const handleDeleteIngredient = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Ingredient',
      message: 'Are you sure you want to delete this ingredient? This cannot be undone.',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          await api.delete(`/kitchen/ingredients/${id}`);
          setSelectedIngredient(null);
          toast?.success('Ingredient deleted');
          loadData();
        } catch (err) {
          console.error('Failed to delete ingredient:', err);
          toast?.error('Failed to delete ingredient');
        }
      }
    });
  };

  const handleAdjustStock = async () => {
    if (!selectedIngredient || !adjustmentAmount) return;
    try {
      const amount = parseFloat(adjustmentAmount);
      let newStock = selectedIngredient.currentStock;
      if (adjustmentType === 'IN') newStock += amount;
      else if (adjustmentType === 'OUT') newStock -= amount;
      else newStock = amount;
      await api.put(`/kitchen/ingredients/${selectedIngredient.id}`, { currentStock: Math.max(0, newStock) });
      toast?.success('Stock adjusted');
      loadData();
      setSelectedIngredient(null);
      setAdjustmentAmount('');
      setAdjustmentType('IN');
    } catch (err) {
      console.error('Failed to adjust stock:', err);
      toast?.error('Failed to adjust stock: ' + (err.response?.data?.error || err.message));
    }
  };

  const lowStockIngredients = ingredients.filter(ing => ing.parLevel && ing.currentStock < ing.parLevel);

  // --- Search bar component ---
  const SearchBar = ({ value, onChange, placeholder }) => (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
      <input type="text" placeholder={placeholder || 'Search...'} className="input pl-10" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );

  // --- Sort button ---
  const SortButton = ({ label, field, sort, onToggle }) => (
    <button onClick={() => onToggle(field)} className="flex items-center gap-1 text-sm text-gray-600 hover:text-indigo-600">
      {label}
      <ArrowUpDown size={14} className={sort.field === field ? 'text-indigo-600' : 'text-gray-400'} />
    </button>
  );

  // --- Toolbar ---
  const TabToolbar = ({ search, onSearch, sort, onSort, selected, onBulkDelete, onExport, sortFields, searchPlaceholder }) => (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <div className="flex-1 min-w-[200px]">
        <SearchBar value={search} onChange={(val) => { onSearch(val); }} placeholder={searchPlaceholder} />
      </div>
      <div className="flex items-center gap-2">
        {sortFields.map(sf => (
          <SortButton key={sf.field} label={sf.label} field={sf.field} sort={sort} onToggle={(field) => onSort(field)} />
        ))}
      </div>
      <div className="flex items-center gap-2">
        {selected.length > 0 && (
          <button onClick={onBulkDelete} className="btn btn-danger flex items-center gap-1 text-sm py-1 px-3">
            <Trash2 size={14} /> Delete ({selected.length})
          </button>
        )}
        <button onClick={onExport} className="btn btn-secondary flex items-center gap-1 text-sm py-1 px-3">
          <FileText size={14} /> PDF
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kitchen Operations</h1>
            <p className="text-gray-500">Manage prep lists, pack lists, and inventory</p>
          </div>
        </div>
        <SkeletonGrid count={6} />
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
        <div className="flex gap-2">
          {activeTab === 'recipes' && (
            <button onClick={() => openRecipeForm()} className="btn btn-primary flex items-center gap-2">
              <Plus size={20} /> New Recipe
            </button>
          )}
          {activeTab === 'inventory' && (
            <button onClick={() => openIngredientForm()} className="btn btn-primary flex items-center gap-2">
              <Plus size={20} /> New Ingredient
            </button>
          )}
          {(activeTab === 'prep' || activeTab === 'pack') && (
            <button onClick={() => openModal(activeTab === 'prep' ? 'prep' : 'pack')} className="btn btn-primary flex items-center gap-2">
              <Plus size={20} /> New {activeTab === 'prep' ? 'Prep List' : 'Pack List'}
            </button>
          )}
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockIngredients.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-800 font-medium mb-2">
            <AlertTriangle size={20} /> Low Stock Alert
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockIngredients.map(ing => (
              <span key={ing.id} className="badge badge-warning">{ing.name}: {ing.currentStock} / {ing.parLevel} {ing.unit}</span>
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
            { id: 'recipes', label: 'Recipes', count: recipes.length },
            { id: 'inventory', label: 'Ingredients', count: ingredients.length },
            { id: 'scaling', label: 'Scaling Calculator', icon: Scale }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2
                ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {tab.icon && <tab.icon size={16} />}
              {tab.label} {tab.count !== undefined && `(${tab.count})`}
            </button>
          ))}
        </nav>
      </div>

      {/* Prep Lists Tab */}
      {activeTab === 'prep' && (
        <div>
          <TabToolbar
            search={prepSearch} onSearch={(v) => { setPrepSearch(v); setPrepPage(1); }}
            sort={prepSort} onSort={(field) => toggleSort(setPrepSort, prepSort, field)}
            selected={prepSelected}
            onBulkDelete={() => handleBulkDelete('prep', prepSelected, setPrepSelected)}
            onExport={exportPrepPDF}
            sortFields={[{ field: 'date', label: 'Date' }, { field: 'status', label: 'Status' }]}
            searchPlaceholder="Search prep lists..."
          />
          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => toggleSelectAll(filteredPrep, prepSelected, setPrepSelected)} className="text-gray-500 hover:text-indigo-600">
              {filteredPrep.length > 0 && filteredPrep.every(i => prepSelected.includes(i.id)) ? <CheckSquare size={18} /> : <Square size={18} />}
            </button>
            <span className="text-sm text-gray-500">Select all</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedPrep.map((list) => (
              <div key={list.id} className={`card cursor-pointer hover:shadow-md transition-shadow ${prepSelected.includes(list.id) ? 'ring-2 ring-indigo-400' : ''}`}>
                <div className="flex items-start gap-2">
                  <button onClick={(e) => { e.stopPropagation(); toggleSelectOne(list.id, prepSelected, setPrepSelected); }} className="mt-1 text-gray-400 hover:text-indigo-600">
                    {prepSelected.includes(list.id) ? <CheckSquare size={18} className="text-indigo-600" /> : <Square size={18} />}
                  </button>
                  <div className="flex-1" onClick={() => setSelectedList({ type: 'prep', data: list })}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium text-gray-900">{list.order?.event?.name}</p>
                        <p className="text-sm text-gray-500">{format(new Date(list.date), 'MMM d, yyyy')}</p>
                      </div>
                      <select value={list.status} onChange={(e) => { e.stopPropagation(); updateListStatus('prep', list.id, e.target.value); }} onClick={(e) => e.stopPropagation()}
                        className={`badge ${list.status === 'COMPLETED' ? 'badge-success' : list.status === 'IN_PROGRESS' ? 'badge-info' : 'badge-warning'} border-0`}>
                        <option value="PENDING">Pending</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      {list.items?.slice(0, 3).map((item) => (
                        <div key={item.id} className={`flex items-center gap-3 p-2 rounded ${item.completed ? 'bg-green-50' : 'bg-gray-50'}`}>
                          <button onClick={(e) => { e.stopPropagation(); togglePrepItem(list.id, item.id, item.completed); }} className={item.completed ? 'text-green-600' : 'text-gray-400'}>
                            <CheckCircle size={20} />
                          </button>
                          <div className="flex-1">
                            <p className={item.completed ? 'line-through text-gray-500' : ''}>{item.task}</p>
                            {item.quantity && <p className="text-sm text-gray-500">{item.quantity}</p>}
                          </div>
                        </div>
                      ))}
                      {list.items?.length > 3 && <p className="text-xs text-gray-400">+{list.items.length - 3} more items</p>}
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-500">
                      {list.items?.filter(i => i.completed).length} / {list.items?.length} completed
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {filteredPrep.length === 0 && <div className="text-center py-12 text-gray-500">No prep lists found.</div>}
          <Pagination page={prepPage} totalPages={Math.ceil(filteredPrep.length / pageLimit)} total={filteredPrep.length} limit={pageLimit} onPageChange={setPrepPage} />
        </div>
      )}

      {/* Pack Lists Tab */}
      {activeTab === 'pack' && (
        <div>
          <TabToolbar
            search={packSearch} onSearch={(v) => { setPackSearch(v); setPackPage(1); }}
            sort={packSort} onSort={(field) => toggleSort(setPackSort, packSort, field)}
            selected={packSelected}
            onBulkDelete={() => handleBulkDelete('pack', packSelected, setPackSelected)}
            onExport={exportPackPDF}
            sortFields={[{ field: 'status', label: 'Status' }]}
            searchPlaceholder="Search pack lists..."
          />
          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => toggleSelectAll(filteredPack, packSelected, setPackSelected)} className="text-gray-500 hover:text-indigo-600">
              {filteredPack.length > 0 && filteredPack.every(i => packSelected.includes(i.id)) ? <CheckSquare size={18} /> : <Square size={18} />}
            </button>
            <span className="text-sm text-gray-500">Select all</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedPack.map((list) => (
              <div key={list.id} className={`card cursor-pointer hover:shadow-md transition-shadow ${packSelected.includes(list.id) ? 'ring-2 ring-indigo-400' : ''}`}>
                <div className="flex items-start gap-2">
                  <button onClick={(e) => { e.stopPropagation(); toggleSelectOne(list.id, packSelected, setPackSelected); }} className="mt-1 text-gray-400 hover:text-indigo-600">
                    {packSelected.includes(list.id) ? <CheckSquare size={18} className="text-indigo-600" /> : <Square size={18} />}
                  </button>
                  <div className="flex-1" onClick={() => setSelectedList({ type: 'pack', data: list })}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium text-gray-900">{list.order?.event?.name}</p>
                        <p className="text-sm text-gray-500">Order: {list.order?.orderNumber}</p>
                      </div>
                      <select value={list.status} onChange={(e) => { e.stopPropagation(); updateListStatus('pack', list.id, e.target.value); }} onClick={(e) => e.stopPropagation()}
                        className={`badge ${list.status === 'COMPLETED' ? 'badge-success' : list.status === 'IN_PROGRESS' ? 'badge-info' : 'badge-warning'} border-0`}>
                        <option value="PENDING">Pending</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      {list.items?.slice(0, 3).map((item) => (
                        <div key={item.id} className={`flex items-center gap-3 p-2 rounded ${item.packed ? 'bg-green-50' : 'bg-gray-50'}`}>
                          <button onClick={(e) => { e.stopPropagation(); togglePackItem(list.id, item.id, item.packed); }} className={item.packed ? 'text-green-600' : 'text-gray-400'}>
                            <Package size={20} />
                          </button>
                          <div className="flex-1">
                            <p className={item.packed ? 'line-through text-gray-500' : ''}>{item.item}</p>
                            <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                          </div>
                        </div>
                      ))}
                      {list.items?.length > 3 && <p className="text-xs text-gray-400">+{list.items.length - 3} more items</p>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {filteredPack.length === 0 && <div className="text-center py-12 text-gray-500">No pack lists found.</div>}
          <Pagination page={packPage} totalPages={Math.ceil(filteredPack.length / pageLimit)} total={filteredPack.length} limit={pageLimit} onPageChange={setPackPage} />
        </div>
      )}

      {/* Recipes Tab */}
      {activeTab === 'recipes' && (
        <div>
          <TabToolbar
            search={recipeSearch} onSearch={(v) => { setRecipeSearch(v); setRecipePage(1); }}
            sort={recipeSort} onSort={(field) => toggleSort(setRecipeSort, recipeSort, field)}
            selected={recipeSelected}
            onBulkDelete={() => handleBulkDelete('recipe', recipeSelected, setRecipeSelected)}
            onExport={exportRecipesPDF}
            sortFields={[{ field: 'name', label: 'Name' }, { field: 'servings', label: 'Servings' }]}
            searchPlaceholder="Search recipes..."
          />
          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => toggleSelectAll(filteredRecipes, recipeSelected, setRecipeSelected)} className="text-gray-500 hover:text-indigo-600">
              {filteredRecipes.length > 0 && filteredRecipes.every(i => recipeSelected.includes(i.id)) ? <CheckSquare size={18} /> : <Square size={18} />}
            </button>
            <span className="text-sm text-gray-500">Select all</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedRecipes.map((recipe) => (
              <div key={recipe.id} className={`card cursor-pointer hover:shadow-md transition-shadow ${recipeSelected.includes(recipe.id) ? 'ring-2 ring-indigo-400' : ''}`}>
                <div className="flex items-start gap-2">
                  <button onClick={(e) => { e.stopPropagation(); toggleSelectOne(recipe.id, recipeSelected, setRecipeSelected); }} className="mt-1 text-gray-400 hover:text-indigo-600">
                    {recipeSelected.includes(recipe.id) ? <CheckSquare size={18} className="text-indigo-600" /> : <Square size={18} />}
                  </button>
                  <div className="flex-1" onClick={() => setSelectedRecipe(recipe)}>
                    <div className="flex items-center gap-2 mb-2">
                      <ChefHat className="text-indigo-600" size={20} />
                      <h3 className="font-semibold text-gray-900">{recipe.name}</h3>
                    </div>
                    <div className="space-y-1 text-sm text-gray-500">
                      <p>Servings: {recipe.servings || '-'}</p>
                      {recipe.prepTime && <p>Prep: {recipe.prepTime} min</p>}
                      {recipe.cookTime && <p>Cook: {recipe.cookTime} min</p>}
                    </div>
                    {recipe.ingredients && recipe.ingredients.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-100 text-sm text-gray-500">
                        {recipe.ingredients.length} ingredient(s)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {filteredRecipes.length === 0 && <div className="text-center py-12 text-gray-500">No recipes found.</div>}
          <Pagination page={recipePage} totalPages={Math.ceil(filteredRecipes.length / pageLimit)} total={filteredRecipes.length} limit={pageLimit} onPageChange={setRecipePage} />
        </div>
      )}

      {/* Ingredients / Inventory Tab */}
      {activeTab === 'inventory' && (
        <div>
          <TabToolbar
            search={ingredientSearch} onSearch={(v) => { setIngredientSearch(v); setIngredientPage(1); }}
            sort={ingredientSort} onSort={(field) => toggleSort(setIngredientSort, ingredientSort, field)}
            selected={ingredientSelected}
            onBulkDelete={() => handleBulkDelete('ingredient', ingredientSelected, setIngredientSelected)}
            onExport={exportIngredientsPDF}
            sortFields={[{ field: 'name', label: 'Name' }, { field: 'category', label: 'Category' }, { field: 'currentStock', label: 'Stock' }]}
            searchPlaceholder="Search ingredients..."
          />
          <div className="card overflow-hidden">
            <table className="table">
              <thead>
                <tr>
                  <th>
                    <button onClick={() => toggleSelectAll(filteredIngredients, ingredientSelected, setIngredientSelected)} className="text-gray-500 hover:text-indigo-600">
                      {filteredIngredients.length > 0 && filteredIngredients.every(i => ingredientSelected.includes(i.id)) ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>
                  </th>
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
                {paginatedIngredients.map((ing) => (
                  <tr key={ing.id} className={`hover:bg-gray-50 cursor-pointer ${ingredientSelected.includes(ing.id) ? 'bg-indigo-50' : ''}`} onClick={() => setSelectedIngredient(ing)}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => toggleSelectOne(ing.id, ingredientSelected, setIngredientSelected)} className="text-gray-400 hover:text-indigo-600">
                        {ingredientSelected.includes(ing.id) ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} />}
                      </button>
                    </td>
                    <td className="font-medium">{ing.name}</td>
                    <td>{ing.category || '-'}</td>
                    <td>{ing.currentStock}</td>
                    <td>{ing.parLevel || '-'}</td>
                    <td>{ing.unit}</td>
                    <td>${(ing.costPerUnit || 0).toFixed(2)}</td>
                    <td>
                      {ing.parLevel && ing.currentStock < ing.parLevel
                        ? <span className="badge badge-danger">Low Stock</span>
                        : <span className="badge badge-success">OK</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredIngredients.length === 0 && <div className="text-center py-12 text-gray-500">No ingredients found.</div>}
          <Pagination page={ingredientPage} totalPages={Math.ceil(filteredIngredients.length / pageLimit)} total={filteredIngredients.length} limit={pageLimit} onPageChange={setIngredientPage} />
        </div>
      )}

      {/* Scaling Calculator Tab */}
      {activeTab === 'scaling' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Scale size={20} className="text-indigo-600" /> Ingredient Scaling Calculator
            </h3>
            <div className="space-y-4">
              <div className="flex gap-2">
                <button onClick={() => { setScalingType('recipe'); setScaledIngredients([]); }} className={`flex-1 py-2 px-4 rounded-lg border ${scalingType === 'recipe' ? 'bg-indigo-50 border-indigo-600 text-indigo-600' : 'border-gray-200'}`}>Scale Recipe</button>
                <button onClick={() => { setScalingType('package'); setScaledIngredients([]); }} className={`flex-1 py-2 px-4 rounded-lg border ${scalingType === 'package' ? 'bg-indigo-50 border-indigo-600 text-indigo-600' : 'border-gray-200'}`}>Scale Package</button>
                <button onClick={() => { setScalingType('shopping'); setShoppingList([]); }} className={`flex-1 py-2 px-4 rounded-lg border ${scalingType === 'shopping' ? 'bg-indigo-50 border-indigo-600 text-indigo-600' : 'border-gray-200'}`}>Shopping List</button>
              </div>

              {scalingType === 'recipe' && (
                <div>
                  <label className="label">Select Recipe ({recipes.length} available)</label>
                  <select className="select" value={selectedRecipeId} onChange={(e) => setSelectedRecipeId(e.target.value)}>
                    <option value="">Choose a recipe...</option>
                    {recipes.map(recipe => <option key={recipe.id} value={recipe.id}>{recipe.name} (serves {recipe.servings || 1})</option>)}
                  </select>
                </div>
              )}

              {scalingType === 'package' && (
                <div>
                  <label className="label">Select Menu Package ({menuPackages.length} available)</label>
                  <select className="select" value={selectedPackageId} onChange={(e) => setSelectedPackageId(e.target.value)}>
                    <option value="">Choose a package...</option>
                    {menuPackages.map(pkg => <option key={pkg.id} value={pkg.id}>{pkg.name} (${pkg.pricePerPerson}/person)</option>)}
                  </select>
                </div>
              )}

              {scalingType === 'shopping' && (
                <div>
                  <label className="label">Select Event ({events.filter(e => e.status === 'CONFIRMED').length} confirmed)</label>
                  <select className="select" value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>
                    <option value="">Choose an event...</option>
                    {events.filter(e => e.status === 'CONFIRMED').map(event => <option key={event.id} value={event.id}>{event.name} ({event.guestCount} guests)</option>)}
                  </select>
                </div>
              )}

              {(scalingType === 'recipe' || scalingType === 'package') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Guest Count</label>
                    <input type="number" className="input" value={guestCount} onChange={(e) => setGuestCount(parseInt(e.target.value) || 0)} min="1" />
                  </div>
                  <div>
                    <label className="label">Buffer % (extra)</label>
                    <input type="number" className="input" value={bufferPercent} onChange={(e) => setBufferPercent(parseInt(e.target.value) || 0)} min="0" max="50" />
                  </div>
                </div>
              )}

              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

              <div className="pt-4">
                {scalingType === 'recipe' && (
                  <button onClick={handleScaleRecipe} disabled={!selectedRecipeId || scalingLoading} className="btn btn-primary w-full flex items-center justify-center gap-2">
                    {scalingLoading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <><Scale size={18} /> Scale Recipe</>}
                  </button>
                )}
                {scalingType === 'package' && (
                  <button onClick={handleScalePackage} disabled={!selectedPackageId || scalingLoading} className="btn btn-primary w-full flex items-center justify-center gap-2">
                    {scalingLoading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <><Scale size={18} /> Scale Package</>}
                  </button>
                )}
                {scalingType === 'shopping' && (
                  <button onClick={handleGenerateShoppingList} disabled={!selectedEventId || scalingLoading} className="btn btn-primary w-full flex items-center justify-center gap-2">
                    {scalingLoading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <><ShoppingCart size={18} /> Generate Shopping List</>}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">{scalingType === 'shopping' ? 'Shopping List' : 'Scaled Ingredients'}</h3>
              {scalingType === 'shopping' && shoppingList.length > 0 && (
                <button onClick={handlePrintShoppingList} className="btn btn-secondary flex items-center gap-2"><Printer size={16} /> Print</button>
              )}
            </div>

            {(scalingType === 'recipe' || scalingType === 'package') && (
              scaledIngredients.length === 0 ? (
                <div className="text-center py-12 text-gray-500"><Scale size={48} className="mx-auto mb-4 opacity-50" /><p>Select a {scalingType} and guest count, then click Scale to see results</p></div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {scaledIngredients.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div><p className="font-medium">{item.name}</p><p className="text-sm text-gray-500">{item.category || 'Uncategorized'}</p></div>
                      <div className="text-right"><p className="font-medium">{item.scaledQuantity?.toFixed(2)} {item.unit}</p><p className="text-sm text-gray-500">Est. ${item.estimatedCost?.toFixed(2)}</p></div>
                    </div>
                  ))}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex justify-between font-semibold"><span>Total Estimated Cost:</span><span>${scaledIngredients.reduce((sum, item) => sum + (item.estimatedCost || 0), 0).toFixed(2)}</span></div>
                  </div>
                </div>
              )
            )}

            {scalingType === 'shopping' && (
              shoppingList.length === 0 ? (
                <div className="text-center py-12 text-gray-500"><ShoppingCart size={48} className="mx-auto mb-4 opacity-50" /><p>Select an event to generate a shopping list</p></div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {shoppingList.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div><p className="font-medium">{item.name}</p><p className="text-sm text-gray-500">{item.category || 'Uncategorized'}</p></div>
                      <div className="text-right"><p className="font-medium">{item.totalQuantity?.toFixed(2)} {item.unit}</p><p className="text-sm text-gray-500">Est. ${item.estimatedCost?.toFixed(2)}</p></div>
                    </div>
                  ))}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex justify-between font-semibold"><span>Total Estimated Cost:</span><span>${shoppingList.reduce((sum, item) => sum + (item.estimatedCost || 0), 0).toFixed(2)}</span></div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Create Prep/Pack Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">New {modalType === 'prep' ? 'Prep' : 'Pack'} List</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Order *</label>
                  <select className="select" value={formData.orderId} onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}>
                    <option value="">Select Order</option>
                    {orders.map(order => <option key={order.id} value={order.id}>{order.orderNumber} - {order.event?.name}</option>)}
                  </select>
                  {formErrors.orderId && <p className="text-red-500 text-xs mt-1">{formErrors.orderId}</p>}
                </div>
                {modalType === 'prep' && (
                  <div>
                    <label className="label">Date *</label>
                    <input type="date" className="input" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                    {formErrors.date && <p className="text-red-500 text-xs mt-1">{formErrors.date}</p>}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label">Items *</label>
                  <button type="button" onClick={() => setFormData({ ...formData, items: [...formData.items, { task: '', quantity: '', notes: '' }] })} className="text-indigo-600 text-sm hover:text-indigo-800">+ Add Item</button>
                </div>
                {formErrors.items && <p className="text-red-500 text-xs mb-2">{formErrors.items}</p>}
                <div className="space-y-2">
                  {formData.items.map((item, idx) => (
                    <div key={idx}>
                      <div className="flex gap-2 items-center">
                        <input type="text" className={`input flex-1 ${formErrors[`item_${idx}`] ? 'border-red-500' : ''}`} placeholder={modalType === 'prep' ? 'Task description...' : 'Item name...'} value={item.task}
                          onChange={(e) => { const items = [...formData.items]; items[idx].task = e.target.value; setFormData({ ...formData, items }); }} />
                        <input type="text" className="input" style={{ width: '80px' }} placeholder="Qty" value={item.quantity}
                          onChange={(e) => { const items = [...formData.items]; items[idx].quantity = e.target.value; setFormData({ ...formData, items }); }} />
                        <button type="button" onClick={() => setFormData({ ...formData, items: formData.items.filter((_, i) => i !== idx) })} className="text-red-500 hover:text-red-700 p-1" disabled={formData.items.length === 1}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                      {formErrors[`item_${idx}`] && <p className="text-red-500 text-xs mt-1">{formErrors[`item_${idx}`]}</p>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Prep/Pack List Detail Modal */}
      {selectedList && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">{selectedList.type === 'prep' ? 'Prep List' : 'Pack List'} Details</h2>
                <span className={`badge ${selectedList.data.status === 'COMPLETED' ? 'badge-success' : selectedList.data.status === 'IN_PROGRESS' ? 'badge-info' : 'badge-warning'}`}>{selectedList.data.status}</span>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-gray-500">Event</p><p className="font-medium">{selectedList.data.order?.event?.name}</p></div>
                <div><p className="text-sm text-gray-500">Order</p><p className="font-medium">{selectedList.data.order?.orderNumber}</p></div>
                {selectedList.type === 'prep' && <div><p className="text-sm text-gray-500">Date</p><p className="font-medium">{format(new Date(selectedList.data.date), 'MMMM d, yyyy')}</p></div>}
                <div><p className="text-sm text-gray-500">Progress</p><p className="font-medium">{selectedList.data.items?.filter(i => selectedList.type === 'prep' ? i.completed : i.packed).length} / {selectedList.data.items?.length} items</p></div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">Items</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedList.data.items?.map((item) => (
                    <div key={item.id} className={`flex items-center justify-between p-3 rounded ${(selectedList.type === 'prep' ? item.completed : item.packed) ? 'bg-green-50' : 'bg-gray-50'}`}>
                      <div>
                        <p className={(selectedList.type === 'prep' ? item.completed : item.packed) ? 'line-through text-gray-500' : 'font-medium'}>{selectedList.type === 'prep' ? item.task : item.item}</p>
                        {item.quantity && <p className="text-sm text-gray-500">Qty: {item.quantity}</p>}
                        {item.notes && <p className="text-sm text-gray-400">{item.notes}</p>}
                      </div>
                      <span className={`badge ${(selectedList.type === 'prep' ? item.completed : item.packed) ? 'badge-success' : 'badge-gray'}`}>{(selectedList.type === 'prep' ? item.completed : item.packed) ? 'Done' : 'Pending'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-between">
              <button onClick={() => handleDeleteList(selectedList.type, selectedList.data.id)} className="btn btn-danger flex items-center gap-1"><Trash2 size={16} /> Delete</button>
              <div className="flex gap-3">
                <button onClick={() => setSelectedList(null)} className="btn btn-secondary">Close</button>
                <button onClick={() => { openModal(selectedList.type); setSelectedList(null); }} className="btn btn-primary flex items-center gap-1"><Edit size={16} /> Edit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recipe Detail Modal */}
      {selectedRecipe && !showRecipeModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ChefHat className="text-indigo-600" size={24} />
                  <h2 className="text-xl font-semibold text-gray-900">{selectedRecipe.name}</h2>
                </div>
                <button onClick={() => setSelectedRecipe(null)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div><p className="text-sm text-gray-500">Servings</p><p className="font-medium">{selectedRecipe.servings || '-'}</p></div>
                <div><p className="text-sm text-gray-500">Prep Time</p><p className="font-medium">{selectedRecipe.prepTime ? `${selectedRecipe.prepTime} min` : '-'}</p></div>
                <div><p className="text-sm text-gray-500">Cook Time</p><p className="font-medium">{selectedRecipe.cookTime ? `${selectedRecipe.cookTime} min` : '-'}</p></div>
              </div>
              {selectedRecipe.instructions && (
                <div><p className="text-sm text-gray-500 mb-1">Instructions</p><p className="text-gray-700 whitespace-pre-wrap">{selectedRecipe.instructions}</p></div>
              )}
              {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Ingredients</p>
                  <div className="space-y-1">
                    {selectedRecipe.ingredients.map((ing, idx) => (
                      <div key={idx} className="flex justify-between p-2 bg-gray-50 rounded text-sm">
                        <span>{ing.ingredient?.name || ing.name || 'Unknown'}</span>
                        <span className="text-gray-500">{ing.quantity} {ing.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-between">
              <button onClick={() => handleDeleteRecipe(selectedRecipe.id)} className="btn btn-danger flex items-center gap-1"><Trash2 size={16} /> Delete</button>
              <div className="flex gap-3">
                <button onClick={() => setSelectedRecipe(null)} className="btn btn-secondary">Close</button>
                <button onClick={() => { openRecipeForm(selectedRecipe); setSelectedRecipe(null); }} className="btn btn-primary flex items-center gap-1"><Edit size={16} /> Edit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recipe Create/Edit Modal */}
      {showRecipeModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">{editingRecipe ? 'Edit Recipe' : 'New Recipe'}</h2>
            </div>
            <form onSubmit={handleRecipeSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Recipe Name *</label>
                <input type="text" className={`input ${recipeFormErrors.name ? 'border-red-500' : ''}`} value={recipeForm.name} onChange={(e) => setRecipeForm({ ...recipeForm, name: e.target.value })} />
                {recipeFormErrors.name && <p className="text-red-500 text-xs mt-1">{recipeFormErrors.name}</p>}
              </div>
              <div>
                <label className="label">Servings</label>
                <input type="number" className={`input ${recipeFormErrors.servings ? 'border-red-500' : ''}`} value={recipeForm.servings} onChange={(e) => setRecipeForm({ ...recipeForm, servings: e.target.value })} min="1" />
                {recipeFormErrors.servings && <p className="text-red-500 text-xs mt-1">{recipeFormErrors.servings}</p>}
              </div>
              <div>
                <label className="label">Instructions</label>
                <textarea className="input" rows="4" value={recipeForm.instructions} onChange={(e) => setRecipeForm({ ...recipeForm, instructions: e.target.value })} />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => setShowRecipeModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingRecipe ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ingredient Detail Modal */}
      {selectedIngredient && !showIngredientModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-lg">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">{selectedIngredient.name}</h2>
                <button onClick={() => { setSelectedIngredient(null); setAdjustmentAmount(''); setAdjustmentType('IN'); }} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-gray-500">Category</p><p className="font-medium">{selectedIngredient.category || 'Uncategorized'}</p></div>
                <div><p className="text-sm text-gray-500">Unit</p><p className="font-medium">{selectedIngredient.unit}</p></div>
                <div><p className="text-sm text-gray-500">Current Stock</p><p className={`font-medium text-lg ${selectedIngredient.parLevel && selectedIngredient.currentStock < selectedIngredient.parLevel ? 'text-red-600' : 'text-green-600'}`}>{selectedIngredient.currentStock} {selectedIngredient.unit}</p></div>
                <div><p className="text-sm text-gray-500">Par Level</p><p className="font-medium">{selectedIngredient.parLevel || 'Not set'} {selectedIngredient.parLevel ? selectedIngredient.unit : ''}</p></div>
                <div><p className="text-sm text-gray-500">Cost Per Unit</p><p className="font-medium">${selectedIngredient.costPerUnit?.toFixed(2) || '0.00'}</p></div>
                <div><p className="text-sm text-gray-500">Total Value</p><p className="font-medium">${(selectedIngredient.currentStock * (selectedIngredient.costPerUnit || 0)).toFixed(2)}</p></div>
              </div>

              <div className="p-4 rounded-lg bg-gray-50">
                <p className="text-sm font-medium text-gray-700 mb-2">Stock Status</p>
                {selectedIngredient.parLevel ? (
                  <div className="space-y-2">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className={`h-3 rounded-full ${selectedIngredient.currentStock >= selectedIngredient.parLevel ? 'bg-green-500' : selectedIngredient.currentStock >= selectedIngredient.parLevel * 0.5 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(100, (selectedIngredient.currentStock / selectedIngredient.parLevel) * 100)}%` }} />
                    </div>
                    <p className="text-sm text-gray-500">{Math.round((selectedIngredient.currentStock / selectedIngredient.parLevel) * 100)}% of par level</p>
                  </div>
                ) : (<p className="text-sm text-gray-500">Set a par level to track stock status</p>)}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">Adjust Stock</p>
                <div className="flex gap-2">
                  <button onClick={() => setAdjustmentType('IN')} className={`flex-1 py-2 px-3 rounded-lg border flex items-center justify-center gap-2 ${adjustmentType === 'IN' ? 'bg-green-50 border-green-600 text-green-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}><TrendingUp size={18} /> Stock In</button>
                  <button onClick={() => setAdjustmentType('OUT')} className={`flex-1 py-2 px-3 rounded-lg border flex items-center justify-center gap-2 ${adjustmentType === 'OUT' ? 'bg-red-50 border-red-600 text-red-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}><TrendingDown size={18} /> Stock Out</button>
                  <button onClick={() => setAdjustmentType('SET')} className={`flex-1 py-2 px-3 rounded-lg border flex items-center justify-center gap-2 ${adjustmentType === 'SET' ? 'bg-blue-50 border-blue-600 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}><Edit size={18} /> Set Value</button>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <input type="number" className="input" placeholder={adjustmentType === 'SET' ? 'New quantity...' : 'Quantity...'} value={adjustmentAmount} onChange={(e) => setAdjustmentAmount(e.target.value)} min="0" step="0.01" />
                  </div>
                  <button onClick={handleAdjustStock} disabled={!adjustmentAmount} className="btn btn-primary">
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
            <div className="p-6 border-t border-gray-200 flex justify-between">
              <button onClick={() => handleDeleteIngredient(selectedIngredient.id)} className="btn btn-danger flex items-center gap-1"><Trash2 size={16} /> Delete</button>
              <div className="flex gap-3">
                <button onClick={() => { setSelectedIngredient(null); setAdjustmentAmount(''); setAdjustmentType('IN'); }} className="btn btn-secondary">Close</button>
                <button onClick={() => { openIngredientForm(selectedIngredient); setSelectedIngredient(null); setAdjustmentAmount(''); setAdjustmentType('IN'); }} className="btn btn-primary flex items-center gap-1"><Edit size={16} /> Edit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ingredient Create/Edit Modal */}
      {showIngredientModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">{editingIngredient ? 'Edit Ingredient' : 'New Ingredient'}</h2>
            </div>
            <form onSubmit={handleIngredientSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Name *</label>
                  <input type="text" className={`input ${ingredientFormErrors.name ? 'border-red-500' : ''}`} value={ingredientForm.name} onChange={(e) => setIngredientForm({ ...ingredientForm, name: e.target.value })} />
                  {ingredientFormErrors.name && <p className="text-red-500 text-xs mt-1">{ingredientFormErrors.name}</p>}
                </div>
                <div>
                  <label className="label">Category</label>
                  <input type="text" className="input" value={ingredientForm.category} onChange={(e) => setIngredientForm({ ...ingredientForm, category: e.target.value })} />
                </div>
                <div>
                  <label className="label">Unit *</label>
                  <input type="text" className={`input ${ingredientFormErrors.unit ? 'border-red-500' : ''}`} value={ingredientForm.unit} onChange={(e) => setIngredientForm({ ...ingredientForm, unit: e.target.value })} />
                  {ingredientFormErrors.unit && <p className="text-red-500 text-xs mt-1">{ingredientFormErrors.unit}</p>}
                </div>
                <div>
                  <label className="label">Cost Per Unit</label>
                  <input type="number" step="0.01" className={`input ${ingredientFormErrors.costPerUnit ? 'border-red-500' : ''}`} value={ingredientForm.costPerUnit} onChange={(e) => setIngredientForm({ ...ingredientForm, costPerUnit: e.target.value })} />
                  {ingredientFormErrors.costPerUnit && <p className="text-red-500 text-xs mt-1">{ingredientFormErrors.costPerUnit}</p>}
                </div>
                <div>
                  <label className="label">Current Stock</label>
                  <input type="number" step="0.01" className={`input ${ingredientFormErrors.currentStock ? 'border-red-500' : ''}`} value={ingredientForm.currentStock} onChange={(e) => setIngredientForm({ ...ingredientForm, currentStock: e.target.value })} />
                  {ingredientFormErrors.currentStock && <p className="text-red-500 text-xs mt-1">{ingredientFormErrors.currentStock}</p>}
                </div>
                <div>
                  <label className="label">Par Level</label>
                  <input type="number" step="0.01" className="input" value={ingredientForm.parLevel} onChange={(e) => setIngredientForm({ ...ingredientForm, parLevel: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => setShowIngredientModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingIngredient ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel="Delete"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
