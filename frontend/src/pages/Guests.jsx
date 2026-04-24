import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import {
  Plus, Users, Search, Filter, Download, Upload, Edit, Trash2, X,
  Check, AlertTriangle, ArrowUpDown, CheckSquare, Square, FileText
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import { SkeletonTable } from '../components/SkeletonLoader';
import { useToast } from '../context/ToastContext';

export default function Guests() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const eventIdParam = searchParams.get('eventId');

  const [guests, setGuests] = useState([]);
  const [events, setEvents] = useState([]);
  const [dietarySummary, setDietarySummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState(eventIdParam || '');
  const [showModal, setShowModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDietary, setFilterDietary] = useState('');
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState({});

  // Sort
  const [sort, setSort] = useState({ field: 'name', dir: 'asc' });

  // Pagination
  const [page, setPage] = useState(1);
  const pageLimit = 25;

  // Bulk select
  const [selected, setSelected] = useState([]);

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Detail modal
  const [detailGuest, setDetailGuest] = useState(null);

  // Bulk RSVP
  const [showBulkRsvp, setShowBulkRsvp] = useState(false);
  const [bulkRsvpStatus, setBulkRsvpStatus] = useState('CONFIRMED');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    isDairyFree: false,
    isNutFree: false,
    otherAllergies: '',
    mealPreference: '',
    notes: '',
    rsvpStatus: 'PENDING'
  });

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadGuests();
      loadDietarySummary();
    }
  }, [selectedEventId]);

  const extractArray = (data) => {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    return [];
  };

  const loadEvents = async () => {
    try {
      const res = await api.get('/events');
      const evts = extractArray(res.data);
      setEvents(evts);
      if (eventIdParam && evts.find(e => e.id === eventIdParam)) {
        setSelectedEventId(eventIdParam);
      } else if (evts.length > 0 && !eventIdParam) {
        setSelectedEventId(evts[0].id);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
      toast?.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const loadGuests = async () => {
    try {
      const res = await api.get(`/guests/event/${selectedEventId}`);
      setGuests(extractArray(res.data));
    } catch (err) {
      console.error('Failed to load guests:', err);
      toast?.error('Failed to load guests');
    }
  };

  const loadDietarySummary = async () => {
    try {
      const res = await api.get(`/guests/event/${selectedEventId}/dietary-summary`);
      setDietarySummary(res.data);
    } catch (err) {
      console.error('Failed to load dietary summary:', err);
    }
  };

  // --- Sort ---
  const sortItems = (items) => {
    return [...items].sort((a, b) => {
      let aVal, bVal;
      if (sort.field === 'name') { aVal = (a.name || '').toLowerCase(); bVal = (b.name || '').toLowerCase(); }
      else if (sort.field === 'email') { aVal = (a.email || '').toLowerCase(); bVal = (b.email || '').toLowerCase(); }
      else if (sort.field === 'rsvpStatus') { aVal = a.rsvpStatus || ''; bVal = b.rsvpStatus || ''; }
      else { aVal = a[sort.field]; bVal = b[sort.field]; }
      if (aVal < bVal) return sort.dir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const toggleSort = (field) => {
    setSort(prev => ({ field, dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc' }));
  };

  // --- Filtered + sorted + paginated ---
  const filteredGuests = useMemo(() => {
    let items = guests.filter(guest => {
      const matchesSearch = (guest.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (guest.email || '').toLowerCase().includes(searchTerm.toLowerCase());

      if (!filterDietary) return matchesSearch;

      const dietaryFilters = {
        vegetarian: guest.isVegetarian,
        vegan: guest.isVegan,
        'gluten-free': guest.isGlutenFree,
        'dairy-free': guest.isDairyFree,
        'nut-free': guest.isNutFree,
        allergies: !!guest.otherAllergies
      };
      return matchesSearch && dietaryFilters[filterDietary];
    });
    return sortItems(items);
  }, [guests, searchTerm, filterDietary, sort]);

  const paginatedGuests = useMemo(() => {
    const start = (page - 1) * pageLimit;
    return filteredGuests.slice(start, start + pageLimit);
  }, [filteredGuests, page]);

  // --- Bulk select ---
  const toggleSelectAll = () => {
    const ids = filteredGuests.map(g => g.id);
    if (ids.every(id => selected.includes(id))) {
      setSelected([]);
    } else {
      setSelected(ids);
    }
  };

  const toggleSelectOne = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // --- Bulk delete ---
  const handleBulkDelete = () => {
    if (selected.length === 0) return;
    setConfirmDialog({
      isOpen: true,
      title: `Delete ${selected.length} guest(s)?`,
      message: `This will permanently delete ${selected.length} selected guest(s). This action cannot be undone.`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          await Promise.all(selected.map(id => api.delete(`/guests/${id}`)));
          setSelected([]);
          toast?.success(`${selected.length} guest(s) deleted successfully`);
          loadGuests();
          loadDietarySummary();
        } catch (err) {
          console.error('Bulk delete failed:', err);
          toast?.error('Failed to delete some guests');
        }
      }
    });
  };

  // --- Bulk RSVP update ---
  const handleBulkRsvpUpdate = async () => {
    if (selected.length === 0) return;
    try {
      await Promise.all(selected.map(id => api.put(`/guests/${id}`, { rsvpStatus: bulkRsvpStatus })));
      setSelected([]);
      setShowBulkRsvp(false);
      toast?.success(`RSVP status updated for ${selected.length} guest(s)`);
      loadGuests();
      loadDietarySummary();
    } catch (err) {
      console.error('Bulk RSVP update failed:', err);
      toast?.error('Failed to update RSVP for some guests');
    }
  };

  // --- PDF export ---
  const exportPDF = () => {
    const doc = new jsPDF();
    const eventName = events.find(e => e.id === selectedEventId)?.name || 'Guest List';
    doc.setFontSize(16);
    doc.text(`Guest List - ${eventName}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Exported: ${format(new Date(), 'MMM d, yyyy h:mm a')}`, 14, 28);
    doc.text(`Total: ${filteredGuests.length} guest(s)`, 14, 34);

    autoTable(doc, {
      startY: 42,
      head: [['Name', 'Email', 'Phone', 'RSVP', 'Dietary', 'Meal Preference']],
      body: filteredGuests.map(g => {
        const dietary = [];
        if (g.isVegetarian) dietary.push('Vegetarian');
        if (g.isVegan) dietary.push('Vegan');
        if (g.isGlutenFree) dietary.push('GF');
        if (g.isDairyFree) dietary.push('DF');
        if (g.isNutFree) dietary.push('NF');
        if (g.otherAllergies) dietary.push(g.otherAllergies);
        return [
          g.name, g.email || '-', g.phone || '-', g.rsvpStatus,
          dietary.join(', ') || 'None', g.mealPreference || '-'
        ];
      }),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] }
    });
    doc.save(`guest_list_${eventName.replace(/\s+/g, '_').toLowerCase()}.pdf`);
    toast?.success('PDF exported successfully');
  };

  // --- Form validation ---
  const validateForm = () => {
    const errors = {};
    if (!formData.name?.trim()) errors.name = 'Name is required';
    if (formData.name && formData.name.trim().length < 2) errors.name = 'Name must be at least 2 characters';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Invalid email format';
    if (formData.phone && !/^[\d\s\-+()]*$/.test(formData.phone)) errors.phone = 'Invalid phone format';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setError('');

    if (!selectedEventId) {
      setError('Please select an event first');
      return;
    }

    try {
      if (editingGuest) {
        await api.put(`/guests/${editingGuest.id}`, formData);
        toast?.success('Guest updated successfully');
      } else {
        await api.post('/guests', { ...formData, eventId: selectedEventId });
        toast?.success('Guest added successfully');
      }
      setShowModal(false);
      setEditingGuest(null);
      resetForm();
      loadGuests();
      loadDietarySummary();
    } catch (err) {
      console.error('Error saving guest:', err);
      setError(err.response?.data?.error || 'Failed to save guest. Please try again.');
      toast?.error('Failed to save guest');
    }
  };

  const handleEdit = (guest) => {
    setEditingGuest(guest);
    setFormErrors({});
    setFormData({
      name: guest.name,
      email: guest.email || '',
      phone: guest.phone || '',
      isVegetarian: guest.isVegetarian,
      isVegan: guest.isVegan,
      isGlutenFree: guest.isGlutenFree,
      isDairyFree: guest.isDairyFree,
      isNutFree: guest.isNutFree,
      otherAllergies: guest.otherAllergies || '',
      mealPreference: guest.mealPreference || '',
      notes: guest.notes || '',
      rsvpStatus: guest.rsvpStatus
    });
    setShowModal(true);
    setDetailGuest(null);
  };

  const handleDelete = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Guest',
      message: 'Are you sure you want to delete this guest? This action cannot be undone.',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          await api.delete(`/guests/${id}`);
          setDetailGuest(null);
          toast?.success('Guest deleted');
          loadGuests();
          loadDietarySummary();
        } catch (err) {
          console.error('Failed to delete guest:', err);
          toast?.error('Failed to delete guest');
        }
      }
    });
  };

  const resetForm = () => {
    setFormData({
      name: '', email: '', phone: '',
      isVegetarian: false, isVegan: false, isGlutenFree: false, isDairyFree: false, isNutFree: false,
      otherAllergies: '', mealPreference: '', notes: '', rsvpStatus: 'PENDING'
    });
    setFormErrors({});
  };

  const getRsvpBadge = (status) => {
    const badges = { PENDING: 'badge-warning', CONFIRMED: 'badge-success', DECLINED: 'badge-danger', MAYBE: 'badge-info' };
    return badges[status] || 'badge-gray';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Guest Management</h1>
            <p className="text-gray-500">Manage guests and dietary restrictions</p>
          </div>
        </div>
        <SkeletonTable rows={8} cols={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Guest Management</h1>
          <p className="text-gray-500">Manage guests and dietary restrictions</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportPDF} className="btn btn-secondary flex items-center gap-2" disabled={!selectedEventId || filteredGuests.length === 0}>
            <FileText size={20} /> PDF
          </button>
          <button
            onClick={() => { resetForm(); setEditingGuest(null); setError(''); setShowModal(true); }}
            className="btn btn-primary flex items-center gap-2"
            disabled={!selectedEventId}
          >
            <Plus size={20} /> Add Guest
          </button>
        </div>
      </div>

      {/* Event Selector + Search + Filter + Sort */}
      <div className="card">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="label">Select Event</label>
            <select className="select" value={selectedEventId} onChange={(e) => { setSelectedEventId(e.target.value); setPage(1); setSelected([]); }}>
              <option value="">Select an event</option>
              {events.map(event => <option key={event.id} value={event.id}>{event.name}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="label">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" size={18} />
              <input type="text" placeholder="Search by name, email..." className="input pl-10" value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} />
            </div>
          </div>
          <div className="w-48">
            <label className="label">Filter by Dietary</label>
            <select className="select" value={filterDietary} onChange={(e) => { setFilterDietary(e.target.value); setPage(1); }}>
              <option value="">All Guests</option>
              <option value="vegetarian">Vegetarian</option>
              <option value="vegan">Vegan</option>
              <option value="gluten-free">Gluten-Free</option>
              <option value="dairy-free">Dairy-Free</option>
              <option value="nut-free">Nut-Free</option>
              <option value="allergies">Has Allergies</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => toggleSort('name')} className="flex items-center gap-1 text-sm text-gray-600 hover:text-indigo-600 py-2 px-3 rounded-lg border border-gray-200">
              Name <ArrowUpDown size={14} className={sort.field === 'name' ? 'text-indigo-600' : 'text-gray-400'} />
            </button>
            <button onClick={() => toggleSort('rsvpStatus')} className="flex items-center gap-1 text-sm text-gray-600 hover:text-indigo-600 py-2 px-3 rounded-lg border border-gray-200">
              RSVP <ArrowUpDown size={14} className={sort.field === 'rsvpStatus' ? 'text-indigo-600' : 'text-gray-400'} />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selected.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm text-indigo-700 font-medium">{selected.length} guest(s) selected</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowBulkRsvp(true)} className="btn btn-secondary text-sm py-1 px-3 flex items-center gap-1">
              <Check size={14} /> Update RSVP
            </button>
            <button onClick={handleBulkDelete} className="btn btn-danger text-sm py-1 px-3 flex items-center gap-1">
              <Trash2 size={14} /> Delete ({selected.length})
            </button>
          </div>
        </div>
      )}

      {/* Dietary Summary */}
      {dietarySummary && selectedEventId && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="card bg-gray-50"><p className="text-2xl font-bold text-gray-900">{dietarySummary.total}</p><p className="text-sm text-gray-500">Total Guests</p></div>
          <div className="card bg-green-50"><p className="text-2xl font-bold text-green-600">{dietarySummary.rsvpConfirmed}</p><p className="text-sm text-gray-500">Confirmed</p></div>
          <div className="card bg-yellow-50"><p className="text-2xl font-bold text-yellow-600">{dietarySummary.vegetarian}</p><p className="text-sm text-gray-500">Vegetarian</p></div>
          <div className="card bg-green-50"><p className="text-2xl font-bold text-green-600">{dietarySummary.vegan}</p><p className="text-sm text-gray-500">Vegan</p></div>
          <div className="card bg-orange-50"><p className="text-2xl font-bold text-orange-600">{dietarySummary.glutenFree}</p><p className="text-sm text-gray-500">Gluten-Free</p></div>
          <div className="card bg-red-50"><p className="text-2xl font-bold text-red-600">{dietarySummary.withAllergies}</p><p className="text-sm text-gray-500">With Allergies</p></div>
        </div>
      )}

      {/* Guests Table */}
      {selectedEventId ? (
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>
                  <button onClick={toggleSelectAll} className="text-gray-500 hover:text-indigo-600">
                    {filteredGuests.length > 0 && filteredGuests.every(g => selected.includes(g.id)) ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                </th>
                <th>Name</th>
                <th>Email</th>
                <th>RSVP</th>
                <th>Dietary Restrictions</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedGuests.map((guest) => (
                <tr key={guest.id} className={`hover:bg-gray-50 cursor-pointer ${selected.includes(guest.id) ? 'bg-indigo-50' : ''}`} onClick={() => setDetailGuest(guest)}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => toggleSelectOne(guest.id)} className="text-gray-400 hover:text-indigo-600">
                      {selected.includes(guest.id) ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} />}
                    </button>
                  </td>
                  <td className="font-medium">{guest.name}</td>
                  <td>{guest.email || '-'}</td>
                  <td><span className={`badge ${getRsvpBadge(guest.rsvpStatus)}`}>{guest.rsvpStatus}</span></td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {guest.isVegetarian && <span className="badge badge-success text-xs">Vegetarian</span>}
                      {guest.isVegan && <span className="badge badge-success text-xs">Vegan</span>}
                      {guest.isGlutenFree && <span className="badge badge-warning text-xs">GF</span>}
                      {guest.isDairyFree && <span className="badge badge-info text-xs">DF</span>}
                      {guest.isNutFree && <span className="badge badge-danger text-xs">NF</span>}
                      {guest.otherAllergies && (
                        <span className="badge badge-danger text-xs" title={guest.otherAllergies}>
                          <AlertTriangle size={12} className="mr-1" /> Allergies
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="max-w-xs truncate">{guest.notes || '-'}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(guest)} className="text-gray-400 hover:text-indigo-600"><Edit size={18} /></button>
                      <button onClick={() => handleDelete(guest.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredGuests.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No guests found</h3>
              <p className="mt-1 text-sm text-gray-500">Add guests to this event or adjust your search.</p>
            </div>
          )}
          <Pagination page={page} totalPages={Math.ceil(filteredGuests.length / pageLimit)} total={filteredGuests.length} limit={pageLimit} onPageChange={setPage} />
        </div>
      ) : (
        <div className="card text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Select an event</h3>
          <p className="mt-1 text-sm text-gray-500">Choose an event to manage its guests.</p>
        </div>
      )}

      {/* Guest Detail Modal */}
      {detailGuest && !showModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">{detailGuest.name}</h2>
                <button onClick={() => setDetailGuest(null)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-gray-500">Email</p><p className="font-medium">{detailGuest.email || 'Not provided'}</p></div>
                <div><p className="text-sm text-gray-500">Phone</p><p className="font-medium">{detailGuest.phone || 'Not provided'}</p></div>
                <div>
                  <p className="text-sm text-gray-500">RSVP Status</p>
                  <span className={`badge ${getRsvpBadge(detailGuest.rsvpStatus)}`}>{detailGuest.rsvpStatus}</span>
                </div>
                <div><p className="text-sm text-gray-500">Meal Preference</p><p className="font-medium">{detailGuest.mealPreference || 'None specified'}</p></div>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-2">Dietary Restrictions</p>
                <div className="flex flex-wrap gap-2">
                  {detailGuest.isVegetarian && <span className="badge badge-success">Vegetarian</span>}
                  {detailGuest.isVegan && <span className="badge badge-success">Vegan</span>}
                  {detailGuest.isGlutenFree && <span className="badge badge-warning">Gluten-Free</span>}
                  {detailGuest.isDairyFree && <span className="badge badge-info">Dairy-Free</span>}
                  {detailGuest.isNutFree && <span className="badge badge-danger">Nut-Free</span>}
                  {!detailGuest.isVegetarian && !detailGuest.isVegan && !detailGuest.isGlutenFree && !detailGuest.isDairyFree && !detailGuest.isNutFree && !detailGuest.otherAllergies && (
                    <span className="text-gray-500 text-sm">No dietary restrictions</span>
                  )}
                </div>
              </div>

              {detailGuest.otherAllergies && (
                <div>
                  <p className="text-sm text-gray-500">Other Allergies</p>
                  <div className="mt-1 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700">
                      <AlertTriangle size={16} />
                      <span className="font-medium">{detailGuest.otherAllergies}</span>
                    </div>
                  </div>
                </div>
              )}

              {detailGuest.notes && (
                <div><p className="text-sm text-gray-500">Notes</p><p className="text-gray-700">{detailGuest.notes}</p></div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-between">
              <button onClick={() => handleDelete(detailGuest.id)} className="btn btn-danger flex items-center gap-1"><Trash2 size={16} /> Delete</button>
              <div className="flex gap-3">
                <button onClick={() => setDetailGuest(null)} className="btn btn-secondary">Close</button>
                <button onClick={() => handleEdit(detailGuest)} className="btn btn-primary flex items-center gap-1"><Edit size={16} /> Edit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Guest Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-2xl">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingGuest ? 'Edit Guest' : 'Add Guest'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Name *</label>
                  <input type="text" className={`input ${formErrors.name ? 'border-red-500' : ''}`} value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" className={`input ${formErrors.email ? 'border-red-500' : ''}`} value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                  {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input type="tel" className={`input ${formErrors.phone ? 'border-red-500' : ''}`} value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                  {formErrors.phone && <p className="text-red-500 text-xs mt-1">{formErrors.phone}</p>}
                </div>
                <div>
                  <label className="label">RSVP Status</label>
                  <select className="select" value={formData.rsvpStatus} onChange={(e) => setFormData({ ...formData, rsvpStatus: e.target.value })}>
                    <option value="PENDING">Pending</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="DECLINED">Declined</option>
                    <option value="MAYBE">Maybe</option>
                  </select>
                </div>
                <div>
                  <label className="label">Meal Preference</label>
                  <input type="text" className="input" placeholder="e.g., Chicken, Fish" value={formData.mealPreference}
                    onChange={(e) => setFormData({ ...formData, mealPreference: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="label">Dietary Restrictions</label>
                <div className="grid grid-cols-3 gap-4 mt-2">
                  {[
                    { key: 'isVegetarian', label: 'Vegetarian' },
                    { key: 'isVegan', label: 'Vegan' },
                    { key: 'isGlutenFree', label: 'Gluten-Free' },
                    { key: 'isDairyFree', label: 'Dairy-Free' },
                    { key: 'isNutFree', label: 'Nut-Free' }
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData[key]} onChange={(e) => setFormData({ ...formData, [key]: e.target.checked })}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Other Allergies</label>
                <input type="text" className="input" placeholder="e.g., Shellfish, Sesame" value={formData.otherAllergies}
                  onChange={(e) => setFormData({ ...formData, otherAllergies: e.target.value })} />
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea className="input" rows="2" value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => { setShowModal(false); setEditingGuest(null); }} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingGuest ? 'Update Guest' : 'Add Guest'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk RSVP Modal */}
      {showBulkRsvp && (
        <div className="modal-overlay">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Update RSVP Status</h3>
            <p className="text-sm text-gray-500 mb-4">Set RSVP status for {selected.length} selected guest(s).</p>
            <select className="select mb-4" value={bulkRsvpStatus} onChange={(e) => setBulkRsvpStatus(e.target.value)}>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="DECLINED">Declined</option>
              <option value="MAYBE">Maybe</option>
            </select>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowBulkRsvp(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleBulkRsvpUpdate} className="btn btn-primary">Update</button>
            </div>
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
