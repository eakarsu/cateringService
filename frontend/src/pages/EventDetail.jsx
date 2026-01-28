import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { format } from 'date-fns';
import {
  ArrowLeft, Calendar, MapPin, Users, Clock, FileText, Truck,
  DollarSign, ChefHat, Plus, Edit, Trash2, CheckCircle, Image, UserCheck
} from 'lucide-react';
import PhotoGallery from '../components/PhotoGallery';
import { useAuth } from '../context/AuthContext';

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [guests, setGuests] = useState([]);
  const [dietarySummary, setDietarySummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [timelineForm, setTimelineForm] = useState({ time: '', activity: '', notes: '' });

  useEffect(() => {
    loadEvent();
  }, [id]);

  const loadEvent = async () => {
    try {
      const [eventRes, statusesRes, photosRes, guestsRes, dietaryRes] = await Promise.all([
        api.get(`/events/${id}`),
        api.get('/events/options/statuses'),
        api.get(`/photos/event/${id}`).catch(() => ({ data: [] })),
        api.get(`/guests/event/${id}`).catch(() => ({ data: [] })),
        api.get(`/guests/event/${id}/dietary-summary`).catch(() => ({ data: null }))
      ]);
      setEvent(eventRes.data);
      setStatuses(statusesRes.data);
      setPhotos(photosRes.data);
      setGuests(guestsRes.data);
      setDietarySummary(dietaryRes.data);
    } catch (error) {
      console.error('Failed to load event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (formData) => {
    try {
      await api.post('/photos/upload-multiple', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const photosRes = await api.get(`/photos/event/${id}`);
      setPhotos(photosRes.data);
    } catch (error) {
      console.error('Failed to upload photos:', error);
    }
  };

  const handlePhotoDelete = async (photoId) => {
    try {
      await api.delete(`/photos/${photoId}`);
      setPhotos(photos.filter(p => p.id !== photoId));
    } catch (error) {
      console.error('Failed to delete photo:', error);
    }
  };

  const handlePhotoUpdate = async (photoId, data) => {
    try {
      await api.put(`/photos/${photoId}`, data);
      const photosRes = await api.get(`/photos/event/${id}`);
      setPhotos(photosRes.data);
    } catch (error) {
      console.error('Failed to update photo:', error);
    }
  };

  const handleStatusUpdate = async (status) => {
    try {
      await api.put(`/events/${id}`, { status });
      loadEvent();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleAddTimeline = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/events/${id}/timeline`, {
        ...timelineForm,
        time: `${format(new Date(event.date), 'yyyy-MM-dd')}T${timelineForm.time}`
      });
      setShowTimelineModal(false);
      setTimelineForm({ time: '', activity: '', notes: '' });
      loadEvent();
    } catch (error) {
      console.error('Failed to add timeline item:', error);
    }
  };

  const handleToggleTimeline = async (timelineId, completed) => {
    try {
      await api.put(`/events/${id}/timeline/${timelineId}`, { completed: !completed });
      loadEvent();
    } catch (error) {
      console.error('Failed to update timeline:', error);
    }
  };

  const handleDeleteTimeline = async (timelineId) => {
    try {
      await api.delete(`/events/${id}/timeline/${timelineId}`);
      loadEvent();
    } catch (error) {
      console.error('Failed to delete timeline:', error);
    }
  };

  if (loading || !event) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

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

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'guests', label: 'Guests' },
    { id: 'proposals', label: 'Proposals' },
    { id: 'orders', label: 'Orders' },
    { id: 'staff', label: 'Staff' },
    { id: 'deliveries', label: 'Deliveries' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'photos', label: 'Photos' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/events')} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
            <span className={`badge ${getStatusBadge(event.status)}`}>
              {event.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-gray-500">
            {format(new Date(event.date), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <select
          value={event.status}
          onChange={(e) => handleStatusUpdate(e.target.value)}
          className="select w-48"
        >
          {statuses.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Quick Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <Calendar className="text-indigo-600" />
            <div>
              <p className="text-sm text-gray-500">Date & Time</p>
              <p className="font-medium">
                {format(new Date(event.startTime), 'h:mm a')} - {format(new Date(event.endTime), 'h:mm a')}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <Users className="text-green-600" />
            <div>
              <p className="text-sm text-gray-500">Guest Count</p>
              <p className="font-medium">{event.guestCount} guests</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <MapPin className="text-red-600" />
            <div>
              <p className="text-sm text-gray-500">Venue</p>
              <p className="font-medium">{event.venue?.name || 'Not assigned'}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <Users className="text-purple-600" />
            <div>
              <p className="text-sm text-gray-500">Client</p>
              <p className="font-medium">{event.client?.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Event Details</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-gray-500">Event Type</dt>
                <dd className="font-medium">{event.eventType}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Client Email</dt>
                <dd className="font-medium">{event.client?.email}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Client Phone</dt>
                <dd className="font-medium">{event.client?.phone || '-'}</dd>
              </div>
            </dl>
            {event.notes && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Notes</p>
                <p className="text-gray-700">{event.notes}</p>
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Venue Details</h3>
            {event.venue ? (
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Name</dt>
                  <dd className="font-medium">{event.venue.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Address</dt>
                  <dd className="font-medium text-right">
                    {event.venue.address}<br />
                    {event.venue.city}, {event.venue.state} {event.venue.zipCode}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Capacity</dt>
                  <dd className="font-medium">{event.venue.capacity} guests</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Has Kitchen</dt>
                  <dd className="font-medium">{event.venue.hasKitchen ? 'Yes' : 'No'}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-gray-500">No venue assigned</p>
            )}
          </div>

          {(event.setupRequirements || event.equipmentNeeds) && (
            <div className="card lg:col-span-2">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Setup Requirements</h3>
                  <p className="text-gray-700">{event.setupRequirements || 'None specified'}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Equipment Needs</h3>
                  <p className="text-gray-700">{event.equipmentNeeds || 'None specified'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Event Timeline</h3>
            <button
              onClick={() => setShowTimelineModal(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus size={18} />
              Add Item
            </button>
          </div>
          <div className="space-y-4">
            {event.timeline?.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No timeline items yet</p>
            ) : (
              event.timeline?.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-4 p-4 rounded-lg border ${
                    item.completed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <button
                    onClick={() => handleToggleTimeline(item.id, item.completed)}
                    className={`mt-1 ${item.completed ? 'text-green-600' : 'text-gray-400'}`}
                  >
                    <CheckCircle size={20} />
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-gray-400" />
                      <span className="font-medium">
                        {format(new Date(item.time), 'h:mm a')}
                      </span>
                    </div>
                    <p className={`mt-1 ${item.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                      {item.activity}
                    </p>
                    {item.notes && <p className="text-sm text-gray-500 mt-1">{item.notes}</p>}
                  </div>
                  <button
                    onClick={() => handleDeleteTimeline(item.id)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'proposals' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Proposals</h3>
            <Link to="/proposals" className="btn btn-primary flex items-center gap-2">
              <Plus size={18} />
              Create Proposal
            </Link>
          </div>
          {event.proposals?.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No proposals yet</p>
          ) : (
            <div className="space-y-3">
              {event.proposals?.map((proposal) => (
                <div key={proposal.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">${proposal.totalAmount.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">
                      Valid until {format(new Date(proposal.validUntil), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <span className={`badge ${
                    proposal.status === 'ACCEPTED' ? 'badge-success' :
                    proposal.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'
                  }`}>
                    {proposal.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Orders</h3>
          {event.orders?.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No orders yet</p>
          ) : (
            <div className="space-y-3">
              {event.orders?.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{order.orderNumber}</p>
                    <p className="text-sm text-gray-500">{order.guestCount} guests</p>
                  </div>
                  <span className={`badge ${
                    order.status === 'COMPLETED' ? 'badge-success' :
                    order.status === 'CANCELLED' ? 'badge-danger' : 'badge-warning'
                  }`}>
                    {order.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'staff' && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Staff Assignments</h3>
          {event.staffAssignments?.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No staff assigned yet</p>
          ) : (
            <div className="space-y-3">
              {event.staffAssignments?.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{assignment.staff?.user?.name}</p>
                    <p className="text-sm text-gray-500">{assignment.role}</p>
                  </div>
                  <span className={`badge ${assignment.confirmed ? 'badge-success' : 'badge-warning'}`}>
                    {assignment.confirmed ? 'Confirmed' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'deliveries' && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Deliveries</h3>
          {event.deliveries?.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No deliveries scheduled</p>
          ) : (
            <div className="space-y-3">
              {event.deliveries?.map((delivery) => (
                <div key={delivery.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{delivery.vehicle?.name || 'No vehicle'}</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(delivery.scheduledTime), 'h:mm a')}
                    </p>
                  </div>
                  <span className={`badge ${
                    delivery.status === 'SETUP_COMPLETE' ? 'badge-success' : 'badge-info'
                  }`}>
                    {delivery.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Invoices</h3>
          {event.invoices?.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No invoices yet</p>
          ) : (
            <div className="space-y-3">
              {event.invoices?.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{invoice.invoiceNumber}</p>
                    <p className="text-sm text-gray-500">${invoice.total.toLocaleString()}</p>
                  </div>
                  <span className={`badge ${
                    invoice.status === 'PAID' ? 'badge-success' :
                    invoice.status === 'OVERDUE' ? 'badge-danger' : 'badge-warning'
                  }`}>
                    {invoice.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'guests' && (
        <div className="space-y-6">
          {/* Dietary Summary */}
          {dietarySummary && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Dietary Requirements Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{dietarySummary.totalGuests}</p>
                  <p className="text-sm text-gray-500">Total Guests</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{dietarySummary.vegetarian}</p>
                  <p className="text-sm text-gray-500">Vegetarian</p>
                </div>
                <div className="text-center p-3 bg-emerald-50 rounded-lg">
                  <p className="text-2xl font-bold text-emerald-600">{dietarySummary.vegan}</p>
                  <p className="text-sm text-gray-500">Vegan</p>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{dietarySummary.glutenFree}</p>
                  <p className="text-sm text-gray-500">Gluten Free</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{dietarySummary.dairyFree}</p>
                  <p className="text-sm text-gray-500">Dairy Free</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{dietarySummary.nutFree}</p>
                  <p className="text-sm text-gray-500">Nut Free</p>
                </div>
              </div>
            </div>
          )}

          {/* Guest List */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Guest List</h3>
              <Link to="/guests" className="btn btn-primary flex items-center gap-2">
                <Plus size={18} />
                Manage Guests
              </Link>
            </div>
            {guests.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No guests added yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Name</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Email</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">RSVP</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Dietary Restrictions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guests.map((guest) => (
                      <tr key={guest.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                              <UserCheck size={16} className="text-indigo-600" />
                            </div>
                            <span className="font-medium text-gray-900">{guest.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{guest.email || '-'}</td>
                        <td className="py-3 px-4">
                          <span className={`badge ${
                            guest.rsvpStatus === 'CONFIRMED' ? 'badge-success' :
                            guest.rsvpStatus === 'DECLINED' ? 'badge-danger' : 'badge-warning'
                          }`}>
                            {guest.rsvpStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {guest.isVegetarian && <span className="badge badge-success text-xs">Vegetarian</span>}
                            {guest.isVegan && <span className="badge badge-success text-xs">Vegan</span>}
                            {guest.isGlutenFree && <span className="badge badge-warning text-xs">Gluten Free</span>}
                            {guest.isDairyFree && <span className="badge badge-info text-xs">Dairy Free</span>}
                            {guest.isNutFree && <span className="badge badge-danger text-xs">Nut Free</span>}
                            {guest.otherAllergies && <span className="badge badge-gray text-xs">{guest.otherAllergies}</span>}
                            {!guest.isVegetarian && !guest.isVegan && !guest.isGlutenFree &&
                             !guest.isDairyFree && !guest.isNutFree && !guest.otherAllergies && (
                              <span className="text-gray-400 text-sm">None</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'photos' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Event Photos</h3>
          </div>
          <PhotoGallery
            photos={photos}
            eventId={id}
            userId={user?.id}
            onUpload={handlePhotoUpload}
            onDelete={handlePhotoDelete}
            onUpdate={handlePhotoUpdate}
            readOnly={!(user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'STAFF')}
          />
        </div>
      )}

      {/* Timeline Modal */}
      {showTimelineModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Add Timeline Item</h2>
            </div>
            <form onSubmit={handleAddTimeline} className="p-6 space-y-4">
              <div>
                <label className="label">Time</label>
                <input
                  type="time"
                  className="input"
                  value={timelineForm.time}
                  onChange={(e) => setTimelineForm({...timelineForm, time: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="label">Activity</label>
                <input
                  type="text"
                  className="input"
                  value={timelineForm.activity}
                  onChange={(e) => setTimelineForm({...timelineForm, activity: e.target.value})}
                  required
                  placeholder="e.g., Guest arrival"
                />
              </div>
              <div>
                <label className="label">Notes (Optional)</label>
                <textarea
                  className="input"
                  rows="2"
                  value={timelineForm.notes}
                  onChange={(e) => setTimelineForm({...timelineForm, notes: e.target.value})}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowTimelineModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
