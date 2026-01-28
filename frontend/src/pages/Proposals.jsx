import { useState, useEffect } from 'react';
import api from '../utils/api';
import { format } from 'date-fns';
import { Plus, FileText, Send, CheckCircle, Eye, Edit, Trash2, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Proposals() {
  const { user } = useAuth();
  const [proposals, setProposals] = useState([]);
  const [events, setEvents] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [formData, setFormData] = useState({
    eventId: '',
    validUntil: '',
    notes: '',
    menus: [],
    lineItems: []
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [proposalsRes, eventsRes, packagesRes] = await Promise.all([
        api.get('/proposals'),
        api.get('/events'),
        api.get('/menus/packages')
      ]);
      setProposals(proposalsRes.data);
      setEvents(eventsRes.data);
      setPackages(packagesRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    const menuTotal = formData.menus.reduce((sum, m) => {
      const pkg = packages.find(p => p.id === m.packageId);
      return sum + (pkg?.pricePerPerson || 0) * (parseInt(m.guestCount) || 0);
    }, 0);
    const lineTotal = formData.lineItems.reduce((sum, l) =>
      sum + (parseFloat(l.unitPrice) || 0) * (parseInt(l.quantity) || 1), 0);
    return menuTotal + lineTotal;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const total = calculateTotal();
      const payload = {
        ...formData,
        createdById: user.id,
        totalAmount: total,
        menus: formData.menus.map(m => ({
          ...m,
          pricePerPerson: packages.find(p => p.id === m.packageId)?.pricePerPerson || 0
        })),
        lineItems: formData.lineItems.map(l => ({
          ...l,
          total: (parseFloat(l.unitPrice) || 0) * (parseInt(l.quantity) || 1)
        }))
      };

      await api.post('/proposals', payload);
      setShowModal(false);
      resetForm();
      loadData();
    } catch (err) {
      console.error('Failed to create proposal:', err);
      setError(err.response?.data?.error || 'Failed to create proposal. Please try again.');
    }
  };

  const handleSend = async (id) => {
    try {
      await api.post(`/proposals/${id}/send`);
      loadData();
    } catch (error) {
      console.error('Failed to send proposal:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this proposal?')) return;
    try {
      await api.delete(`/proposals/${id}`);
      loadData();
    } catch (error) {
      console.error('Failed to delete proposal:', error);
    }
  };

  const addMenu = () => {
    setFormData({
      ...formData,
      menus: [...formData.menus, { packageId: '', guestCount: '', notes: '' }]
    });
  };

  const addLineItem = () => {
    setFormData({
      ...formData,
      lineItems: [...formData.lineItems, { description: '', quantity: '1', unitPrice: '', category: '' }]
    });
  };

  const resetForm = () => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 14);
    setFormData({
      eventId: '',
      validUntil: format(nextWeek, 'yyyy-MM-dd'),
      notes: '',
      menus: [],
      lineItems: []
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      DRAFT: 'badge-gray',
      SENT: 'badge-info',
      VIEWED: 'badge-warning',
      ACCEPTED: 'badge-success',
      REJECTED: 'badge-danger',
      EXPIRED: 'badge-gray'
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
          <h1 className="text-2xl font-bold text-gray-900">Proposals</h1>
          <p className="text-gray-500">Manage event proposals and quotes</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          New Proposal
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Client</th>
              <th>Total</th>
              <th>Valid Until</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {proposals.map((proposal) => (
              <tr key={proposal.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setSelectedProposal(proposal)}>
                <td>
                  <div className="font-medium">{proposal.event?.name}</div>
                  <div className="text-sm text-gray-500">
                    {format(new Date(proposal.event?.date), 'MMM d, yyyy')}
                  </div>
                </td>
                <td>{proposal.event?.client?.name}</td>
                <td className="font-medium">${proposal.totalAmount.toLocaleString()}</td>
                <td>{format(new Date(proposal.validUntil), 'MMM d, yyyy')}</td>
                <td>
                  <span className={`badge ${getStatusBadge(proposal.status)}`}>
                    {proposal.status}
                  </span>
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedProposal(proposal)}
                      className="p-1 text-gray-400 hover:text-indigo-600"
                      title="View"
                    >
                      <Eye size={18} />
                    </button>
                    {proposal.status === 'DRAFT' && (
                      <button
                        onClick={() => handleSend(proposal.id)}
                        className="p-1 text-gray-400 hover:text-green-600"
                        title="Send"
                      >
                        <Send size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(proposal.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Delete"
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

      {proposals.length === 0 && (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No proposals</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new proposal.</p>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-3xl">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">New Proposal</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                  <label className="label">Valid Until</label>
                  <input
                    type="date"
                    className="input"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({...formData, validUntil: e.target.value})}
                    required
                  />
                </div>
              </div>

              {/* Menus */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label">Menu Packages</label>
                  <button type="button" onClick={addMenu} className="text-indigo-600 text-sm">
                    + Add Package
                  </button>
                </div>
                {formData.menus.map((menu, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <select
                      className="select flex-1"
                      value={menu.packageId}
                      onChange={(e) => {
                        const menus = [...formData.menus];
                        menus[idx].packageId = e.target.value;
                        setFormData({...formData, menus});
                      }}
                    >
                      <option value="">Select Package</option>
                      {packages.map(pkg => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.name} - ${pkg.pricePerPerson}/person
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      className="input w-32"
                      placeholder="Guests"
                      value={menu.guestCount}
                      onChange={(e) => {
                        const menus = [...formData.menus];
                        menus[idx].guestCount = e.target.value;
                        setFormData({...formData, menus});
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        menus: formData.menus.filter((_, i) => i !== idx)
                      })}
                      className="text-red-600"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label">Additional Items</label>
                  <button type="button" onClick={addLineItem} className="text-indigo-600 text-sm">
                    + Add Item
                  </button>
                </div>
                {formData.lineItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      className="input flex-1"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => {
                        const lineItems = [...formData.lineItems];
                        lineItems[idx].description = e.target.value;
                        setFormData({...formData, lineItems});
                      }}
                    />
                    <input
                      type="number"
                      className="input w-20"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => {
                        const lineItems = [...formData.lineItems];
                        lineItems[idx].quantity = e.target.value;
                        setFormData({...formData, lineItems});
                      }}
                    />
                    <input
                      type="number"
                      className="input w-28"
                      placeholder="Price"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => {
                        const lineItems = [...formData.lineItems];
                        lineItems[idx].unitPrice = e.target.value;
                        setFormData({...formData, lineItems});
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        lineItems: formData.lineItems.filter((_, i) => i !== idx)
                      })}
                      className="text-red-600"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea
                  className="input"
                  rows="3"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
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
                    Create Proposal
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {selectedProposal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Proposal Details</h2>
                <span className={`badge ${getStatusBadge(selectedProposal.status)}`}>
                  {selectedProposal.status}
                </span>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Event</p>
                  <p className="font-medium">{selectedProposal.event?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Client</p>
                  <p className="font-medium">{selectedProposal.event?.client?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Valid Until</p>
                  <p className="font-medium">
                    {format(new Date(selectedProposal.validUntil), 'MMMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="font-medium">
                    {format(new Date(selectedProposal.createdAt), 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>

              {selectedProposal.menus?.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Menu Packages</p>
                  {selectedProposal.menus.map((menu) => (
                    <div key={menu.id} className="flex justify-between p-2 bg-gray-50 rounded mb-1">
                      <span>{menu.package?.name} ({menu.guestCount} guests)</span>
                      <span className="font-medium">
                        ${(menu.pricePerPerson * menu.guestCount).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {selectedProposal.lineItems?.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Additional Items</p>
                  {selectedProposal.lineItems.map((item) => (
                    <div key={item.id} className="flex justify-between p-2 bg-gray-50 rounded mb-1">
                      <span>{item.description} x{item.quantity}</span>
                      <span className="font-medium">${item.total.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <span className="text-lg font-bold">Total</span>
                <span className="text-2xl font-bold text-indigo-600">
                  ${selectedProposal.totalAmount.toLocaleString()}
                </span>
              </div>

              {selectedProposal.notes && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Notes</p>
                  <p className="text-gray-700">{selectedProposal.notes}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedProposal(null)}
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
