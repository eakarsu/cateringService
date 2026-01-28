import { useState, useEffect } from 'react';
import api from '../utils/api';
import { format } from 'date-fns';
import { Plus, Building2, Search, Phone, Mail, MapPin, Edit, Trash2, FileText, AlertTriangle, X, Package } from 'lucide-react';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [lowStockIngredients, setLowStockIngredients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('suppliers');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('supplier');
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [error, setError] = useState('');
  const [selectedPO, setSelectedPO] = useState(null);

  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    category: '',
    notes: ''
  });

  const [poForm, setPoForm] = useState({
    supplierId: '',
    expectedDate: '',
    notes: '',
    items: [{ description: '', quantity: '', unit: '', unitPrice: '' }]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [suppliersRes, ordersRes, ingredientsRes, categoriesRes] = await Promise.all([
        api.get('/suppliers'),
        api.get('/suppliers/purchase-orders/all'),
        api.get('/kitchen/ingredients', { params: { lowStock: 'true' } }),
        api.get('/suppliers/options/categories')
      ]);
      setSuppliers(suppliersRes.data);
      setPurchaseOrders(ordersRes.data);
      setLowStockIngredients(ingredientsRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitSupplier = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingItem) {
        await api.put(`/suppliers/${editingItem.id}`, supplierForm);
      } else {
        await api.post('/suppliers', supplierForm);
      }
      setShowModal(false);
      setEditingItem(null);
      resetSupplierForm();
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save supplier');
    }
  };

  const handleSubmitPO = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/suppliers/purchase-orders', poForm);
      setShowModal(false);
      resetPOForm();
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create purchase order');
    }
  };

  const handleEditSupplier = (supplier) => {
    setEditingItem(supplier);
    setSupplierForm({
      name: supplier.name,
      contactName: supplier.contactName || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      category: supplier.category,
      notes: supplier.notes || ''
    });
    setModalType('supplier');
    setShowModal(true);
  };

  const handleDeleteSupplier = async (id) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return;
    try {
      await api.delete(`/suppliers/${id}`);
      loadData();
    } catch (error) {
      console.error('Failed to delete supplier:', error);
    }
  };

  const handleUpdatePOStatus = async (id, status) => {
    try {
      await api.put(`/suppliers/purchase-orders/${id}`, { status });
      loadData();
    } catch (error) {
      console.error('Failed to update PO status:', error);
    }
  };

  const handleGeneratePOFromLowStock = async () => {
    if (suppliers.length === 0) {
      alert('Please add a supplier first');
      return;
    }

    const supplierId = suppliers[0].id; // Default to first supplier
    try {
      await api.post('/suppliers/purchase-orders/from-low-stock', {
        supplierId,
        ingredientIds: lowStockIngredients.map(i => i.id)
      });
      loadData();
      setActiveTab('orders');
    } catch (error) {
      console.error('Failed to generate PO:', error);
    }
  };

  const resetSupplierForm = () => {
    setSupplierForm({
      name: '',
      contactName: '',
      email: '',
      phone: '',
      address: '',
      category: '',
      notes: ''
    });
  };

  const resetPOForm = () => {
    setPoForm({
      supplierId: '',
      expectedDate: '',
      notes: '',
      items: [{ description: '', quantity: '', unit: '', unitPrice: '' }]
    });
  };

  const filteredSuppliers = suppliers.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.contactName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || s.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getStatusBadge = (status) => {
    const badges = {
      DRAFT: 'badge-gray',
      SUBMITTED: 'badge-info',
      CONFIRMED: 'badge-warning',
      SHIPPED: 'badge-info',
      RECEIVED: 'badge-success',
      CANCELLED: 'badge-danger'
    };
    return badges[status] || 'badge-gray';
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
          <h1 className="text-2xl font-bold text-gray-900">Suppliers & Purchasing</h1>
          <p className="text-gray-500">Manage vendors and purchase orders</p>
        </div>
        <div className="flex gap-3">
          {activeTab === 'suppliers' ? (
            <button
              onClick={() => { resetSupplierForm(); setEditingItem(null); setModalType('supplier'); setError(''); setShowModal(true); }}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus size={20} />
              Add Supplier
            </button>
          ) : (
            <button
              onClick={() => { resetPOForm(); setModalType('po'); setError(''); setShowModal(true); }}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus size={20} />
              New Purchase Order
            </button>
          )}
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockIngredients.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-yellow-800 font-medium">
              <AlertTriangle size={20} />
              {lowStockIngredients.length} items below par level
            </div>
            <button
              onClick={handleGeneratePOFromLowStock}
              className="btn btn-sm bg-yellow-600 text-white hover:bg-yellow-700"
            >
              Generate PO
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {lowStockIngredients.slice(0, 5).map(ing => (
              <span key={ing.id} className="badge badge-warning">
                {ing.name}: {ing.currentStock}/{ing.parLevel} {ing.unit}
              </span>
            ))}
            {lowStockIngredients.length > 5 && (
              <span className="badge badge-gray">+{lowStockIngredients.length - 5} more</span>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {[
            { id: 'suppliers', label: 'Suppliers', count: suppliers.length },
            { id: 'orders', label: 'Purchase Orders', count: purchaseOrders.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Suppliers Tab */}
      {activeTab === 'suppliers' && (
        <>
          <div className="card">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" size={20} />
                  <input
                    type="text"
                    placeholder="Search suppliers..."
                    className="input"
                    style={{ paddingLeft: '2.5rem' }}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <select
                className="select w-48"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSuppliers.map(supplier => (
              <div key={supplier.id} className="card hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleEditSupplier(supplier)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <Building2 className="text-indigo-600" size={20} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{supplier.name}</h3>
                      <span className="badge badge-gray text-xs">{supplier.category}</span>
                    </div>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleEditSupplier(supplier)}
                      className="p-1 text-gray-400 hover:text-indigo-600"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteSupplier(supplier.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-500">
                  {supplier.contactName && (
                    <p className="font-medium text-gray-700">{supplier.contactName}</p>
                  )}
                  {supplier.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={14} />
                      {supplier.phone}
                    </div>
                  )}
                  {supplier.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={14} />
                      {supplier.email}
                    </div>
                  )}
                  {supplier.address && (
                    <div className="flex items-center gap-2">
                      <MapPin size={14} />
                      <span className="truncate">{supplier.address}</span>
                    </div>
                  )}
                </div>

                {supplier.purchaseOrders?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-500">
                    {supplier.purchaseOrders.length} purchase order(s)
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredSuppliers.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No suppliers found</h3>
              <p className="mt-1 text-sm text-gray-500">Add your first supplier to get started.</p>
            </div>
          )}
        </>
      )}

      {/* Purchase Orders Tab */}
      {activeTab === 'orders' && (
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Supplier</th>
                <th>Date</th>
                <th>Expected</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {purchaseOrders.map(po => (
                <tr
                  key={po.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedPO(po)}
                >
                  <td className="font-medium">{po.orderNumber}</td>
                  <td>{po.supplier?.name}</td>
                  <td>{format(new Date(po.orderDate), 'MMM d, yyyy')}</td>
                  <td>{po.expectedDate ? format(new Date(po.expectedDate), 'MMM d, yyyy') : '-'}</td>
                  <td>{po.items?.length || 0}</td>
                  <td>${po.totalAmount.toFixed(2)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <select
                      value={po.status}
                      onChange={(e) => handleUpdatePOStatus(po.id, e.target.value)}
                      className={`badge ${getStatusBadge(po.status)} border-0 cursor-pointer`}
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="SUBMITTED">Submitted</option>
                      <option value="CONFIRMED">Confirmed</option>
                      <option value="SHIPPED">Shipped</option>
                      <option value="RECEIVED">Received</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button
                      className="text-gray-400 hover:text-indigo-600"
                      onClick={() => setSelectedPO(po)}
                    >
                      <FileText size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {purchaseOrders.length === 0 && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No purchase orders</h3>
              <p className="mt-1 text-sm text-gray-500">Create your first purchase order.</p>
            </div>
          )}
        </div>
      )}

      {/* Supplier Modal */}
      {showModal && modalType === 'supplier' && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingItem ? 'Edit Supplier' : 'Add Supplier'}
              </h2>
            </div>
            <form onSubmit={handleSubmitSupplier} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Company Name *</label>
                  <input
                    type="text"
                    className="input"
                    value={supplierForm.name}
                    onChange={(e) => setSupplierForm({...supplierForm, name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="label">Contact Name</label>
                  <input
                    type="text"
                    className="input"
                    value={supplierForm.contactName}
                    onChange={(e) => setSupplierForm({...supplierForm, contactName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="label">Category *</label>
                  <select
                    className="select"
                    value={supplierForm.category}
                    onChange={(e) => setSupplierForm({...supplierForm, category: e.target.value})}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input
                    type="tel"
                    className="input"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({...supplierForm, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    className="input"
                    value={supplierForm.email}
                    onChange={(e) => setSupplierForm({...supplierForm, email: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <label className="label">Address</label>
                  <input
                    type="text"
                    className="input"
                    value={supplierForm.address}
                    onChange={(e) => setSupplierForm({...supplierForm, address: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <label className="label">Notes</label>
                  <textarea
                    className="input"
                    rows="2"
                    value={supplierForm.notes}
                    onChange={(e) => setSupplierForm({...supplierForm, notes: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingItem(null); }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingItem ? 'Update Supplier' : 'Add Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Purchase Order Modal */}
      {showModal && modalType === 'po' && (
        <div className="modal-overlay">
          <div className="modal-content max-w-3xl">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">New Purchase Order</h2>
            </div>
            <form onSubmit={handleSubmitPO} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Supplier *</label>
                  <select
                    className="select"
                    value={poForm.supplierId}
                    onChange={(e) => setPoForm({...poForm, supplierId: e.target.value})}
                    required
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Expected Delivery Date</label>
                  <input
                    type="date"
                    className="input"
                    value={poForm.expectedDate}
                    onChange={(e) => setPoForm({...poForm, expectedDate: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label">Items</label>
                  <button
                    type="button"
                    onClick={() => setPoForm({
                      ...poForm,
                      items: [...poForm.items, { description: '', quantity: '', unit: '', unitPrice: '' }]
                    })}
                    className="text-indigo-600 text-sm"
                  >
                    + Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="flex gap-2 text-xs text-gray-500 font-medium">
                    <span className="flex-1">Description</span>
                    <span style={{ width: '80px' }}>Quantity</span>
                    <span style={{ width: '80px' }}>Unit</span>
                    <span style={{ width: '100px' }}>Unit Price</span>
                    <span style={{ width: '24px' }}></span>
                  </div>
                  {poForm.items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        className="input"
                        style={{ flex: 1 }}
                        placeholder="Item description..."
                        value={item.description}
                        onChange={(e) => {
                          const items = [...poForm.items];
                          items[idx].description = e.target.value;
                          setPoForm({...poForm, items});
                        }}
                        required
                      />
                      <input
                        type="number"
                        className="input"
                        style={{ width: '80px' }}
                        placeholder="0"
                        value={item.quantity}
                        onChange={(e) => {
                          const items = [...poForm.items];
                          items[idx].quantity = e.target.value;
                          setPoForm({...poForm, items});
                        }}
                        required
                        min="1"
                      />
                      <input
                        type="text"
                        className="input"
                        style={{ width: '80px' }}
                        placeholder="kg, pcs..."
                        value={item.unit}
                        onChange={(e) => {
                          const items = [...poForm.items];
                          items[idx].unit = e.target.value;
                          setPoForm({...poForm, items});
                        }}
                        required
                      />
                      <input
                        type="number"
                        step="0.01"
                        className="input"
                        style={{ width: '100px' }}
                        placeholder="0.00"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const items = [...poForm.items];
                          items[idx].unitPrice = e.target.value;
                          setPoForm({...poForm, items});
                        }}
                        required
                        min="0"
                      />
                      <button
                        type="button"
                        onClick={() => setPoForm({
                          ...poForm,
                          items: poForm.items.filter((_, i) => i !== idx)
                        })}
                        className="text-red-600 hover:text-red-800 p-1"
                        disabled={poForm.items.length === 1}
                        style={{ width: '24px' }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea
                  className="input"
                  rows="2"
                  value={poForm.notes}
                  onChange={(e) => setPoForm({...poForm, notes: e.target.value})}
                />
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
                  Create Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Purchase Order Detail Modal */}
      {selectedPO && (
        <div className="modal-overlay" onClick={() => setSelectedPO(null)}>
          <div className="modal-content max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Purchase Order: {selectedPO.orderNumber}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedPO.supplier?.name}
                </p>
              </div>
              <button
                onClick={() => setSelectedPO(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* PO Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Order Date</p>
                  <p className="font-medium">{format(new Date(selectedPO.orderDate), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Expected Delivery</p>
                  <p className="font-medium">
                    {selectedPO.expectedDate
                      ? format(new Date(selectedPO.expectedDate), 'MMM d, yyyy')
                      : 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`badge ${getStatusBadge(selectedPO.status)}`}>
                    {selectedPO.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="font-medium text-lg">${selectedPO.totalAmount.toFixed(2)}</p>
                </div>
              </div>

              {/* Supplier Info */}
              {selectedPO.supplier && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <Building2 size={18} />
                    Supplier Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Company</p>
                      <p className="font-medium">{selectedPO.supplier.name}</p>
                    </div>
                    {selectedPO.supplier.contactName && (
                      <div>
                        <p className="text-gray-500">Contact</p>
                        <p className="font-medium">{selectedPO.supplier.contactName}</p>
                      </div>
                    )}
                    {selectedPO.supplier.email && (
                      <div>
                        <p className="text-gray-500">Email</p>
                        <p className="font-medium">{selectedPO.supplier.email}</p>
                      </div>
                    )}
                    {selectedPO.supplier.phone && (
                      <div>
                        <p className="text-gray-500">Phone</p>
                        <p className="font-medium">{selectedPO.supplier.phone}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Items */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Package size={18} />
                  Order Items ({selectedPO.items?.length || 0})
                </h3>
                {selectedPO.items && selectedPO.items.length > 0 ? (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedPO.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.quantity}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{item.unit}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">${item.unitPrice.toFixed(2)}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">${item.total.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan="4" className="px-4 py-3 text-sm font-medium text-gray-900 text-right">Total:</td>
                          <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">${selectedPO.totalAmount.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No items in this order</p>
                )}
              </div>

              {/* Notes */}
              {selectedPO.notes && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Notes</h3>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedPO.notes}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setSelectedPO(null)}
                className="btn btn-secondary"
              >
                Close
              </button>
              <select
                value={selectedPO.status}
                onChange={(e) => {
                  handleUpdatePOStatus(selectedPO.id, e.target.value);
                  setSelectedPO({ ...selectedPO, status: e.target.value });
                }}
                className="btn btn-primary"
              >
                <option value="DRAFT">Set Draft</option>
                <option value="SUBMITTED">Set Submitted</option>
                <option value="CONFIRMED">Set Confirmed</option>
                <option value="SHIPPED">Set Shipped</option>
                <option value="RECEIVED">Set Received</option>
                <option value="CANCELLED">Set Cancelled</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
