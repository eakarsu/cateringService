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
  Plus, FileText, Send, Eye, Edit, Trash2, DollarSign, Search,
  ArrowUpDown, Download, CheckSquare, Square, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Proposals() {
  const { user } = useAuth();
  const toast = useToast();
  const [proposals, setProposals] = useState([]);
  const [events, setEvents] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProposal, setEditingProposal] = useState(null);
  const [selectedProposal, setSelectedProposal] = useState(null);
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
    validUntil: '',
    notes: '',
    menus: [],
    lineItems: []
  });
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => { loadData(); }, [page, limit, sortBy, sortOrder]);

  const loadData = async () => {
    try {
      const [proposalsRes, eventsRes, packagesRes] = await Promise.all([
        api.get('/proposals', { params: { page, limit, sortBy, sortOrder, search: searchTerm || undefined } }),
        api.get('/events'),
        api.get('/menus/packages')
      ]);
      setProposals(proposalsRes.data.data || proposalsRes.data);
      if (proposalsRes.data.pagination) setPagination(proposalsRes.data.pagination);
      setEvents(Array.isArray(eventsRes.data) ? eventsRes.data : eventsRes.data.data || []);
      setPackages(Array.isArray(packagesRes.data) ? packagesRes.data : packagesRes.data.data || []);
    } catch (err) {
      console.error('Failed to load data:', err);
      toast?.error('Failed to load proposals');
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
    if (!formData.validUntil) errs.validUntil = 'Valid until date is required';
    if (formData.menus.length === 0 && formData.lineItems.length === 0) {
      errs.items = 'At least one menu package or line item is required';
    }
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
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
    if (!validateForm()) return;
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

      if (editingProposal) {
        await api.put(`/proposals/${editingProposal.id}`, payload);
        toast?.success('Proposal updated successfully');
      } else {
        await api.post('/proposals', payload);
        toast?.success('Proposal created successfully');
      }
      setShowModal(false);
      setEditingProposal(null);
      resetForm();
      loadData();
    } catch (err) {
      console.error('Failed to save proposal:', err);
      setError(err.response?.data?.error || 'Failed to save proposal. Please try again.');
      toast?.error('Failed to save proposal');
    }
  };

  const handleSend = async (id) => {
    try {
      await api.post(`/proposals/${id}/send`);
      toast?.success('Proposal sent');
      loadData();
    } catch (err) {
      console.error('Failed to send proposal:', err);
      toast?.error('Failed to send proposal');
    }
  };

  const handleEdit = (proposal) => {
    setEditingProposal(proposal);
    setFormData({
      eventId: proposal.eventId || '',
      validUntil: proposal.validUntil ? format(new Date(proposal.validUntil), 'yyyy-MM-dd') : '',
      notes: proposal.notes || '',
      menus: proposal.menus?.map(m => ({
        packageId: m.packageId || '',
        guestCount: m.guestCount?.toString() || '',
        notes: m.notes || ''
      })) || [],
      lineItems: proposal.lineItems?.map(l => ({
        description: l.description || '',
        quantity: l.quantity?.toString() || '1',
        unitPrice: l.unitPrice?.toString() || '',
        category: l.category || ''
      })) || []
    });
    setValidationErrors({});
    setShowModal(true);
  };

  const handleDelete = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Proposal',
      message: 'Are you sure you want to delete this proposal? This action cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/proposals/${id}`);
          toast?.success('Proposal deleted');
          loadData();
        } catch {
          toast?.error('Failed to delete proposal');
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
      title: 'Delete Selected Proposals',
      message: `Are you sure you want to delete ${selectedIds.length} proposals? This cannot be undone.`,
      confirmLabel: 'Delete All',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.post('/proposals/bulk-delete', { ids: selectedIds });
          toast?.success(`${selectedIds.length} proposals deleted`);
          setSelectedIds([]);
          loadData();
        } catch {
          toast?.error('Failed to delete proposals');
        }
        setConfirmDialog({ isOpen: false });
      },
      onCancel: () => setConfirmDialog({ isOpen: false })
    });
  };

  const handleBulkStatusUpdate = async (status) => {
    if (!selectedIds.length) return;
    try {
      await api.put('/proposals/bulk-update', { ids: selectedIds, data: { status } });
      toast?.success(`${selectedIds.length} proposals updated to ${status}`);
      setSelectedIds([]);
      loadData();
    } catch {
      toast?.error('Failed to update proposals');
    }
  };

  const exportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('Proposals Report', 14, 22);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
      autoTable(doc, {
        startY: 35,
        head: [['Event', 'Status', 'Amount', 'Valid Until', 'Created By']],
        body: proposals.map(p => [
          p.event?.name || '',
          p.status,
          `$${p.totalAmount?.toLocaleString() || '0'}`,
          p.validUntil ? format(new Date(p.validUntil), 'MMM d, yyyy') : '',
          p.createdBy?.name || p.createdBy?.email || ''
        ]),
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] }
      });
      doc.save('proposals-report.pdf');
      toast?.success('PDF exported');
    } catch {
      toast?.error('Failed to export PDF');
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
    setValidationErrors({});
  };

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleSelectAll = () => setSelectedIds(prev => prev.length === proposals.length ? [] : proposals.map(p => p.id));

  const handleSort = (field) => {
    if (sortBy === field) setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('asc'); }
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

  if (loading) return <SkeletonGrid count={6} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proposals</h1>
          <p className="text-gray-500">Manage event proposals and quotes</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportPDF} className="btn btn-secondary flex items-center gap-2">
            <Download size={18} /> PDF
          </button>
          <button
            onClick={() => { resetForm(); setEditingProposal(null); setError(''); setShowModal(true); }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={20} /> New Proposal
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
                placeholder="Search by event name..."
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
            <option value="DRAFT">Draft</option>
            <option value="SENT">Sent</option>
            <option value="VIEWED">Viewed</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="REJECTED">Rejected</option>
            <option value="EXPIRED">Expired</option>
          </select>
          <button onClick={() => setSelectedIds([])} className="ml-auto text-gray-500 hover:text-gray-700"><X size={18} /></button>
        </div>
      )}

      {/* Proposals Table */}
      <div className="card overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>
                <div onClick={toggleSelectAll} className="cursor-pointer">
                  {selectedIds.length === proposals.length && proposals.length > 0
                    ? <CheckSquare className="text-indigo-600" size={18} />
                    : <Square className="text-gray-400" size={18} />}
                </div>
              </th>
              <th>Event</th>
              <th>Client</th>
              <th>Total</th>
              <th>Valid Until</th>
              <th>Created By</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {proposals.map((proposal) => (
              <tr
                key={proposal.id}
                className={`cursor-pointer hover:bg-gray-50 ${selectedIds.includes(proposal.id) ? 'bg-indigo-50' : ''}`}
                onClick={() => setSelectedProposal(proposal)}
              >
                <td onClick={(e) => e.stopPropagation()}>
                  <div onClick={() => toggleSelect(proposal.id)} className="cursor-pointer">
                    {selectedIds.includes(proposal.id)
                      ? <CheckSquare className="text-indigo-600" size={18} />
                      : <Square className="text-gray-400" size={18} />}
                  </div>
                </td>
                <td>
                  <div className="font-medium">{proposal.event?.name}</div>
                  <div className="text-sm text-gray-500">
                    {proposal.event?.date && format(new Date(proposal.event.date), 'MMM d, yyyy')}
                  </div>
                </td>
                <td>{proposal.event?.client?.name}</td>
                <td className="font-medium">${proposal.totalAmount?.toLocaleString()}</td>
                <td>{proposal.validUntil && format(new Date(proposal.validUntil), 'MMM d, yyyy')}</td>
                <td>{proposal.createdBy?.name || proposal.createdBy?.email || '-'}</td>
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
                    <button
                      onClick={() => { handleEdit(proposal); setSelectedProposal(null); }}
                      className="p-1 text-gray-400 hover:text-indigo-600"
                      title="Edit"
                    >
                      <Edit size={18} />
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

      <Pagination
        page={page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(l) => { setLimit(l); setPage(1); }}
      />

      {/* Detail Modal */}
      {selectedProposal && !showModal && (
        <div className="modal-overlay" onClick={() => setSelectedProposal(null)}>
          <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
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
                    {selectedProposal.validUntil && format(new Date(selectedProposal.validUntil), 'MMMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Created By</p>
                  <p className="font-medium">
                    {selectedProposal.createdBy?.name || selectedProposal.createdBy?.email || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="font-medium">
                    {selectedProposal.createdAt && format(new Date(selectedProposal.createdAt), 'MMMM d, yyyy')}
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
                      <span className="font-medium">${item.total?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <span className="text-lg font-bold">Total</span>
                <span className="text-2xl font-bold text-indigo-600">
                  ${selectedProposal.totalAmount?.toLocaleString()}
                </span>
              </div>

              {selectedProposal.notes && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Notes</p>
                  <p className="text-gray-700">{selectedProposal.notes}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setSelectedProposal(null)} className="btn btn-secondary">Close</button>
              <button onClick={() => { handleDelete(selectedProposal.id); setSelectedProposal(null); }} className="btn btn-danger">Delete</button>
              <button onClick={() => { handleEdit(selectedProposal); setSelectedProposal(null); }} className="btn btn-primary">Edit</button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-3xl">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingProposal ? 'Edit Proposal' : 'New Proposal'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>
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
                  <label className="label">Valid Until *</label>
                  <input
                    type="date"
                    className={`input ${validationErrors.validUntil ? 'border-red-500' : ''}`}
                    value={formData.validUntil}
                    onChange={(e) => setFormData({...formData, validUntil: e.target.value})}
                    required
                  />
                  {validationErrors.validUntil && <p className="text-xs text-red-600 mt-1">{validationErrors.validUntil}</p>}
                </div>
              </div>

              {validationErrors.items && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{validationErrors.items}</div>
              )}

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
                    onClick={() => { setShowModal(false); setEditingProposal(null); }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingProposal ? 'Update Proposal' : 'Create Proposal'}
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
