import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { Plus, Users, Search, Filter, Download, Upload, Edit, Trash2, X, Check, AlertTriangle } from 'lucide-react';

export default function Guests() {
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

  const loadEvents = async () => {
    try {
      const res = await api.get('/events');
      setEvents(res.data);
      if (eventIdParam && res.data.find(e => e.id === eventIdParam)) {
        setSelectedEventId(eventIdParam);
      } else if (res.data.length > 0 && !eventIdParam) {
        setSelectedEventId(res.data[0].id);
      }
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGuests = async () => {
    try {
      const res = await api.get(`/guests/event/${selectedEventId}`);
      setGuests(res.data);
    } catch (error) {
      console.error('Failed to load guests:', error);
    }
  };

  const loadDietarySummary = async () => {
    try {
      const res = await api.get(`/guests/event/${selectedEventId}/dietary-summary`);
      setDietarySummary(res.data);
    } catch (error) {
      console.error('Failed to load dietary summary:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate event is selected
    if (!selectedEventId) {
      setError('Please select an event first');
      return;
    }

    try {
      if (editingGuest) {
        await api.put(`/guests/${editingGuest.id}`, formData);
      } else {
        await api.post('/guests', { ...formData, eventId: selectedEventId });
      }
      setShowModal(false);
      setEditingGuest(null);
      resetForm();
      loadGuests();
      loadDietarySummary();
    } catch (err) {
      console.error('Error saving guest:', err);
      setError(err.response?.data?.error || 'Failed to save guest. Please try again.');
    }
  };

  const handleEdit = (guest) => {
    setEditingGuest(guest);
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
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this guest?')) return;
    try {
      await api.delete(`/guests/${id}`);
      loadGuests();
      loadDietarySummary();
    } catch (error) {
      console.error('Failed to delete guest:', error);
    }
  };

  const handleExport = () => {
    window.open(`/api/guests/event/${selectedEventId}/export`, '_blank');
  };

  const resetForm = () => {
    setFormData({
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
  };

  const filteredGuests = guests.filter(guest => {
    const matchesSearch = guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          guest.email?.toLowerCase().includes(searchTerm.toLowerCase());

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

  const getRsvpBadge = (status) => {
    const badges = {
      PENDING: 'badge-warning',
      CONFIRMED: 'badge-success',
      DECLINED: 'badge-danger',
      MAYBE: 'badge-info'
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
          <h1 className="text-2xl font-bold text-gray-900">Guest Management</h1>
          <p className="text-gray-500">Manage guests and dietary restrictions</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExport} className="btn btn-secondary flex items-center gap-2" disabled={!selectedEventId}>
            <Download size={20} />
            Export
          </button>
          <button
            onClick={() => { resetForm(); setEditingGuest(null); setError(''); setShowModal(true); }}
            className="btn btn-primary flex items-center gap-2"
            disabled={!selectedEventId}
          >
            <Plus size={20} />
            Add Guest
          </button>
        </div>
      </div>

      {/* Event Selector */}
      <div className="card">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <label className="label">Select Event</label>
            <select
              className="select"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
            >
              <option value="">Select an event</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>{event.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="label">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" size={18} />
              <input
                type="text"
                placeholder="Search guests..."
                className="input"
                style={{ paddingLeft: '2.5rem' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="w-48">
            <label className="label">Filter by Dietary</label>
            <select
              className="select"
              value={filterDietary}
              onChange={(e) => setFilterDietary(e.target.value)}
            >
              <option value="">All Guests</option>
              <option value="vegetarian">Vegetarian</option>
              <option value="vegan">Vegan</option>
              <option value="gluten-free">Gluten-Free</option>
              <option value="dairy-free">Dairy-Free</option>
              <option value="nut-free">Nut-Free</option>
              <option value="allergies">Has Allergies</option>
            </select>
          </div>
        </div>
      </div>

      {/* Dietary Summary */}
      {dietarySummary && selectedEventId && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="card bg-gray-50">
            <p className="text-2xl font-bold text-gray-900">{dietarySummary.total}</p>
            <p className="text-sm text-gray-500">Total Guests</p>
          </div>
          <div className="card bg-green-50">
            <p className="text-2xl font-bold text-green-600">{dietarySummary.rsvpConfirmed}</p>
            <p className="text-sm text-gray-500">Confirmed</p>
          </div>
          <div className="card bg-yellow-50">
            <p className="text-2xl font-bold text-yellow-600">{dietarySummary.vegetarian}</p>
            <p className="text-sm text-gray-500">Vegetarian</p>
          </div>
          <div className="card bg-green-50">
            <p className="text-2xl font-bold text-green-600">{dietarySummary.vegan}</p>
            <p className="text-sm text-gray-500">Vegan</p>
          </div>
          <div className="card bg-orange-50">
            <p className="text-2xl font-bold text-orange-600">{dietarySummary.glutenFree}</p>
            <p className="text-sm text-gray-500">Gluten-Free</p>
          </div>
          <div className="card bg-red-50">
            <p className="text-2xl font-bold text-red-600">{dietarySummary.withAllergies}</p>
            <p className="text-sm text-gray-500">With Allergies</p>
          </div>
        </div>
      )}

      {/* Guests Table */}
      {selectedEventId ? (
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>RSVP</th>
                <th>Dietary Restrictions</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredGuests.map((guest) => (
                <tr key={guest.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleEdit(guest)}>
                  <td className="font-medium">{guest.name}</td>
                  <td>{guest.email || '-'}</td>
                  <td>
                    <span className={`badge ${getRsvpBadge(guest.rsvpStatus)}`}>
                      {guest.rsvpStatus}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {guest.isVegetarian && <span className="badge badge-success text-xs">Vegetarian</span>}
                      {guest.isVegan && <span className="badge badge-success text-xs">Vegan</span>}
                      {guest.isGlutenFree && <span className="badge badge-warning text-xs">GF</span>}
                      {guest.isDairyFree && <span className="badge badge-info text-xs">DF</span>}
                      {guest.isNutFree && <span className="badge badge-danger text-xs">NF</span>}
                      {guest.otherAllergies && (
                        <span className="badge badge-danger text-xs" title={guest.otherAllergies}>
                          <AlertTriangle size={12} className="mr-1" />
                          Allergies
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="max-w-xs truncate">{guest.notes || '-'}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(guest)}
                        className="text-gray-400 hover:text-indigo-600"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(guest.id)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <Trash2 size={18} />
                      </button>
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
              <p className="mt-1 text-sm text-gray-500">Add guests to this event.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="card text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Select an event</h3>
          <p className="mt-1 text-sm text-gray-500">Choose an event to manage its guests.</p>
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
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Name *</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    className="input"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input
                    type="tel"
                    className="input"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="label">RSVP Status</label>
                  <select
                    className="select"
                    value={formData.rsvpStatus}
                    onChange={(e) => setFormData({...formData, rsvpStatus: e.target.value})}
                  >
                    <option value="PENDING">Pending</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="DECLINED">Declined</option>
                    <option value="MAYBE">Maybe</option>
                  </select>
                </div>
                <div>
                  <label className="label">Meal Preference</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g., Chicken, Fish"
                    value={formData.mealPreference}
                    onChange={(e) => setFormData({...formData, mealPreference: e.target.value})}
                  />
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
                      <input
                        type="checkbox"
                        checked={formData[key]}
                        onChange={(e) => setFormData({...formData, [key]: e.target.checked})}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Other Allergies</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., Shellfish, Sesame"
                  value={formData.otherAllergies}
                  onChange={(e) => setFormData({...formData, otherAllergies: e.target.value})}
                />
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea
                  className="input"
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingGuest(null); }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingGuest ? 'Update Guest' : 'Add Guest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
