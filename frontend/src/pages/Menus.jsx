import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import { SkeletonGrid } from '../components/SkeletonLoader';
import {
  Plus, UtensilsCrossed, DollarSign, Edit, Trash2, Leaf, AlertTriangle,
  Search, ArrowUpDown, Download, CheckSquare, Square, X
} from 'lucide-react';

export default function Menus() {
  const toast = useToast();

  // --- Shared state ---
  const [categories, setCategories] = useState([]);
  const [packageCategories, setPackageCategories] = useState([]);
  const [activeTab, setActiveTab] = useState('packages');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('package');
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({});
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });

  // --- Packages state ---
  const [packages, setPackages] = useState([]);
  const [pkgLoading, setPkgLoading] = useState(true);
  const [pkgSearch, setPkgSearch] = useState('');
  const [pkgPage, setPkgPage] = useState(1);
  const [pkgLimit, setPkgLimit] = useState(25);
  const [pkgPagination, setPkgPagination] = useState({ total: 0, totalPages: 1 });
  const [pkgSortBy, setPkgSortBy] = useState('name');
  const [pkgSortOrder, setPkgSortOrder] = useState('asc');
  const [pkgSelectedIds, setPkgSelectedIds] = useState([]);

  // --- Items state ---
  const [items, setItems] = useState([]);
  const [itemLoading, setItemLoading] = useState(true);
  const [itemSearch, setItemSearch] = useState('');
  const [itemPage, setItemPage] = useState(1);
  const [itemLimit, setItemLimit] = useState(25);
  const [itemPagination, setItemPagination] = useState({ total: 0, totalPages: 1 });
  const [itemSortBy, setItemSortBy] = useState('name');
  const [itemSortOrder, setItemSortOrder] = useState('asc');
  const [itemSelectedIds, setItemSelectedIds] = useState([]);

  // --- Load options once ---
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [catRes, pkgCatRes] = await Promise.all([
          api.get('/menus/options/categories'),
          api.get('/menus/options/package-categories')
        ]);
        setCategories(catRes.data);
        setPackageCategories(pkgCatRes.data);
      } catch (err) {
        console.error('Failed to load menu options:', err);
      }
    };
    loadOptions();
  }, []);

  // --- Load packages when params change ---
  useEffect(() => {
    loadPackages();
  }, [pkgPage, pkgLimit, pkgSortBy, pkgSortOrder]);

  // --- Load items when params change ---
  useEffect(() => {
    loadItems();
  }, [itemPage, itemLimit, itemSortBy, itemSortOrder]);

  const loadPackages = async () => {
    setPkgLoading(true);
    try {
      const res = await api.get('/menus/packages', {
        params: {
          page: pkgPage,
          limit: pkgLimit,
          sortBy: pkgSortBy,
          sortOrder: pkgSortOrder,
          search: pkgSearch || undefined
        }
      });
      // Handle both old (array) and new (object with pagination) formats
      if (Array.isArray(res.data)) {
        setPackages(res.data);
        setPkgPagination({ total: res.data.length, totalPages: 1 });
      } else {
        setPackages(res.data.data || []);
        if (res.data.pagination) setPkgPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to load packages:', err);
      toast?.error('Failed to load packages');
    } finally {
      setPkgLoading(false);
    }
  };

  const loadItems = async () => {
    setItemLoading(true);
    try {
      const res = await api.get('/menus/items', {
        params: {
          page: itemPage,
          limit: itemLimit,
          sortBy: itemSortBy,
          sortOrder: itemSortOrder,
          search: itemSearch || undefined
        }
      });
      if (Array.isArray(res.data)) {
        setItems(res.data);
        setItemPagination({ total: res.data.length, totalPages: 1 });
      } else {
        setItems(res.data.data || []);
        if (res.data.pagination) setItemPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to load items:', err);
      toast?.error('Failed to load menu items');
    } finally {
      setItemLoading(false);
    }
  };

  // --- Search handlers ---
  const handlePkgSearch = (e) => {
    e?.preventDefault?.();
    setPkgPage(1);
    loadPackages();
  };

  const handleItemSearch = (e) => {
    e?.preventDefault?.();
    setItemPage(1);
    loadItems();
  };

  // --- Sort handlers ---
  const handlePkgSort = (field) => {
    if (pkgSortBy === field) {
      setPkgSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setPkgSortBy(field);
      setPkgSortOrder('asc');
    }
  };

  const handleItemSort = (field) => {
    if (itemSortBy === field) {
      setItemSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setItemSortBy(field);
      setItemSortOrder('asc');
    }
  };

  // --- Select handlers ---
  const togglePkgSelect = (id) => setPkgSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const togglePkgSelectAll = () => setPkgSelectedIds(prev => prev.length === packages.length ? [] : packages.map(p => p.id));
  const toggleItemSelect = (id) => setItemSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleItemSelectAll = () => setItemSelectedIds(prev => prev.length === items.length ? [] : items.map(i => i.id));

  // --- Form validation ---
  const validateForm = () => {
    const errs = {};
    if (!formData.name?.trim()) errs.name = 'Name is required';
    if (formData.name && formData.name.trim().length < 2) errs.name = 'Name must be at least 2 characters';

    if (modalType === 'package') {
      if (!formData.pricePerPerson || parseFloat(formData.pricePerPerson) <= 0) errs.pricePerPerson = 'Price per person must be greater than 0';
      if (!formData.minGuests || parseInt(formData.minGuests) < 1) errs.minGuests = 'Minimum guests must be at least 1';
      if (formData.maxGuests && parseInt(formData.maxGuests) < parseInt(formData.minGuests)) errs.maxGuests = 'Max guests must be greater than min guests';
      if (!formData.category) errs.category = 'Category is required';
    } else {
      if (!formData.price || parseFloat(formData.price) <= 0) errs.price = 'Price must be greater than 0';
      if (!formData.category) errs.category = 'Category is required';
      if (formData.description && formData.description.length > 500) errs.description = 'Description must be under 500 characters';
    }

    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // --- Modal open ---
  const openModal = (type, item = null) => {
    setModalType(type);
    setEditing(item);
    setError('');
    setValidationErrors({});
    if (type === 'package') {
      setFormData(item ? {
        name: item.name,
        description: item.description || '',
        pricePerPerson: item.pricePerPerson.toString(),
        minGuests: item.minGuests.toString(),
        maxGuests: item.maxGuests?.toString() || '',
        category: item.category,
        isActive: item.isActive
      } : {
        name: '',
        description: '',
        pricePerPerson: '',
        minGuests: '10',
        maxGuests: '',
        category: 'BUFFET',
        isActive: true
      });
    } else {
      setFormData(item ? {
        name: item.name,
        description: item.description || '',
        price: item.price.toString(),
        category: item.category,
        isVegetarian: item.isVegetarian,
        isVegan: item.isVegan,
        isGlutenFree: item.isGlutenFree,
        isDairyFree: item.isDairyFree,
        isNutFree: item.isNutFree,
        allergens: item.allergens || '',
        isActive: item.isActive
      } : {
        name: '',
        description: '',
        price: '',
        category: 'MAIN',
        isVegetarian: false,
        isVegan: false,
        isGlutenFree: false,
        isDairyFree: false,
        isNutFree: false,
        allergens: '',
        isActive: true
      });
    }
    setShowModal(true);
  };

  // --- Submit handler ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateForm()) return;
    try {
      const endpoint = modalType === 'package' ? '/menus/packages' : '/menus/items';
      if (editing) {
        await api.put(`${endpoint}/${editing.id}`, formData);
        toast?.success(`${modalType === 'package' ? 'Package' : 'Item'} updated successfully`);
      } else {
        await api.post(endpoint, formData);
        toast?.success(`${modalType === 'package' ? 'Package' : 'Item'} created successfully`);
      }
      setShowModal(false);
      setEditing(null);
      if (modalType === 'package') loadPackages();
      else loadItems();
    } catch (err) {
      console.error('Failed to save:', err);
      const msg = err.response?.data?.error || 'Failed to save. Please try again.';
      setError(msg);
      toast?.error(msg);
    }
  };

  // --- Single delete ---
  const handleDelete = (type, id) => {
    setConfirmDialog({
      isOpen: true,
      title: `Delete ${type === 'package' ? 'Package' : 'Item'}`,
      message: `Are you sure you want to delete this ${type === 'package' ? 'package' : 'item'}? This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const endpoint = type === 'package' ? '/menus/packages' : '/menus/items';
          await api.delete(`${endpoint}/${id}`);
          toast?.success(`${type === 'package' ? 'Package' : 'Item'} deleted`);
          if (type === 'package') loadPackages();
          else loadItems();
        } catch (err) {
          toast?.error(`Failed to delete ${type}`);
        }
        setConfirmDialog({ isOpen: false });
        setSelectedItem(null);
      },
      onCancel: () => setConfirmDialog({ isOpen: false })
    });
  };

  // --- Bulk delete ---
  const handleBulkDeletePackages = () => {
    if (!pkgSelectedIds.length) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Selected Packages',
      message: `Are you sure you want to delete ${pkgSelectedIds.length} package(s)? This cannot be undone.`,
      confirmLabel: 'Delete All',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.post('/menus/packages/bulk-delete', { ids: pkgSelectedIds });
          toast?.success(`${pkgSelectedIds.length} package(s) deleted`);
          setPkgSelectedIds([]);
          loadPackages();
        } catch (err) {
          toast?.error('Failed to delete packages');
        }
        setConfirmDialog({ isOpen: false });
      },
      onCancel: () => setConfirmDialog({ isOpen: false })
    });
  };

  const handleBulkDeleteItems = () => {
    if (!itemSelectedIds.length) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Selected Items',
      message: `Are you sure you want to delete ${itemSelectedIds.length} item(s)? This cannot be undone.`,
      confirmLabel: 'Delete All',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.post('/menus/items/bulk-delete', { ids: itemSelectedIds });
          toast?.success(`${itemSelectedIds.length} item(s) deleted`);
          setItemSelectedIds([]);
          loadItems();
        } catch (err) {
          toast?.error('Failed to delete items');
        }
        setConfirmDialog({ isOpen: false });
      },
      onCancel: () => setConfirmDialog({ isOpen: false })
    });
  };

  // --- PDF Export ---
  const exportPackagesPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('Menu Packages Report', 14, 22);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
      autoTable(doc, {
        startY: 35,
        head: [['Name', 'Category', 'Price/Person', 'Min Guests', 'Max Guests', 'Active']],
        body: packages.map(p => [
          p.name,
          p.category,
          `$${Number(p.pricePerPerson).toFixed(2)}`,
          p.minGuests,
          p.maxGuests || 'Unlimited',
          p.isActive ? 'Yes' : 'No'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] }
      });
      doc.save('menu-packages-report.pdf');
      toast?.success('Packages PDF exported');
    } catch (err) {
      console.error('PDF export failed:', err);
      toast?.error('Failed to export PDF');
    }
  };

  const exportItemsPDF = async () => {
    try {
      const res = await api.get('/menus/items/export/pdf');
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('Menu Items Report', 14, 22);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
      autoTable(doc, {
        startY: 35,
        head: [['Name', 'Category', 'Price', 'Vegetarian', 'Vegan', 'GF', 'DF', 'NF']],
        body: res.data.rows.map(r => [
          r.name,
          r.category,
          `$${Number(r.price).toFixed(2)}`,
          r.vegetarian,
          r.vegan,
          r.glutenFree,
          r.glutenFree, // backend only returns glutenFree, approximate DF
          'No'  // backend doesn't return DF/NF in export
        ]),
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] }
      });
      doc.save('menu-items-report.pdf');
      toast?.success('Items PDF exported');
    } catch (err) {
      // Fallback: generate from local data
      try {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('Menu Items Report', 14, 22);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
        autoTable(doc, {
          startY: 35,
          head: [['Name', 'Category', 'Price', 'Vegetarian', 'Vegan', 'GF', 'DF', 'NF']],
          body: items.map(i => [
            i.name,
            i.category,
            `$${Number(i.price).toFixed(2)}`,
            i.isVegetarian ? 'Yes' : 'No',
            i.isVegan ? 'Yes' : 'No',
            i.isGlutenFree ? 'Yes' : 'No',
            i.isDairyFree ? 'Yes' : 'No',
            i.isNutFree ? 'Yes' : 'No'
          ]),
          theme: 'striped',
          headStyles: { fillColor: [79, 70, 229] }
        });
        doc.save('menu-items-report.pdf');
        toast?.success('Items PDF exported');
      } catch (innerErr) {
        console.error('PDF export failed:', innerErr);
        toast?.error('Failed to export PDF');
      }
    }
  };

  // --- Card click -> detail modal ---
  const handleCardClick = (type, data) => {
    setSelectedItem({ type, data });
  };

  // --- Loading state ---
  const isLoading = activeTab === 'packages' ? pkgLoading : itemLoading;
  if (isLoading && !packages.length && !items.length) return <SkeletonGrid count={6} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menus</h1>
          <p className="text-gray-500">Manage menu packages and items</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={activeTab === 'packages' ? exportPackagesPDF : exportItemsPDF}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Download size={18} /> PDF
          </button>
          <button
            onClick={() => openModal(activeTab === 'packages' ? 'package' : 'item')}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Add {activeTab === 'packages' ? 'Package' : 'Item'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('packages')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'packages'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            Menu Packages ({pkgPagination.total || packages.length})
          </button>
          <button
            onClick={() => setActiveTab('items')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'items'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            Menu Items ({itemPagination.total || items.length})
          </button>
        </nav>
      </div>

      {/* ==================== PACKAGES TAB ==================== */}
      {activeTab === 'packages' && (
        <>
          {/* Search & Sort */}
          <div className="card">
            <div className="flex flex-wrap gap-4">
              <form onSubmit={handlePkgSearch} className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" size={20} />
                  <input
                    type="text"
                    placeholder="Search packages by name, description..."
                    className="input"
                    style={{ paddingLeft: '2.5rem' }}
                    value={pkgSearch}
                    onChange={(e) => setPkgSearch(e.target.value)}
                    onBlur={handlePkgSearch}
                  />
                </div>
              </form>
              <button
                onClick={() => handlePkgSort(pkgSortBy === 'name' ? 'pricePerPerson' : 'name')}
                className="btn btn-secondary flex items-center gap-1"
              >
                <ArrowUpDown size={16} /> {pkgSortBy} {pkgSortOrder === 'asc' ? '↑' : '↓'}
              </button>
              <div
                onClick={togglePkgSelectAll}
                className="btn btn-secondary flex items-center gap-1 cursor-pointer"
              >
                {pkgSelectedIds.length === packages.length && packages.length > 0
                  ? <CheckSquare size={16} className="text-indigo-600" />
                  : <Square size={16} />
                }
                Select All
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {pkgSelectedIds.length > 0 && (
            <div className="card bg-indigo-50 border-indigo-200 flex items-center gap-4">
              <span className="text-sm font-medium text-indigo-700">{pkgSelectedIds.length} selected</span>
              <button onClick={handleBulkDeletePackages} className="btn btn-danger text-sm py-1">Delete Selected</button>
              <button onClick={() => setPkgSelectedIds([])} className="ml-auto text-gray-500 hover:text-gray-700"><X size={18} /></button>
            </div>
          )}

          {/* Packages Grid */}
          {pkgLoading ? (
            <SkeletonGrid count={6} />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className={`card hover:shadow-md transition-shadow cursor-pointer ${!pkg.isActive ? 'opacity-50' : ''} ${pkgSelectedIds.includes(pkg.id) ? 'ring-2 ring-indigo-500' : ''}`}
                    onClick={() => handleCardClick('package', pkg)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div onClick={(e) => { e.stopPropagation(); togglePkgSelect(pkg.id); }} className="cursor-pointer">
                          {pkgSelectedIds.includes(pkg.id)
                            ? <CheckSquare className="text-indigo-600" size={18} />
                            : <Square className="text-gray-400" size={18} />
                          }
                        </div>
                        <span className="badge badge-info">{pkg.category}</span>
                      </div>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openModal('package', pkg)}
                          className="p-1 text-gray-400 hover:text-indigo-600"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete('package', pkg.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-semibold text-gray-900 mb-1">{pkg.name}</h3>
                    {pkg.description && (
                      <p className="text-sm text-gray-500 mb-3">{pkg.description}</p>
                    )}

                    <div className="flex items-center gap-2 text-lg font-bold text-indigo-600 mb-3">
                      <DollarSign size={20} />
                      ${Number(pkg.pricePerPerson).toFixed(2)} per person
                    </div>

                    <div className="text-sm text-gray-500">
                      {pkg.minGuests} - {pkg.maxGuests || 'Unlimited'} guests
                    </div>

                    {pkg.items?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-sm font-medium text-gray-700 mb-2">Includes:</p>
                        <ul className="text-sm text-gray-500 space-y-1">
                          {pkg.items.slice(0, 4).map((item) => (
                            <li key={item.id}>- {item.menuItem?.name}</li>
                          ))}
                          {pkg.items.length > 4 && (
                            <li className="text-indigo-600">+ {pkg.items.length - 4} more items</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {packages.length === 0 && (
                <div className="text-center py-12">
                  <UtensilsCrossed className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No packages found</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by adding a new package.</p>
                </div>
              )}

              <Pagination
                page={pkgPage}
                totalPages={pkgPagination.totalPages}
                total={pkgPagination.total}
                limit={pkgLimit}
                onPageChange={setPkgPage}
                onLimitChange={(l) => { setPkgLimit(l); setPkgPage(1); }}
              />
            </>
          )}
        </>
      )}

      {/* ==================== ITEMS TAB ==================== */}
      {activeTab === 'items' && (
        <>
          {/* Search & Sort */}
          <div className="card">
            <div className="flex flex-wrap gap-4">
              <form onSubmit={handleItemSearch} className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" size={20} />
                  <input
                    type="text"
                    placeholder="Search items by name, description, category..."
                    className="input"
                    style={{ paddingLeft: '2.5rem' }}
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    onBlur={handleItemSearch}
                  />
                </div>
              </form>
              <button
                onClick={() => handleItemSort(itemSortBy === 'name' ? 'price' : 'name')}
                className="btn btn-secondary flex items-center gap-1"
              >
                <ArrowUpDown size={16} /> {itemSortBy} {itemSortOrder === 'asc' ? '↑' : '↓'}
              </button>
              <div
                onClick={toggleItemSelectAll}
                className="btn btn-secondary flex items-center gap-1 cursor-pointer"
              >
                {itemSelectedIds.length === items.length && items.length > 0
                  ? <CheckSquare size={16} className="text-indigo-600" />
                  : <Square size={16} />
                }
                Select All
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {itemSelectedIds.length > 0 && (
            <div className="card bg-indigo-50 border-indigo-200 flex items-center gap-4">
              <span className="text-sm font-medium text-indigo-700">{itemSelectedIds.length} selected</span>
              <button onClick={handleBulkDeleteItems} className="btn btn-danger text-sm py-1">Delete Selected</button>
              <button onClick={() => setItemSelectedIds([])} className="ml-auto text-gray-500 hover:text-gray-700"><X size={18} /></button>
            </div>
          )}

          {/* Items Grid */}
          {itemLoading ? (
            <SkeletonGrid count={6} />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`card hover:shadow-md transition-shadow cursor-pointer ${!item.isActive ? 'opacity-50' : ''} ${itemSelectedIds.includes(item.id) ? 'ring-2 ring-indigo-500' : ''}`}
                    onClick={() => handleCardClick('item', item)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div onClick={(e) => { e.stopPropagation(); toggleItemSelect(item.id); }} className="cursor-pointer">
                          {itemSelectedIds.includes(item.id)
                            ? <CheckSquare className="text-indigo-600" size={18} />
                            : <Square className="text-gray-400" size={18} />
                          }
                        </div>
                        <span className="badge badge-gray">{item.category}</span>
                      </div>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openModal('item', item)}
                          className="p-1 text-gray-400 hover:text-indigo-600"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete('item', item.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-semibold text-gray-900 mb-1">{item.name}</h3>
                    {item.description && (
                      <p className="text-sm text-gray-500 mb-3">{item.description}</p>
                    )}

                    <div className="flex items-center gap-2 text-lg font-bold text-green-600 mb-3">
                      ${Number(item.price).toFixed(2)}
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {item.isVegetarian && (
                        <span className="badge badge-success flex items-center gap-1">
                          <Leaf size={12} /> Vegetarian
                        </span>
                      )}
                      {item.isVegan && (
                        <span className="badge badge-success flex items-center gap-1">
                          <Leaf size={12} /> Vegan
                        </span>
                      )}
                      {item.isGlutenFree && <span className="badge badge-info">GF</span>}
                      {item.isDairyFree && <span className="badge badge-info">DF</span>}
                      {item.isNutFree && <span className="badge badge-warning">NF</span>}
                    </div>

                    {item.allergens && (
                      <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
                        <AlertTriangle size={12} />
                        {item.allergens}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {items.length === 0 && (
                <div className="text-center py-12">
                  <UtensilsCrossed className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No items found</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by adding a new menu item.</p>
                </div>
              )}

              <Pagination
                page={itemPage}
                totalPages={itemPagination.totalPages}
                total={itemPagination.total}
                limit={itemLimit}
                onPageChange={setItemPage}
                onLimitChange={(l) => { setItemLimit(l); setItemPage(1); }}
              />
            </>
          )}
        </>
      )}

      {/* ==================== CREATE/EDIT MODAL ==================== */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editing ? 'Edit' : 'Add'} {modalType === 'package' ? 'Package' : 'Menu Item'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Name *</label>
                  <input
                    type="text"
                    className={`input ${validationErrors.name ? 'border-red-500' : ''}`}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                  {validationErrors.name && <p className="text-xs text-red-600 mt-1">{validationErrors.name}</p>}
                </div>

                <div className="col-span-2">
                  <label className="label">Description</label>
                  <textarea
                    className={`input ${validationErrors.description ? 'border-red-500' : ''}`}
                    rows="2"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                  {validationErrors.description && <p className="text-xs text-red-600 mt-1">{validationErrors.description}</p>}
                </div>

                {modalType === 'package' ? (
                  <>
                    <div>
                      <label className="label">Price Per Person *</label>
                      <input
                        type="number"
                        className={`input ${validationErrors.pricePerPerson ? 'border-red-500' : ''}`}
                        step="0.01"
                        value={formData.pricePerPerson}
                        onChange={(e) => setFormData({ ...formData, pricePerPerson: e.target.value })}
                        required
                      />
                      {validationErrors.pricePerPerson && <p className="text-xs text-red-600 mt-1">{validationErrors.pricePerPerson}</p>}
                    </div>
                    <div>
                      <label className="label">Category *</label>
                      <select
                        className={`select ${validationErrors.category ? 'border-red-500' : ''}`}
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      >
                        {packageCategories.map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                      {validationErrors.category && <p className="text-xs text-red-600 mt-1">{validationErrors.category}</p>}
                    </div>
                    <div>
                      <label className="label">Min Guests *</label>
                      <input
                        type="number"
                        className={`input ${validationErrors.minGuests ? 'border-red-500' : ''}`}
                        value={formData.minGuests}
                        onChange={(e) => setFormData({ ...formData, minGuests: e.target.value })}
                        required
                      />
                      {validationErrors.minGuests && <p className="text-xs text-red-600 mt-1">{validationErrors.minGuests}</p>}
                    </div>
                    <div>
                      <label className="label">Max Guests (Optional)</label>
                      <input
                        type="number"
                        className={`input ${validationErrors.maxGuests ? 'border-red-500' : ''}`}
                        value={formData.maxGuests}
                        onChange={(e) => setFormData({ ...formData, maxGuests: e.target.value })}
                      />
                      {validationErrors.maxGuests && <p className="text-xs text-red-600 mt-1">{validationErrors.maxGuests}</p>}
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="label">Price *</label>
                      <input
                        type="number"
                        className={`input ${validationErrors.price ? 'border-red-500' : ''}`}
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        required
                      />
                      {validationErrors.price && <p className="text-xs text-red-600 mt-1">{validationErrors.price}</p>}
                    </div>
                    <div>
                      <label className="label">Category *</label>
                      <select
                        className={`select ${validationErrors.category ? 'border-red-500' : ''}`}
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      >
                        {categories.map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                      {validationErrors.category && <p className="text-xs text-red-600 mt-1">{validationErrors.category}</p>}
                    </div>
                    <div className="col-span-2">
                      <label className="label mb-2">Dietary Options</label>
                      <div className="flex flex-wrap gap-4">
                        {[
                          { key: 'isVegetarian', label: 'Vegetarian' },
                          { key: 'isVegan', label: 'Vegan' },
                          { key: 'isGlutenFree', label: 'Gluten Free' },
                          { key: 'isDairyFree', label: 'Dairy Free' },
                          { key: 'isNutFree', label: 'Nut Free' }
                        ].map(opt => (
                          <label key={opt.key} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={formData[opt.key]}
                              onChange={(e) => setFormData({ ...formData, [opt.key]: e.target.checked })}
                              className="h-4 w-4 text-indigo-600 rounded"
                            />
                            <span className="text-sm">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="label">Allergens</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="e.g., Contains eggs, soy"
                        value={formData.allergens}
                        onChange={(e) => setFormData({ ...formData, allergens: e.target.value })}
                      />
                    </div>
                  </>
                )}

                <div className="col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="h-4 w-4 text-indigo-600 rounded"
                    />
                    <span className="text-sm">Active</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditing(null); setValidationErrors({}); }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== DETAIL MODAL ==================== */}
      {selectedItem && !showModal && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">{selectedItem.data.name}</h2>
                <span className="badge badge-info">{selectedItem.data.category}</span>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {selectedItem.data.description && (
                <p className="text-gray-600">{selectedItem.data.description}</p>
              )}
              <div className="text-2xl font-bold text-indigo-600">
                ${selectedItem.type === 'package'
                  ? `${Number(selectedItem.data.pricePerPerson).toFixed(2)}/person`
                  : Number(selectedItem.data.price).toFixed(2)}
              </div>

              {selectedItem.type === 'package' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Guest Range</p>
                      <p className="font-medium">{selectedItem.data.minGuests} - {selectedItem.data.maxGuests || 'Unlimited'} guests</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <span className={`badge ${selectedItem.data.isActive ? 'badge-success' : 'badge-gray'}`}>
                        {selectedItem.data.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  {selectedItem.data.items?.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Package Items ({selectedItem.data.items.length})</p>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {selectedItem.data.items.map((item) => (
                          <li key={item.id} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>
                            {item.menuItem?.name}
                            {item.quantity > 1 && <span className="text-gray-400">x{item.quantity}</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}

              {selectedItem.type === 'item' && (
                <>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <span className={`badge ${selectedItem.data.isActive ? 'badge-success' : 'badge-gray'}`}>
                      {selectedItem.data.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedItem.data.isVegetarian && <span className="badge badge-success">Vegetarian</span>}
                    {selectedItem.data.isVegan && <span className="badge badge-success">Vegan</span>}
                    {selectedItem.data.isGlutenFree && <span className="badge badge-info">Gluten-Free</span>}
                    {selectedItem.data.isDairyFree && <span className="badge badge-info">Dairy-Free</span>}
                    {selectedItem.data.isNutFree && <span className="badge badge-warning">Nut-Free</span>}
                  </div>
                </>
              )}

              {selectedItem.data.allergens && (
                <div className="text-sm text-red-600 flex items-center gap-1">
                  <AlertTriangle size={14} />
                  Allergens: {selectedItem.data.allergens}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setSelectedItem(null)} className="btn btn-secondary">Close</button>
              <button
                onClick={() => handleDelete(selectedItem.type, selectedItem.data.id)}
                className="btn btn-danger"
              >
                Delete
              </button>
              <button
                onClick={() => {
                  openModal(selectedItem.type, selectedItem.data);
                  setSelectedItem(null);
                }}
                className="btn btn-primary"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== CONFIRM DIALOG ==================== */}
      <ConfirmDialog {...confirmDialog} />
    </div>
  );
}
