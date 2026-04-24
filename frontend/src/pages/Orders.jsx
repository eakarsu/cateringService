import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import { SkeletonGrid } from '../components/SkeletonLoader';
import {
  Plus, ShoppingCart, Search, Eye, Edit, Trash2,
  ArrowUpDown, Download, CheckSquare, Square, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Orders() {
  const { user } = useAuth();
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [events, setEvents] = useState([]);
  const [packages, setPackages] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [orderStatuses, setOrderStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });
  const [formData, setFormData] = useState({
    eventId: '',
    packageId: '',
    guestCount: '',
    specialRequests: '',
    items: []
  });
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => { loadData(); }, [page, limit, sortBy, sortOrder]);

  const loadData = async () => {
    try {
      const [ordersRes, eventsRes, packagesRes, itemsRes, statusesRes] = await Promise.all([
        api.get('/orders', { params: { page, limit, sortBy, sortOrder, search: searchTerm || undefined } }),
        api.get('/events'),
        api.get('/menus/packages'),
        api.get('/menus/items'),
        api.get('/orders/options/statuses')
      ]);
      setOrders(ordersRes.data.data || ordersRes.data);
      if (ordersRes.data.pagination) setPagination(ordersRes.data.pagination);
      setEvents(Array.isArray(eventsRes.data) ? eventsRes.data : eventsRes.data.data || []);
      setPackages(Array.isArray(packagesRes.data) ? packagesRes.data : packagesRes.data.data || []);
      setMenuItems(Array.isArray(itemsRes.data) ? itemsRes.data : itemsRes.data.data || []);
      setOrderStatuses(statusesRes.data || []);
    } catch (err) {
      console.error('Failed to load data:', err);
      toast?.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e?.preventDefault?.();
    setPage(1);
    loadData();
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.eventId) errs.eventId = 'Event is required';
    if (!formData.guestCount || parseInt(formData.guestCount) < 1) errs.guestCount = 'At least 1 guest required';
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const calculateTotal = () => {
    let total = 0;
    if (formData.packageId) {
      const pkg = packages.find(p => p.id === formData.packageId);
      total += (pkg?.pricePerPerson || 0) * (parseInt(formData.guestCount) || 0);
    }
    total += formData.items.reduce((sum, item) =>
      sum + (parseFloat(item.unitPrice) || 0) * (parseInt(item.quantity) || 0), 0);
    return total;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateForm()) return;
    try {
      const selectedEvent = events.find(ev => ev.id === formData.eventId);
      const payload = {
        ...formData,
        clientId: selectedEvent?.clientId,
        totalAmount: calculateTotal()
      };
      if (editingOrder) {
        await api.put(`/orders/${editingOrder.id}`, payload);
        toast?.success('Order updated successfully');
      } else {
        await api.post('/orders', payload);
        toast?.success('Order created successfully');
      }
      setShowModal(false);
      setEditingOrder(null);
      resetForm();
      loadData();
    } catch (err) {
      console.error('Failed to save order:', err);
      setError(err.response?.data?.error || 'Failed to save order. Please try again.');
      toast?.error('Failed to save order');
    }
  };

  const handleStatusUpdate = async (orderId, status) => {
    try {
      await api.put(`/orders/${orderId}`, { status });
      toast?.success('Status updated');
      loadData();
    } catch (err) {
      console.error('Failed to update status:', err);
      toast?.error('Failed to update status');
    }
  };

  const handleEdit = (order) => {
    setEditingOrder(order);
    setFormData({
      eventId: order.eventId || '',
      packageId: order.packageId || '',
      guestCount: order.guestCount?.toString() || '',
      specialRequests: order.specialRequests || '',
      items: order.items?.map(item => ({
        menuItemId: item.menuItemId || '',
        quantity: item.quantity?.toString() || '1',
        unitPrice: item.unitPrice?.toString() || '',
        notes: item.notes || ''
      })) || []
    });
    setValidationErrors({});
    setShowModal(true);
  };

  const handleDelete = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Order',
      message: 'Are you sure you want to delete this order? This action cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/orders/${id}`);
          toast?.success('Order deleted');
          loadData();
        } catch {
          toast?.error('Failed to delete order');
        }
        setConfirmDialog({ isOpen: false });
      },
      onCancel: () => setConfirmDialog({ isOpen: false })
    });
  };

  const handleBulkDelete = () => {
    if (!selectedIds.length) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Selected Orders',
      message: `Are you sure you want to delete ${selectedIds.length} orders? This cannot be undone.`,
      confirmLabel: 'Delete All',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.post('/orders/bulk-delete', { ids: selectedIds });
          toast?.success(`${selectedIds.length} orders deleted`);
          setSelectedIds([]);
          loadData();
        } catch {
          toast?.error('Failed to delete orders');
        }
        setConfirmDialog({ isOpen: false });
      },
      onCancel: () => setConfirmDialog({ isOpen: false })
    });
  };

  const handleBulkStatusUpdate = async (status) => {
    if (!selectedIds.length) return;
    try {
      await api.put('/orders/bulk-update', { ids: selectedIds, data: { status } });
      toast?.success(`${selectedIds.length} orders updated to ${status}`);
      setSelectedIds([]);
      loadData();
    } catch {
      toast?.error('Failed to update orders');
    }
  };

  const exportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('Orders Report', 14, 22);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
      autoTable(doc, {
        startY: 35,
        head: [['Order #', 'Event', 'Client', 'Status', 'Guests', 'Amount']],
        body: orders.map(o => [
          o.orderNumber,
          o.event?.name || '',
          o.client?.name || '',
          o.status,
          o.guestCount,
          `$${o.totalAmount?.toLocaleString() || '0'}`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] }
      });
      doc.save('orders-report.pdf');
      toast?.success('PDF exported');
    } catch {
      toast?.error('Failed to export PDF');
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { menuItemId: '', quantity: '1', unitPrice: '', notes: '' }]
    });
  };

  const resetForm = () => {
    setFormData({
      eventId: '',
      packageId: '',
      guestCount: '',
      specialRequests: '',
      items: []
    });
    setValidationErrors({});
  };

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleSelectAll = () => setSelectedIds(prev => prev.length === orders.length ? [] : orders.map(o => o.id));

  const handleSort = (field) => {
    if (sortBy === field) setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('asc'); }
  };

  const getStatusBadge = (status) => {
    const badges = {
      PENDING: 'badge-warning',
      CONFIRMED: 'badge-info',
      IN_PREP: 'badge-info',
      READY: 'badge-success',
      IN_TRANSIT: 'badge-info',
      DELIVERED: 'badge-success',
      COMPLETED: 'badge-gray',
      CANCELLED: 'badge-danger'
    };
    return badges[status] || 'badge-gray';
  };

  if (loading) return <SkeletonGrid count={6} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-500">Manage catering orders</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportPDF} className="btn btn-secondary flex items-center gap-2">
            <Download size={18} /> PDF
          </button>
          <button
            onClick={() => { resetForm(); setEditingOrder(null); setError(''); setShowModal(true); }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={20} /> New Order
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="card">
        <div className="flex flex-wrap gap-4">
          <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" size={20} />
              <input
                type="text"
                placeholder="Search by order number or event..."
                className="input"
                style={{ paddingLeft: '2.5rem' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onBlur={handleSearch}
              />
            </div>
          </form>
          <button onClick={() => handleSort(sortBy === 'createdAt' ? 'totalAmount' : 'createdAt')} className="btn btn-secondary flex items-center gap-1">
            <ArrowUpDown size={16} /> {sortBy === 'createdAt' ? 'Date' : 'Amount'} {sortOrder === 'asc' ? '\u2191' : '\u2193'}
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="card bg-indigo-50 border-indigo-200 flex items-center gap-4">
          <span className="text-sm font-medium text-indigo-700">{selectedIds.length} selected</span>
          <button onClick={handleBulkDelete} className="btn btn-danger text-sm py-1">Delete Selected</button>
          <select
            className="select w-auto text-sm py-1"
            defaultValue=""
            onChange={(e) => { if (e.target.value) handleBulkStatusUpdate(e.target.value); e.target.value = ''; }}
          >
            <option value="">Change Status...</option>
            {orderStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button onClick={() => setSelectedIds([])} className="ml-auto text-gray-500 hover:text-gray-700"><X size={18} /></button>
        </div>
      )}

      {/* Orders Table */}
      <div className="card overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>
                <div onClick={toggleSelectAll} className="cursor-pointer">
                  {selectedIds.length === orders.length && orders.length > 0
                    ? <CheckSquare className="text-indigo-600" size={18} />
                    : <Square className="text-gray-400" size={18} />}
                </div>
              </th>
              <th>Order #</th>
              <th>Event</th>
              <th>Client</th>
              <th>Guests</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {orders.map((order) => (
              <tr
                key={order.id}
                className={`cursor-pointer hover:bg-gray-50 ${selectedIds.includes(order.id) ? 'bg-indigo-50' : ''}`}
                onClick={() => setSelectedOrder(order)}
              >
                <td onClick={(e) => e.stopPropagation()}>
                  <div onClick={() => toggleSelect(order.id)} className="cursor-pointer">
                    {selectedIds.includes(order.id)
                      ? <CheckSquare className="text-indigo-600" size={18} />
                      : <Square className="text-gray-400" size={18} />}
                  </div>
                </td>
                <td className="font-medium">{order.orderNumber}</td>
                <td>
                  <div>{order.event?.name}</div>
                  <div className="text-sm text-gray-500">
                    {order.event?.date && format(new Date(order.event.date), 'MMM d, yyyy')}
                  </div>
                </td>
                <td>{order.client?.name}</td>
                <td>{order.guestCount}</td>
                <td className="font-medium">${order.totalAmount?.toLocaleString()}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                    className={`badge ${getStatusBadge(order.status)} border-0 cursor-pointer`}
                  >
                    {orderStatuses.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="p-1 text-gray-400 hover:text-indigo-600"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={() => { handleEdit(order); setSelectedOrder(null); }}
                      className="p-1 text-gray-400 hover:text-indigo-600"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(order.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {orders.length === 0 && (
        <div className="text-center py-12">
          <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No orders</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new order.</p>
        </div>
      )}

      <Pagination
        page={page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(l) => { setLimit(l); setPage(1); }}
      />

      {/* Detail Modal */}
      {selectedOrder && !showModal && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Order {selectedOrder.orderNumber}
                </h2>
                <span className={`badge ${getStatusBadge(selectedOrder.status)}`}>
                  {selectedOrder.status}
                </span>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Event</p>
                  <p className="font-medium">{selectedOrder.event?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Guest Count</p>
                  <p className="font-medium">{selectedOrder.guestCount}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Client</p>
                  <p className="font-medium">{selectedOrder.client?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Final Headcount</p>
                  <p className="font-medium">{selectedOrder.finalHeadcount || 'Not confirmed'}</p>
                </div>
              </div>

              {selectedOrder.package && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Package</p>
                  <p className="font-medium">{selectedOrder.package.name}</p>
                </div>
              )}

              {selectedOrder.items?.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Items</p>
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex justify-between p-2 bg-gray-50 rounded mb-1">
                      <span>{item.menuItem?.name} x{item.quantity}</span>
                      <span className="font-medium">
                        ${(item.unitPrice * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {selectedOrder.specialRequests && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Special Requests</p>
                  <p className="text-gray-700">{selectedOrder.specialRequests}</p>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <span className="text-lg font-bold">Total</span>
                <span className="text-2xl font-bold text-indigo-600">
                  ${selectedOrder.totalAmount?.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setSelectedOrder(null)} className="btn btn-secondary">Close</button>
              <button onClick={() => { handleDelete(selectedOrder.id); setSelectedOrder(null); }} className="btn btn-danger">Delete</button>
              <button onClick={() => { handleEdit(selectedOrder); setSelectedOrder(null); }} className="btn btn-primary">Edit</button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-2xl">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingOrder ? 'Edit Order' : 'New Order'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Event *</label>
                  <select
                    className={`select ${validationErrors.eventId ? 'border-red-500' : ''}`}
                    value={formData.eventId}
                    onChange={(e) => setFormData({...formData, eventId: e.target.value})}
                    required
                  >
                    <option value="">Select Event</option>
                    {events.map(event => (
                      <option key={event.id} value={event.id}>
                        {event.name} - {event.date ? format(new Date(event.date), 'MMM d') : ''}
                      </option>
                    ))}
                  </select>
                  {validationErrors.eventId && <p className="text-xs text-red-600 mt-1">{validationErrors.eventId}</p>}
                </div>
                <div>
                  <label className="label">Guest Count *</label>
                  <input
                    type="number"
                    className={`input ${validationErrors.guestCount ? 'border-red-500' : ''}`}
                    value={formData.guestCount}
                    onChange={(e) => setFormData({...formData, guestCount: e.target.value})}
                    required
                    min="1"
                  />
                  {validationErrors.guestCount && <p className="text-xs text-red-600 mt-1">{validationErrors.guestCount}</p>}
                </div>
                <div className="col-span-2">
                  <label className="label">Package (Optional)</label>
                  <select
                    className="select"
                    value={formData.packageId}
                    onChange={(e) => setFormData({...formData, packageId: e.target.value})}
                  >
                    <option value="">Select Package</option>
                    {packages.map(pkg => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} - ${pkg.pricePerPerson}/person
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Additional Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label">Additional Items</label>
                  <button type="button" onClick={addItem} className="text-indigo-600 text-sm">
                    + Add Item
                  </button>
                </div>
                {formData.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <select
                      className="select flex-1"
                      value={item.menuItemId}
                      onChange={(e) => {
                        const items = [...formData.items];
                        const menuItem = menuItems.find(m => m.id === e.target.value);
                        items[idx].menuItemId = e.target.value;
                        items[idx].unitPrice = menuItem?.price || '';
                        setFormData({...formData, items});
                      }}
                    >
                      <option value="">Select Item</option>
                      {menuItems.map(mi => (
                        <option key={mi.id} value={mi.id}>
                          {mi.name} - ${mi.price}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      className="input w-20"
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
                      className="text-red-600"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <label className="label">Special Requests</label>
                <textarea
                  className="input"
                  rows="3"
                  value={formData.specialRequests}
                  onChange={(e) => setFormData({...formData, specialRequests: e.target.value})}
                  placeholder="Dietary restrictions, allergies, etc."
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="text-lg font-bold text-gray-900">
                  Total: ${calculateTotal().toLocaleString()}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setEditingOrder(null); }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingOrder ? 'Update Order' : 'Create Order'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog {...confirmDialog} />
    </div>
  );
}
