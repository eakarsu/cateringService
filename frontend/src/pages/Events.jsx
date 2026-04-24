import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import { SkeletonGrid } from '../components/SkeletonLoader';
import {
  Plus, Search, Calendar, MapPin, Users, Eye, Edit, Trash2,
  ArrowUpDown, Download, CheckSquare, Square, X
} from 'lucide-react';

export default function Events() {
  const navigate = useNavigate();
  const toast = useToast();
  const [events, setEvents] = useState([]);
  const [venues, setVenues] = useState([]);
  const [clients, setClients] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [eventStatuses, setEventStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [formData, setFormData] = useState({
    name: '', eventType: 'CORPORATE', date: '', startTime: '', endTime: '',
    guestCount: '', clientId: '', venueId: '', notes: '', setupRequirements: '', equipmentNeeds: ''
  });
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => { loadData(); }, [statusFilter, page, limit, sortBy, sortOrder]);

  const loadData = async () => {
    try {
      const [eventsRes, venuesRes, clientsRes, typesRes, statusesRes] = await Promise.all([
        api.get('/events', { params: { status: statusFilter || undefined, page, limit, sortBy, sortOrder, search: searchTerm || undefined } }),
        api.get('/venues'),
        api.get('/auth/clients'),
        api.get('/events/options/types'),
        api.get('/events/options/statuses')
      ]);
      setEvents(eventsRes.data.data || eventsRes.data);
      if (eventsRes.data.pagination) setPagination(eventsRes.data.pagination);
      setVenues(venuesRes.data.data || venuesRes.data);
      setClients(clientsRes.data);
      setEventTypes(typesRes.data);
      setEventStatuses(statusesRes.data);
    } catch (error) {
      console.error('Failed to load events:', error);
      toast?.error('Failed to load events');
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
    if (!formData.name.trim()) errs.name = 'Event name is required';
    if (!formData.date) errs.date = 'Date is required';
    if (!formData.startTime) errs.startTime = 'Start time is required';
    if (!formData.endTime) errs.endTime = 'End time is required';
    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) errs.endTime = 'End time must be after start time';
    if (!formData.guestCount || parseInt(formData.guestCount) < 1) errs.guestCount = 'At least 1 guest required';
    if (!formData.clientId) errs.clientId = 'Client is required';
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateForm()) return;
    try {
      const payload = { ...formData, startTime: `${formData.date}T${formData.startTime}`, endTime: `${formData.date}T${formData.endTime}` };
      if (editingEvent) {
        await api.put(`/events/${editingEvent.id}`, payload);
        toast?.success('Event updated successfully');
      } else {
        await api.post('/events', payload);
        toast?.success('Event created successfully');
      }
      setShowModal(false);
      setEditingEvent(null);
      resetForm();
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save event');
      toast?.error('Failed to save event');
    }
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setFormData({
      name: event.name, eventType: event.eventType,
      date: format(new Date(event.date), 'yyyy-MM-dd'),
      startTime: format(new Date(event.startTime), 'HH:mm'),
      endTime: format(new Date(event.endTime), 'HH:mm'),
      guestCount: event.guestCount.toString(), clientId: event.clientId,
      venueId: event.venueId || '', notes: event.notes || '',
      setupRequirements: event.setupRequirements || '', equipmentNeeds: event.equipmentNeeds || ''
    });
    setValidationErrors({});
    setShowModal(true);
  };

  const handleDelete = (id) => {
    setConfirmDialog({
      isOpen: true, title: 'Delete Event',
      message: 'Are you sure you want to delete this event? This action cannot be undone.',
      confirmLabel: 'Delete', variant: 'danger',
      onConfirm: async () => {
        try { await api.delete(`/events/${id}`); toast?.success('Event deleted'); loadData(); }
        catch { toast?.error('Failed to delete event'); }
        setConfirmDialog({ isOpen: false });
      },
      onCancel: () => setConfirmDialog({ isOpen: false })
    });
  };

  const handleBulkDelete = () => {
    if (!selectedIds.length) return;
    setConfirmDialog({
      isOpen: true, title: 'Delete Selected Events',
      message: `Are you sure you want to delete ${selectedIds.length} events? This cannot be undone.`,
      confirmLabel: 'Delete All', variant: 'danger',
      onConfirm: async () => {
        try { await api.post('/events/bulk-delete', { ids: selectedIds }); toast?.success(`${selectedIds.length} events deleted`); setSelectedIds([]); loadData(); }
        catch { toast?.error('Failed to delete events'); }
        setConfirmDialog({ isOpen: false });
      },
      onCancel: () => setConfirmDialog({ isOpen: false })
    });
  };

  const handleBulkStatusUpdate = async (status) => {
    if (!selectedIds.length) return;
    try {
      await api.put('/events/bulk-update', { ids: selectedIds, data: { status } });
      toast?.success(`${selectedIds.length} events updated to ${status}`);
      setSelectedIds([]);
      loadData();
    } catch { toast?.error('Failed to update events'); }
  };

  const exportPDF = async () => {
    try {
      const res = await api.get('/events/export/pdf');
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text(res.data.title, 14, 22);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
      autoTable(doc, {
        startY: 35, head: [res.data.columns],
        body: res.data.rows.map(r => [r.name, r.type, new Date(r.date).toLocaleDateString(), r.guestCount, r.status, r.client, r.venue]),
        theme: 'striped', headStyles: { fillColor: [79, 70, 229] }
      });
      doc.save('events-report.pdf');
      toast?.success('PDF exported');
    } catch { toast?.error('Failed to export PDF'); }
  };

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleSelectAll = () => setSelectedIds(prev => prev.length === events.length ? [] : events.map(e => e.id));

  const handleSort = (field) => {
    if (sortBy === field) setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('asc'); }
  };

  const resetForm = () => {
    setFormData({ name: '', eventType: 'CORPORATE', date: '', startTime: '', endTime: '', guestCount: '', clientId: '', venueId: '', notes: '', setupRequirements: '', equipmentNeeds: '' });
    setValidationErrors({});
  };

  const getStatusBadge = (status) => {
    const badges = { INQUIRY: 'badge-info', PROPOSAL_SENT: 'badge-warning', CONFIRMED: 'badge-success', IN_PROGRESS: 'badge-info', COMPLETED: 'badge-gray', CANCELLED: 'badge-danger' };
    return badges[status] || 'badge-gray';
  };

  if (loading) return <SkeletonGrid count={6} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="text-gray-500">Manage your catering events</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportPDF} className="btn btn-secondary flex items-center gap-2"><Download size={18} /> PDF</button>
          <button onClick={() => { resetForm(); setEditingEvent(null); setError(''); setShowModal(true); }} className="btn btn-primary flex items-center gap-2"><Plus size={20} /> New Event</button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="card">
        <div className="flex flex-wrap gap-4">
          <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" size={20} />
              <input type="text" placeholder="Search events..." className="input" style={{ paddingLeft: '2.5rem' }} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onBlur={handleSearch} />
            </div>
          </form>
          <select className="select w-48" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            {eventStatuses.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
          <button onClick={() => handleSort(sortBy === 'date' ? 'name' : 'date')} className="btn btn-secondary flex items-center gap-1">
            <ArrowUpDown size={16} /> {sortBy} {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="card bg-indigo-50 border-indigo-200 flex items-center gap-4">
          <span className="text-sm font-medium text-indigo-700">{selectedIds.length} selected</span>
          <button onClick={handleBulkDelete} className="btn btn-danger text-sm py-1">Delete Selected</button>
          <select className="select w-auto text-sm py-1" defaultValue="" onChange={(e) => { if (e.target.value) handleBulkStatusUpdate(e.target.value); e.target.value = ''; }}>
            <option value="">Change Status...</option>
            {eventStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button onClick={() => setSelectedIds([])} className="ml-auto text-gray-500 hover:text-gray-700"><X size={18} /></button>
        </div>
      )}

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map((event) => (
          <div key={event.id} className={`card hover:shadow-md transition-shadow cursor-pointer ${selectedIds.includes(event.id) ? 'ring-2 ring-indigo-500' : ''}`} onClick={() => setSelectedEvent(event)}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div onClick={(e) => { e.stopPropagation(); toggleSelect(event.id); }} className="cursor-pointer">
                  {selectedIds.includes(event.id) ? <CheckSquare className="text-indigo-600" size={18} /> : <Square className="text-gray-400" size={18} />}
                </div>
                <span className={`badge ${getStatusBadge(event.status)}`}>{event.status.replace('_', ' ')}</span>
              </div>
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <Link to={`/events/${event.id}`} className="p-1 text-gray-400 hover:text-indigo-600"><Eye size={18} /></Link>
                <button onClick={() => handleEdit(event)} className="p-1 text-gray-400 hover:text-indigo-600"><Edit size={18} /></button>
                <button onClick={() => handleDelete(event.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={18} /></button>
              </div>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">{event.name}</h3>
            <div className="space-y-2 text-sm text-gray-500">
              <div className="flex items-center gap-2"><Calendar size={16} />{format(new Date(event.date), 'MMM d, yyyy')}</div>
              <div className="flex items-center gap-2"><Users size={16} />{event.guestCount} guests</div>
              {event.venue && <div className="flex items-center gap-2"><MapPin size={16} />{event.venue.name}</div>}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-sm text-gray-600">Client: <span className="font-medium">{event.client?.name}</span></p>
            </div>
          </div>
        ))}
      </div>

      {events.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No events found</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new event.</p>
        </div>
      )}

      <Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} limit={limit} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} />

      {/* Detail Modal */}
      {selectedEvent && !showModal && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">{selectedEvent.name}</h2>
                <span className={`badge ${getStatusBadge(selectedEvent.status)}`}>{selectedEvent.status.replace('_', ' ')}</span>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-gray-500">Type</p><p className="font-medium">{selectedEvent.eventType}</p></div>
                <div><p className="text-sm text-gray-500">Date</p><p className="font-medium">{format(new Date(selectedEvent.date), 'MMM d, yyyy')}</p></div>
                <div><p className="text-sm text-gray-500">Time</p><p className="font-medium">{format(new Date(selectedEvent.startTime), 'h:mm a')} - {format(new Date(selectedEvent.endTime), 'h:mm a')}</p></div>
                <div><p className="text-sm text-gray-500">Guests</p><p className="font-medium">{selectedEvent.guestCount}</p></div>
                <div><p className="text-sm text-gray-500">Client</p><p className="font-medium">{selectedEvent.client?.name}</p></div>
                {selectedEvent.venue && <div><p className="text-sm text-gray-500">Venue</p><p className="font-medium">{selectedEvent.venue?.name}</p></div>}
              </div>
              {selectedEvent.notes && <div><p className="text-sm text-gray-500">Notes</p><p className="text-gray-700">{selectedEvent.notes}</p></div>}
              {selectedEvent.setupRequirements && <div><p className="text-sm text-gray-500">Setup Requirements</p><p className="text-gray-700">{selectedEvent.setupRequirements}</p></div>}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setSelectedEvent(null)} className="btn btn-secondary">Close</button>
              <button onClick={() => handleDelete(selectedEvent.id)} className="btn btn-danger">Delete</button>
              <button onClick={() => { handleEdit(selectedEvent); setSelectedEvent(null); }} className="btn btn-primary">Edit</button>
              <button onClick={() => { setSelectedEvent(null); navigate(`/events/${selectedEvent.id}`); }} className="btn btn-primary">View Full Details</button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">{editingEvent ? 'Edit Event' : 'New Event'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Event Name *</label>
                  <input type="text" className={`input ${validationErrors.name ? 'border-red-500' : ''}`} value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                  {validationErrors.name && <p className="text-xs text-red-600 mt-1">{validationErrors.name}</p>}
                </div>
                <div>
                  <label className="label">Event Type *</label>
                  <select className="select" value={formData.eventType} onChange={(e) => setFormData({...formData, eventType: e.target.value})} required>
                    {eventTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Guest Count *</label>
                  <input type="number" className={`input ${validationErrors.guestCount ? 'border-red-500' : ''}`} value={formData.guestCount} onChange={(e) => setFormData({...formData, guestCount: e.target.value})} required min="1" />
                  {validationErrors.guestCount && <p className="text-xs text-red-600 mt-1">{validationErrors.guestCount}</p>}
                </div>
                <div>
                  <label className="label">Date *</label>
                  <input type="date" className={`input ${validationErrors.date ? 'border-red-500' : ''}`} value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} required />
                  {validationErrors.date && <p className="text-xs text-red-600 mt-1">{validationErrors.date}</p>}
                </div>
                <div>
                  <label className="label">Client *</label>
                  <select className={`select ${validationErrors.clientId ? 'border-red-500' : ''}`} value={formData.clientId} onChange={(e) => setFormData({...formData, clientId: e.target.value})} required>
                    <option value="">Select Client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {validationErrors.clientId && <p className="text-xs text-red-600 mt-1">{validationErrors.clientId}</p>}
                </div>
                <div>
                  <label className="label">Start Time *</label>
                  <input type="time" className={`input ${validationErrors.startTime ? 'border-red-500' : ''}`} value={formData.startTime} onChange={(e) => setFormData({...formData, startTime: e.target.value})} required />
                  {validationErrors.startTime && <p className="text-xs text-red-600 mt-1">{validationErrors.startTime}</p>}
                </div>
                <div>
                  <label className="label">End Time *</label>
                  <input type="time" className={`input ${validationErrors.endTime ? 'border-red-500' : ''}`} value={formData.endTime} onChange={(e) => setFormData({...formData, endTime: e.target.value})} required />
                  {validationErrors.endTime && <p className="text-xs text-red-600 mt-1">{validationErrors.endTime}</p>}
                </div>
                <div className="col-span-2">
                  <label className="label">Venue</label>
                  <select className="select" value={formData.venueId} onChange={(e) => setFormData({...formData, venueId: e.target.value})}>
                    <option value="">Select Venue (Optional)</option>
                    {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2"><label className="label">Notes</label><textarea className="input" rows="2" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} /></div>
                <div><label className="label">Setup Requirements</label><textarea className="input" rows="2" value={formData.setupRequirements} onChange={(e) => setFormData({...formData, setupRequirements: e.target.value})} /></div>
                <div><label className="label">Equipment Needs</label><textarea className="input" rows="2" value={formData.equipmentNeeds} onChange={(e) => setFormData({...formData, equipmentNeeds: e.target.value})} /></div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => { setShowModal(false); setEditingEvent(null); }} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingEvent ? 'Update Event' : 'Create Event'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog {...confirmDialog} />
    </div>
  );
}
