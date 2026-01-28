import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { format } from 'date-fns';
import { Plus, Search, Filter, Calendar, MapPin, Users, Eye, Edit, Trash2 } from 'lucide-react';

export default function Events() {
  const navigate = useNavigate();
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
  const [formData, setFormData] = useState({
    name: '',
    eventType: 'CORPORATE',
    date: '',
    startTime: '',
    endTime: '',
    guestCount: '',
    clientId: '',
    venueId: '',
    notes: '',
    setupRequirements: '',
    equipmentNeeds: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    try {
      const [eventsRes, venuesRes, clientsRes, typesRes, statusesRes] = await Promise.all([
        api.get('/events', { params: { status: statusFilter || undefined } }),
        api.get('/venues'),
        api.get('/auth/clients'),
        api.get('/events/options/types'),
        api.get('/events/options/statuses')
      ]);
      setEvents(eventsRes.data);
      setVenues(venuesRes.data);
      setClients(clientsRes.data);
      setEventTypes(typesRes.data);
      setEventStatuses(statusesRes.data);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        ...formData,
        startTime: `${formData.date}T${formData.startTime}`,
        endTime: `${formData.date}T${formData.endTime}`
      };

      if (editingEvent) {
        await api.put(`/events/${editingEvent.id}`, payload);
      } else {
        await api.post('/events', payload);
      }
      setShowModal(false);
      setEditingEvent(null);
      resetForm();
      loadData();
    } catch (err) {
      console.error('Failed to save event:', err);
      setError(err.response?.data?.error || 'Failed to save event. Please try again.');
    }
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setFormData({
      name: event.name,
      eventType: event.eventType,
      date: format(new Date(event.date), 'yyyy-MM-dd'),
      startTime: format(new Date(event.startTime), 'HH:mm'),
      endTime: format(new Date(event.endTime), 'HH:mm'),
      guestCount: event.guestCount.toString(),
      clientId: event.clientId,
      venueId: event.venueId || '',
      notes: event.notes || '',
      setupRequirements: event.setupRequirements || '',
      equipmentNeeds: event.equipmentNeeds || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      await api.delete(`/events/${id}`);
      loadData();
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      eventType: 'CORPORATE',
      date: '',
      startTime: '',
      endTime: '',
      guestCount: '',
      clientId: '',
      venueId: '',
      notes: '',
      setupRequirements: '',
      equipmentNeeds: ''
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      INQUIRY: 'badge-info',
      PROPOSAL_SENT: 'badge-warning',
      CONFIRMED: 'badge-success',
      IN_PROGRESS: 'badge-info',
      COMPLETED: 'badge-gray',
      CANCELLED: 'badge-danger'
    };
    return badges[status] || 'badge-gray';
  };

  const filteredEvents = events.filter(event =>
    event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.client?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="text-gray-500">Manage your catering events</p>
        </div>
        <button
          onClick={() => { resetForm(); setEditingEvent(null); setError(''); setShowModal(true); }}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          New Event
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" size={20} />
              <input
                type="text"
                placeholder="Search events..."
                className="input"
                style={{ paddingLeft: '2.5rem' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <select
            className="select w-48"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            {eventStatuses.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEvents.map((event) => (
          <div key={event.id} className="card hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/events/${event.id}`)}>
            <div className="flex items-start justify-between mb-3">
              <span className={`badge ${getStatusBadge(event.status)}`}>
                {event.status.replace('_', ' ')}
              </span>
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <Link
                  to={`/events/${event.id}`}
                  className="p-1 text-gray-400 hover:text-indigo-600"
                >
                  <Eye size={18} />
                </Link>
                <button
                  onClick={() => handleEdit(event)}
                  className="p-1 text-gray-400 hover:text-indigo-600"
                >
                  <Edit size={18} />
                </button>
                <button
                  onClick={() => handleDelete(event.id)}
                  className="p-1 text-gray-400 hover:text-red-600"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <h3 className="font-semibold text-gray-900 mb-2">{event.name}</h3>

            <div className="space-y-2 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                {format(new Date(event.date), 'MMM d, yyyy')}
              </div>
              <div className="flex items-center gap-2">
                <Users size={16} />
                {event.guestCount} guests
              </div>
              {event.venue && (
                <div className="flex items-center gap-2">
                  <MapPin size={16} />
                  {event.venue.name}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-sm text-gray-600">
                Client: <span className="font-medium">{event.client?.name}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {filteredEvents.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No events found</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new event.</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingEvent ? 'Edit Event' : 'New Event'}
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
                  <label className="label">Event Name</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <label className="label">Event Type</label>
                  <select
                    className="select"
                    value={formData.eventType}
                    onChange={(e) => setFormData({...formData, eventType: e.target.value})}
                    required
                  >
                    {eventTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
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

                <div>
                  <label className="label">Date</label>
                  <input
                    type="date"
                    className="input"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <label className="label">Client</label>
                  <select
                    className="select"
                    value={formData.clientId}
                    onChange={(e) => setFormData({...formData, clientId: e.target.value})}
                    required
                  >
                    <option value="">Select Client</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Start Time</label>
                  <input
                    type="time"
                    className="input"
                    value={formData.startTime}
                    onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <label className="label">End Time</label>
                  <input
                    type="time"
                    className="input"
                    value={formData.endTime}
                    onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="label">Venue</label>
                  <select
                    className="select"
                    value={formData.venueId}
                    onChange={(e) => setFormData({...formData, venueId: e.target.value})}
                  >
                    <option value="">Select Venue (Optional)</option>
                    {venues.map(venue => (
                      <option key={venue.id} value={venue.id}>{venue.name}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="label">Notes</label>
                  <textarea
                    className="input"
                    rows="2"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  />
                </div>

                <div>
                  <label className="label">Setup Requirements</label>
                  <textarea
                    className="input"
                    rows="2"
                    value={formData.setupRequirements}
                    onChange={(e) => setFormData({...formData, setupRequirements: e.target.value})}
                  />
                </div>

                <div>
                  <label className="label">Equipment Needs</label>
                  <textarea
                    className="input"
                    rows="2"
                    value={formData.equipmentNeeds}
                    onChange={(e) => setFormData({...formData, equipmentNeeds: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingEvent(null); }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingEvent ? 'Update Event' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
