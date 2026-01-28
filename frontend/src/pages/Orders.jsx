import { useState, useEffect } from 'react';
import api from '../utils/api';
import { format } from 'date-fns';
import { Plus, ShoppingCart, Eye, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [events, setEvents] = useState([]);
  const [packages, setPackages] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [orderStatuses, setOrderStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [formData, setFormData] = useState({
    eventId: '',
    packageId: '',
    guestCount: '',
    specialRequests: '',
    items: []
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [ordersRes, eventsRes, packagesRes, itemsRes, statusesRes] = await Promise.all([
        api.get('/orders'),
        api.get('/events'),
        api.get('/menus/packages'),
        api.get('/menus/items'),
        api.get('/orders/options/statuses')
      ]);
      setOrders(ordersRes.data);
      setEvents(eventsRes.data);
      setPackages(packagesRes.data);
      setMenuItems(itemsRes.data);
      setOrderStatuses(statusesRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
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
    try {
      const selectedEvent = events.find(ev => ev.id === formData.eventId);
      const payload = {
        ...formData,
        clientId: selectedEvent?.clientId,
        totalAmount: calculateTotal()
      };
      await api.post('/orders', payload);
      setShowModal(false);
      resetForm();
      loadData();
    } catch (err) {
      console.error('Failed to create order:', err);
      setError(err.response?.data?.error || 'Failed to create order. Please try again.');
    }
  };

  const handleStatusUpdate = async (orderId, status) => {
    try {
      await api.put(`/orders/${orderId}`, { status });
      loadData();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this order?')) return;
    try {
      await api.delete(`/orders/${id}`);
      loadData();
    } catch (error) {
      console.error('Failed to delete order:', error);
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
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-500">Manage catering orders</p>
        </div>
        <button
          onClick={() => { resetForm(); setError(''); setShowModal(true); }}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          New Order
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="table">
          <thead>
            <tr>
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
              <tr key={order.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setSelectedOrder(order)}>
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
                <td>
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

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-2xl">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">New Order</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Event</label>
                  <select
                    className="select"
                    value={formData.eventId}
                    onChange={(e) => setFormData({...formData, eventId: e.target.value})}
                    required
                  >
                    <option value="">Select Event</option>
                    {events.map(event => (
                      <option key={event.id} value={event.id}>
                        {event.name} - {format(new Date(event.date), 'MMM d')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Guest Count</label>
                  <input
                    type="number"
                    className="input"
                    value={formData.guestCount}
                    onChange={(e) => setFormData({...formData, guestCount: e.target.value})}
                    required
                    min="1"
                  />
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
                    onClick={() => setShowModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create Order
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-content max-w-2xl">
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
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedOrder(null)}
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
