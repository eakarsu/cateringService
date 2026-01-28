import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Plus, MapPin, Users, Phone, Mail, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';

export default function Venues() {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVenue, setEditingVenue] = useState(null);
  const [formData, setFormData] = useState({
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
  });
  const [error, setError] = useState('');
  const [selectedVenue, setSelectedVenue] = useState(null);

  useEffect(() => {
    loadVenues();
  }, []);

  const loadVenues = async () => {
    try {
      const res = await api.get('/venues');
      setVenues(res.data);
    } catch (error) {
      console.error('Failed to load venues:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingVenue) {
        await api.put(`/venues/${editingVenue.id}`, formData);
      } else {
        await api.post('/venues', formData);
      }
      setShowModal(false);
      setEditingVenue(null);
      resetForm();
      loadVenues();
    } catch (err) {
      console.error('Failed to save venue:', err);
      setError(err.response?.data?.error || 'Failed to save venue. Please try again.');
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
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this venue?')) return;
    try {
      await api.delete(`/venues/${id}`);
      loadVenues();
    } catch (error) {
      console.error('Failed to delete venue:', error);
    }
  };

  const resetForm = () => {
    setFormData({
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
    });
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
          <h1 className="text-2xl font-bold text-gray-900">Venues</h1>
          <p className="text-gray-500">Manage event venues</p>
        </div>
        <button
          onClick={() => { resetForm(); setEditingVenue(null); setError(''); setShowModal(true); }}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Add Venue
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {venues.map((venue) => (
          <div key={venue.id} className="card hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedVenue(venue)}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
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

      {venues.length === 0 && (
        <div className="text-center py-12">
          <MapPin className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No venues</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding a new venue.</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingVenue ? 'Edit Venue' : 'Add Venue'}
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
                  <label className="label">Venue Name</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="label">Address</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <label className="label">City</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label">State</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.state}
                      onChange={(e) => setFormData({...formData, state: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">ZIP</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.zipCode}
                      onChange={(e) => setFormData({...formData, zipCode: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Capacity</label>
                  <input
                    type="number"
                    className="input"
                    value={formData.capacity}
                    onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                    required
                    min="1"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="hasKitchen"
                    checked={formData.hasKitchen}
                    onChange={(e) => setFormData({...formData, hasKitchen: e.target.checked})}
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
                    onChange={(e) => setFormData({...formData, contactName: e.target.value})}
                  />
                </div>

                <div>
                  <label className="label">Contact Phone</label>
                  <input
                    type="tel"
                    className="input"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({...formData, contactPhone: e.target.value})}
                  />
                </div>

                <div className="col-span-2">
                  <label className="label">Contact Email</label>
                  <input
                    type="email"
                    className="input"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({...formData, contactEmail: e.target.value})}
                  />
                </div>

                <div className="col-span-2">
                  <label className="label">Parking Info</label>
                  <textarea
                    className="input"
                    rows="2"
                    value={formData.parkingInfo}
                    onChange={(e) => setFormData({...formData, parkingInfo: e.target.value})}
                  />
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

      {/* View Modal */}
      {selectedVenue && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">{selectedVenue.name}</h2>
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
                  <p className="font-medium">{selectedVenue.hasKitchen ? 'Yes' : 'No'}</p>
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
                  {selectedVenue.contactPhone && <p className="text-gray-600">{selectedVenue.contactPhone}</p>}
                  {selectedVenue.contactEmail && <p className="text-gray-600">{selectedVenue.contactEmail}</p>}
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
              <button onClick={() => setSelectedVenue(null)} className="btn btn-secondary">Close</button>
              <button onClick={() => { handleEdit(selectedVenue); setSelectedVenue(null); }} className="btn btn-primary">Edit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
