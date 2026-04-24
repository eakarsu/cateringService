import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import { SkeletonGrid } from '../components/SkeletonLoader';
import { Plus, MapPin, Users, Phone, Mail, Edit, Trash2, CheckCircle, XCircle, Search, ArrowUpDown, Download, CheckSquare, Square, X } from 'lucide-react';

const emptyForm = {
  name: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  capacity: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  hasKitchen: false,
  parkingInfo: '',
  notes: ''
};

export default function Venues() {
  const toast = useToast();

  // Data state
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Search and sort
  const [searchTerm, setSearchTerm] = useState('');
  const [sortAsc, setSortAsc] = useState(true);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingVenue, setEditingVenue] = useState(null);
  const [selectedVenue, setSelectedVenue] = useState(null);

  // Form
  const [formData, setFormData] = useState({ ...emptyForm });
  const [formErrors, setFormErrors] = useState({});
  const [error, setError] = useState('');

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Bulk update modal
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [bulkUpdateData, setBulkUpdateData] = useState({ hasKitchen: '' });

  useEffect(() => {
    loadVenues();
  }, [page, limit]);

  // Reset to page 1 when search changes
  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    } else {
      loadVenues();
    }
  }, [searchTerm]);

  const loadVenues = async () => {
    try {
      setLoading(true);
      const params = { page, limit };
      if (searchTerm) params.search = searchTerm;
      const res = await api.get('/venues', { params });

      // Handle both old format (array) and new format (object with data)
      if (Array.isArray(res.data)) {
        setVenues(res.data);
        setTotal(res.data.length);
        setTotalPages(1);
      } else {
        setVenues(res.data.data || []);
        const pag = res.data.pagination || {};
        setTotal(pag.total || 0);
        setTotalPages(pag.totalPages || 1);
        if (pag.page) setPage(pag.page);
      }
    } catch (err) {
      console.error('Failed to load venues:', err);
      toast?.error('Failed to load venues');
    } finally {
      setLoading(false);
    }
  };

  // --- Search & Sort (client-side filtering on current page) ---
  const getFilteredAndSorted = () => {
    let filtered = [...venues];

    // Client-side search fallback (if backend does not filter)
    if (searchTerm && Array.isArray(venues)) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.name?.toLowerCase().includes(term) ||
          v.city?.toLowerCase().includes(term) ||
          v.address?.toLowerCase().includes(term)
      );
    }

    // Sort by name
    filtered.sort((a, b) => {
      const cmp = (a.name || '').localeCompare(b.name || '');
      return sortAsc ? cmp : -cmp;
    });

    return filtered;
  };

  const displayedVenues = getFilteredAndSorted();

  // --- Form Validation ---
  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Venue name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    if (!formData.address.trim()) {
      errors.address = 'Address is required';
    }

    if (!formData.city.trim()) {
      errors.city = 'City is required';
    }

    if (!formData.state.trim()) {
      errors.state = 'State is required';
    } else if (formData.state.trim().length < 2) {
      errors.state = 'Use at least 2-letter state code';
    }

    if (!formData.zipCode.trim()) {
      errors.zipCode = 'ZIP code is required';
    } else if (!/^\d{5}(-\d{4})?$/.test(formData.zipCode.trim())) {
      errors.zipCode = 'Invalid ZIP code format (e.g., 12345 or 12345-6789)';
    }

    if (!formData.capacity || parseInt(formData.capacity) < 1) {
      errors.capacity = 'Capacity must be at least 1';
    }

    if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      errors.contactEmail = 'Invalid email format';
    }

    if (formData.contactPhone && !/^[\d\s()+-]{7,20}$/.test(formData.contactPhone)) {
      errors.contactPhone = 'Invalid phone number format';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // --- CRUD Handlers ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    try {
      if (editingVenue) {
        await api.put(`/venues/${editingVenue.id}`, formData);
        toast?.success('Venue updated successfully');
      } else {
        await api.post('/venues', formData);
        toast?.success('Venue created successfully');
      }
      setShowModal(false);
      setEditingVenue(null);
      resetForm();
      loadVenues();
    } catch (err) {
      console.error('Failed to save venue:', err);
      const msg = err.response?.data?.error || 'Failed to save venue. Please try again.';
      setError(msg);
      toast?.error(msg);
    }
  };

  const handleEdit = (venue) => {
    setEditingVenue(venue);
    setFormData({
      name: venue.name,
      address: venue.address,
      city: venue.city,
      state: venue.state,
      zipCode: venue.zipCode,
      capacity: venue.capacity.toString(),
      contactName: venue.contactName || '',
      contactPhone: venue.contactPhone || '',
      contactEmail: venue.contactEmail || '',
      hasKitchen: venue.hasKitchen,
      parkingInfo: venue.parkingInfo || '',
      notes: venue.notes || ''
    });
    setFormErrors({});
    setError('');
    setShowModal(true);
  };

  const handleDelete = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Venue',
      message: 'Are you sure you want to delete this venue? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await api.delete(`/venues/${id}`);
          toast?.success('Venue deleted successfully');
          setSelectedVenue(null);
          loadVenues();
        } catch (err) {
          console.error('Failed to delete venue:', err);
          toast?.error(err.response?.data?.error || 'Failed to delete venue');
        } finally {
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} });
        }
      }
    });
  };

  const resetForm = () => {
    setFormData({ ...emptyForm });
    setFormErrors({});
    setError('');
  };

  // --- Bulk Actions ---
  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === displayedVenues.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayedVenues.map((v) => v.id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Bulk Delete Venues',
      message: `Are you sure you want to delete ${selectedIds.length} venue(s)? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await Promise.all(selectedIds.map((id) => api.delete(`/venues/${id}`)));
          toast?.success(`${selectedIds.length} venue(s) deleted successfully`);
          setSelectedIds([]);
          loadVenues();
        } catch (err) {
          console.error('Bulk delete failed:', err);
          toast?.error('Some venues could not be deleted');
          loadVenues();
        } finally {
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} });
        }
      }
    });
  };

  const handleBulkUpdate = async (e) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;
    try {
      const updatePayload = {};
      if (bulkUpdateData.hasKitchen !== '') {
        updatePayload.hasKitchen = bulkUpdateData.hasKitchen === 'true';
      }

      if (Object.keys(updatePayload).length === 0) {
        toast?.warning('No fields selected for update');
        return;
      }

      await Promise.all(selectedIds.map((id) => api.put(`/venues/${id}`, updatePayload)));
      toast?.success(`${selectedIds.length} venue(s) updated successfully`);
      setSelectedIds([]);
      setShowBulkUpdateModal(false);
      setBulkUpdateData({ hasKitchen: '' });
      loadVenues();
    } catch (err) {
      console.error('Bulk update failed:', err);
      toast?.error('Some venues could not be updated');
      loadVenues();
    }
  };

  // --- PDF Export ---
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Venues Report', 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 30);

    const tableData = displayedVenues.map((v) => [
      v.name,
      v.address,
      `${v.city}, ${v.state} ${v.zipCode}`,
      v.capacity,
      v.hasKitchen ? 'Yes' : 'No',
      v.contactName || '-',
      v.contactPhone || '-'
    ]);

    autoTable(doc, {
      startY: 36,
      head: [['Name', 'Address', 'City/State/ZIP', 'Capacity', 'Kitchen', 'Contact', 'Phone']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save('venues-report.pdf');
    toast?.success('PDF exported successfully');
  };

  // --- Card Click Handler ---
  const handleCardClick = (venue) => {
    setSelectedVenue(venue);
  };

  // --- Pagination handlers ---
  const handlePageChange = (newPage) => {
    setPage(newPage);
    setSelectedIds([]);
  };

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
    setPage(1);
    setSelectedIds([]);
  };

  // --- Input field helper ---
  const inputClass = (field) =>
    `input ${formErrors[field] ? 'border-red-500 ring-1 ring-red-500' : ''}`;

  // --- Loading State ---
  if (loading && venues.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Venues</h1>
            <p className="text-gray-500">Manage event venues</p>
          </div>
        </div>
        <SkeletonGrid count={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Venues</h1>
          <p className="text-gray-500">Manage event venues</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportPDF}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Download size={20} />
            Export PDF
          </button>
          <button
            onClick={() => { resetForm(); setEditingVenue(null); setShowModal(true); }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Add Venue
          </button>
        </div>
      </div>

      {/* Search & Sort Bar */}
      <div className="card">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" size={18} />
              <input
                type="text"
                placeholder="Search by name, city, or address..."
                className="input"
                style={{ paddingLeft: '2.5rem' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="btn btn-secondary flex items-center gap-2"
          >
            <ArrowUpDown size={18} />
            Name {sortAsc ? 'A-Z' : 'Z-A'}
          </button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-medium text-indigo-700">
              {selectedIds.length} venue(s) selected
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setBulkUpdateData({ hasKitchen: '' }); setShowBulkUpdateModal(true); }}
              className="btn btn-secondary flex items-center gap-2 text-sm"
            >
              <Edit size={16} />
              Bulk Update
            </button>
            <button
              onClick={handleBulkDelete}
              className="btn btn-danger flex items-center gap-2 text-sm"
            >
              <Trash2 size={16} />
              Delete Selected
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="btn btn-secondary flex items-center gap-2 text-sm"
            >
              <X size={16} />
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Venues Grid */}
      {loading ? (
        <SkeletonGrid count={6} />
      ) : (
        <>
          {displayedVenues.length > 0 && (
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600"
              >
                {selectedIds.length === displayedVenues.length && displayedVenues.length > 0 ? (
                  <CheckSquare size={18} className="text-indigo-600" />
                ) : (
                  <Square size={18} />
                )}
                {selectedIds.length === displayedVenues.length && displayedVenues.length > 0
                  ? 'Deselect All'
                  : 'Select All'}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedVenues.map((venue) => (
              <div
                key={venue.id}
                className={`card hover:shadow-md transition-shadow cursor-pointer ${
                  selectedIds.includes(venue.id) ? 'ring-2 ring-indigo-500 bg-indigo-50/30' : ''
                }`}
                onClick={() => handleCardClick(venue)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {/* Checkbox */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSelect(venue.id); }}
                      className="text-gray-400 hover:text-indigo-600"
                    >
                      {selectedIds.includes(venue.id) ? (
                        <CheckSquare size={20} className="text-indigo-600" />
                      ) : (
                        <Square size={20} />
                      )}
                    </button>
                    <MapPin className="text-indigo-600" size={20} />
                    <h3 className="font-semibold text-gray-900">{venue.name}</h3>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleEdit(venue)}
                      className="p-1 text-gray-400 hover:text-indigo-600"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(venue.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-500">
                  <p>{venue.address}</p>
                  <p>{venue.city}, {venue.state} {venue.zipCode}</p>
                  <div className="flex items-center gap-2">
                    <Users size={16} />
                    Capacity: {venue.capacity}
                  </div>
                  <div className="flex items-center gap-2">
                    {venue.hasKitchen ? (
                      <CheckCircle className="text-green-500" size={16} />
                    ) : (
                      <XCircle className="text-gray-400" size={16} />
                    )}
                    {venue.hasKitchen ? 'Has Kitchen' : 'No Kitchen'}
                  </div>
                </div>

                {venue.contactName && (
                  <div className="mt-4 pt-3 border-t border-gray-100 space-y-1 text-sm">
                    <p className="font-medium text-gray-900">{venue.contactName}</p>
                    {venue.contactPhone && (
                      <div className="flex items-center gap-2 text-gray-500">
                        <Phone size={14} />
                        {venue.contactPhone}
                      </div>
                    )}
                    {venue.contactEmail && (
                      <div className="flex items-center gap-2 text-gray-500">
                        <Mail size={14} />
                        {venue.contactEmail}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-gray-100">
                  <span className="badge badge-info">{venue._count?.events || 0} events</span>
                </div>
              </div>
            ))}
          </div>

          {displayedVenues.length === 0 && (
            <div className="text-center py-12">
              <MapPin className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No venues</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'No venues match your search.' : 'Get started by adding a new venue.'}
              </p>
            </div>
          )}

          {/* Pagination */}
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
          />
        </>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingVenue ? 'Edit Venue' : 'Add Venue'}
              </h2>
              <button
                onClick={() => { setShowModal(false); setEditingVenue(null); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Venue Name *</label>
                  <input
                    type="text"
                    className={inputClass('name')}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
                </div>

                <div className="col-span-2">
                  <label className="label">Address *</label>
                  <input
                    type="text"
                    className={inputClass('address')}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                  {formErrors.address && <p className="text-red-500 text-xs mt-1">{formErrors.address}</p>}
                </div>

                <div>
                  <label className="label">City *</label>
                  <input
                    type="text"
                    className={inputClass('city')}
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                  {formErrors.city && <p className="text-red-500 text-xs mt-1">{formErrors.city}</p>}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label">State *</label>
                    <input
                      type="text"
                      className={inputClass('state')}
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    />
                    {formErrors.state && <p className="text-red-500 text-xs mt-1">{formErrors.state}</p>}
                  </div>
                  <div>
                    <label className="label">ZIP *</label>
                    <input
                      type="text"
                      className={inputClass('zipCode')}
                      value={formData.zipCode}
                      onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    />
                    {formErrors.zipCode && <p className="text-red-500 text-xs mt-1">{formErrors.zipCode}</p>}
                  </div>
                </div>

                <div>
                  <label className="label">Capacity *</label>
                  <input
                    type="number"
                    className={inputClass('capacity')}
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    min="1"
                  />
                  {formErrors.capacity && <p className="text-red-500 text-xs mt-1">{formErrors.capacity}</p>}
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="hasKitchen"
                    checked={formData.hasKitchen}
                    onChange={(e) => setFormData({ ...formData, hasKitchen: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 rounded"
                  />
                  <label htmlFor="hasKitchen" className="text-sm text-gray-700">Has Kitchen</label>
                </div>

                <div>
                  <label className="label">Contact Name</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">Contact Phone</label>
                  <input
                    type="tel"
                    className={inputClass('contactPhone')}
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  />
                  {formErrors.contactPhone && <p className="text-red-500 text-xs mt-1">{formErrors.contactPhone}</p>}
                </div>

                <div className="col-span-2">
                  <label className="label">Contact Email</label>
                  <input
                    type="email"
                    className={inputClass('contactEmail')}
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  />
                  {formErrors.contactEmail && <p className="text-red-500 text-xs mt-1">{formErrors.contactEmail}</p>}
                </div>

                <div className="col-span-2">
                  <label className="label">Parking Info</label>
                  <textarea
                    className="input"
                    rows="2"
                    value={formData.parkingInfo}
                    onChange={(e) => setFormData({ ...formData, parkingInfo: e.target.value })}
                  />
                </div>

                <div className="col-span-2">
                  <label className="label">Notes</label>
                  <textarea
                    className="input"
                    rows="2"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingVenue(null); }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingVenue ? 'Update Venue' : 'Add Venue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Detail Modal */}
      {selectedVenue && (
        <div className="modal-overlay" onClick={() => setSelectedVenue(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">{selectedVenue.name}</h2>
              <button
                onClick={() => setSelectedVenue(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="font-medium">{selectedVenue.address}</p>
                  <p className="text-gray-600">{selectedVenue.city}, {selectedVenue.state} {selectedVenue.zipCode}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Capacity</p>
                  <p className="font-medium">{selectedVenue.capacity} guests</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Kitchen</p>
                  <div className="flex items-center gap-2">
                    {selectedVenue.hasKitchen ? (
                      <CheckCircle className="text-green-500" size={16} />
                    ) : (
                      <XCircle className="text-gray-400" size={16} />
                    )}
                    <p className="font-medium">{selectedVenue.hasKitchen ? 'Yes' : 'No'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Events Hosted</p>
                  <p className="font-medium">{selectedVenue._count?.events || 0}</p>
                </div>
              </div>
              {selectedVenue.contactName && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500 mb-2">Contact Information</p>
                  <p className="font-medium">{selectedVenue.contactName}</p>
                  {selectedVenue.contactPhone && (
                    <div className="flex items-center gap-2 text-gray-600 mt-1">
                      <Phone size={14} />
                      {selectedVenue.contactPhone}
                    </div>
                  )}
                  {selectedVenue.contactEmail && (
                    <div className="flex items-center gap-2 text-gray-600 mt-1">
                      <Mail size={14} />
                      {selectedVenue.contactEmail}
                    </div>
                  )}
                </div>
              )}
              {selectedVenue.parkingInfo && (
                <div>
                  <p className="text-sm text-gray-500">Parking</p>
                  <p className="text-gray-700">{selectedVenue.parkingInfo}</p>
                </div>
              )}
              {selectedVenue.notes && (
                <div>
                  <p className="text-sm text-gray-500">Notes</p>
                  <p className="text-gray-700">{selectedVenue.notes}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setSelectedVenue(null)}
                className="btn btn-secondary"
              >
                Close
              </button>
              <button
                onClick={() => handleDelete(selectedVenue.id)}
                className="btn btn-danger flex items-center gap-2"
              >
                <Trash2 size={16} />
                Delete
              </button>
              <button
                onClick={() => { handleEdit(selectedVenue); setSelectedVenue(null); }}
                className="btn btn-primary flex items-center gap-2"
              >
                <Edit size={16} />
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Update Modal */}
      {showBulkUpdateModal && (
        <div className="modal-overlay" onClick={() => setShowBulkUpdateModal(false)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Bulk Update ({selectedIds.length} venues)
              </h2>
              <button
                onClick={() => setShowBulkUpdateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleBulkUpdate} className="p-6 space-y-4">
              <div>
                <label className="label">Has Kitchen</label>
                <select
                  className="select"
                  value={bulkUpdateData.hasKitchen}
                  onChange={(e) => setBulkUpdateData({ ...bulkUpdateData, hasKitchen: e.target.value })}
                >
                  <option value="">-- No Change --</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowBulkUpdateModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update {selectedIds.length} Venue(s)
                </button>
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
        variant="danger"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} })}
      />
    </div>
  );
}
