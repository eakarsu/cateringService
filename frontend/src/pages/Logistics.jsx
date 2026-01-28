import { useState, useEffect } from 'react';
import api from '../utils/api';
import { format } from 'date-fns';
import { Plus, Truck, MapPin, Package, Clock, Edit, Trash2 } from 'lucide-react';

export default function Logistics() {
  const [vehicles, setVehicles] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [events, setEvents] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [equipmentCategories, setEquipmentCategories] = useState([]);
  const [deliveryStatuses, setDeliveryStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('deliveries');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('delivery');
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({});
  const [error, setError] = useState('');
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedEquipment, setSelectedEquipment] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [vehiclesRes, deliveriesRes, equipmentRes, eventsRes, vehicleTypesRes, equipmentCategoriesRes, deliveryStatusesRes] = await Promise.all([
        api.get('/logistics/vehicles'),
        api.get('/logistics/deliveries'),
        api.get('/logistics/equipment'),
        api.get('/events'),
        api.get('/logistics/options/vehicle-types'),
        api.get('/logistics/options/equipment-categories'),
        api.get('/logistics/options/delivery-statuses')
      ]);
      setVehicles(vehiclesRes.data);
      setDeliveries(deliveriesRes.data);
      setEquipment(equipmentRes.data);
      setEvents(eventsRes.data);
      setVehicleTypes(vehicleTypesRes.data);
      setEquipmentCategories(equipmentCategoriesRes.data);
      setDeliveryStatuses(deliveryStatusesRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type, item = null) => {
    setModalType(type);
    setEditing(item);
    setError('');
    if (type === 'vehicle') {
      setFormData(item ? {
        name: item.name,
        type: item.type,
        licensePlate: item.licensePlate || '',
        capacity: item.capacity || '',
        notes: item.notes || ''
      } : {
        name: '',
        type: 'VAN',
        licensePlate: '',
        capacity: '',
        notes: ''
      });
    } else if (type === 'delivery') {
      setFormData(item ? {
        eventId: item.eventId,
        vehicleId: item.vehicleId || '',
        scheduledTime: format(new Date(item.scheduledTime), "yyyy-MM-dd'T'HH:mm"),
        driverName: item.driverName || '',
        routeNotes: item.routeNotes || '',
        setupCrew: item.setupCrew || ''
      } : {
        eventId: '',
        vehicleId: '',
        scheduledTime: '',
        driverName: '',
        routeNotes: '',
        setupCrew: ''
      });
    } else {
      setFormData(item ? {
        name: item.name,
        category: item.category,
        quantity: item.quantity.toString(),
        description: item.description || '',
        notes: item.notes || ''
      } : {
        name: '',
        category: 'SERVING',
        quantity: '',
        description: '',
        notes: ''
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      let endpoint;
      if (modalType === 'vehicle') endpoint = '/logistics/vehicles';
      else if (modalType === 'delivery') endpoint = '/logistics/deliveries';
      else endpoint = '/logistics/equipment';

      if (editing) {
        await api.put(`${endpoint}/${editing.id}`, formData);
      } else {
        await api.post(endpoint, formData);
      }
      setShowModal(false);
      setEditing(null);
      loadData();
    } catch (err) {
      console.error('Failed to save:', err);
      setError(err.response?.data?.error || 'Failed to save. Please try again.');
    }
  };

  const updateDeliveryStatus = async (id, status) => {
    try {
      await api.post(`/logistics/deliveries/${id}/status`, { status });
      loadData();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleDelete = async (type, id) => {
    if (!confirm('Are you sure?')) return;
    try {
      let endpoint;
      if (type === 'vehicle') endpoint = `/logistics/vehicles/${id}`;
      else if (type === 'delivery') endpoint = `/logistics/deliveries/${id}`;
      else endpoint = `/logistics/equipment/${id}`;
      await api.delete(endpoint);
      loadData();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      SCHEDULED: 'badge-info',
      LOADING: 'badge-warning',
      IN_TRANSIT: 'badge-info',
      ARRIVED: 'badge-success',
      SETUP_COMPLETE: 'badge-success',
      RETURNED: 'badge-gray'
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
          <h1 className="text-2xl font-bold text-gray-900">Logistics</h1>
          <p className="text-gray-500">Manage deliveries, vehicles, and equipment</p>
        </div>
        <button
          onClick={() => openModal(
            activeTab === 'deliveries' ? 'delivery' :
            activeTab === 'vehicles' ? 'vehicle' : 'equipment'
          )}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Add {activeTab === 'deliveries' ? 'Delivery' : activeTab === 'vehicles' ? 'Vehicle' : 'Equipment'}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {[
            { id: 'deliveries', label: 'Deliveries', count: deliveries.length },
            { id: 'vehicles', label: 'Vehicles', count: vehicles.length },
            { id: 'equipment', label: 'Equipment', count: equipment.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Deliveries */}
      {activeTab === 'deliveries' && (
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Scheduled</th>
                <th>Vehicle</th>
                <th>Driver</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {deliveries.map((delivery) => (
                <tr key={delivery.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setSelectedDelivery(delivery)}>
                  <td>
                    <div className="font-medium">{delivery.event?.name}</div>
                    <div className="text-sm text-gray-500">{delivery.event?.venue?.name}</div>
                  </td>
                  <td>{format(new Date(delivery.scheduledTime), 'MMM d, h:mm a')}</td>
                  <td>{delivery.vehicle?.name || 'Not assigned'}</td>
                  <td>{delivery.driverName || '-'}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <select
                      value={delivery.status}
                      onChange={(e) => updateDeliveryStatus(delivery.id, e.target.value)}
                      className={`badge ${getStatusBadge(delivery.status)} border-0`}
                    >
                      {deliveryStatuses.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openModal('delivery', delivery)}
                        className="p-1 text-gray-400 hover:text-indigo-600"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete('delivery', delivery.id)}
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
      )}

      {/* Vehicles */}
      {activeTab === 'vehicles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((vehicle) => (
            <div key={vehicle.id} className="card cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedVehicle(vehicle)}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Truck className="text-indigo-600" />
                  <h3 className="font-semibold text-gray-900">{vehicle.name}</h3>
                </div>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => openModal('vehicle', vehicle)}
                    className="p-1 text-gray-400 hover:text-indigo-600"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete('vehicle', vehicle.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-500">
                <p><span className="font-medium">Type:</span> {vehicle.type}</p>
                {vehicle.licensePlate && <p><span className="font-medium">Plate:</span> {vehicle.licensePlate}</p>}
                {vehicle.capacity && <p><span className="font-medium">Capacity:</span> {vehicle.capacity}</p>}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100">
                <span className={`badge ${vehicle.isAvailable ? 'badge-success' : 'badge-warning'}`}>
                  {vehicle.isAvailable ? 'Available' : 'In Use'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Equipment */}
      {activeTab === 'equipment' && (
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>Equipment</th>
                <th>Category</th>
                <th>Total</th>
                <th>Available</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {equipment.map((item) => (
                <tr key={item.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setSelectedEquipment(item)}>
                  <td>
                    <div className="font-medium">{item.name}</div>
                    {item.description && <div className="text-sm text-gray-500">{item.description}</div>}
                  </td>
                  <td>{item.category}</td>
                  <td>{item.quantity}</td>
                  <td>
                    <span className={item.available < item.quantity / 2 ? 'text-yellow-600 font-medium' : ''}>
                      {item.available}
                    </span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openModal('equipment', item)}
                        className="p-1 text-gray-400 hover:text-indigo-600"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete('equipment', item.id)}
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
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editing ? 'Edit' : 'Add'} {modalType.charAt(0).toUpperCase() + modalType.slice(1)}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {modalType === 'vehicle' && (
                <>
                  <div>
                    <label className="label">Name</label>
                    <input type="text" className="input" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Type</label>
                      <select className="select" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}>
                        {vehicleTypes.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">License Plate</label>
                      <input type="text" className="input" value={formData.licensePlate} onChange={(e) => setFormData({...formData, licensePlate: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className="label">Capacity</label>
                    <input type="text" className="input" value={formData.capacity} onChange={(e) => setFormData({...formData, capacity: e.target.value})} />
                  </div>
                </>
              )}

              {modalType === 'delivery' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Event</label>
                      <select className="select" value={formData.eventId} onChange={(e) => setFormData({...formData, eventId: e.target.value})} required>
                        <option value="">Select Event</option>
                        {events.map(event => (
                          <option key={event.id} value={event.id}>{event.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Vehicle</label>
                      <select className="select" value={formData.vehicleId} onChange={(e) => setFormData({...formData, vehicleId: e.target.value})}>
                        <option value="">Select Vehicle</option>
                        {vehicles.map(v => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Scheduled Time</label>
                      <input type="datetime-local" className="input" value={formData.scheduledTime} onChange={(e) => setFormData({...formData, scheduledTime: e.target.value})} required />
                    </div>
                    <div>
                      <label className="label">Driver Name</label>
                      <input type="text" className="input" value={formData.driverName} onChange={(e) => setFormData({...formData, driverName: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className="label">Setup Crew</label>
                    <input type="text" className="input" value={formData.setupCrew} onChange={(e) => setFormData({...formData, setupCrew: e.target.value})} />
                  </div>
                  <div>
                    <label className="label">Route Notes</label>
                    <textarea className="input" rows="2" value={formData.routeNotes} onChange={(e) => setFormData({...formData, routeNotes: e.target.value})} />
                  </div>
                </>
              )}

              {modalType === 'equipment' && (
                <>
                  <div>
                    <label className="label">Name</label>
                    <input type="text" className="input" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Category</label>
                      <select className="select" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                        {equipmentCategories.map(c => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Quantity</label>
                      <input type="number" className="input" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} required min="1" />
                    </div>
                  </div>
                  <div>
                    <label className="label">Description</label>
                    <textarea className="input" rows="2" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => { setShowModal(false); setEditing(null); }} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delivery Detail Modal */}
      {selectedDelivery && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Delivery Details</h2>
                <span className={`badge ${getStatusBadge(selectedDelivery.status)}`}>{selectedDelivery.status}</span>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Event</p>
                  <p className="font-medium">{selectedDelivery.event?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Venue</p>
                  <p className="font-medium">{selectedDelivery.event?.venue?.name}</p>
                  <p className="text-sm text-gray-500">{selectedDelivery.event?.venue?.address}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Scheduled Time</p>
                  <p className="font-medium">{format(new Date(selectedDelivery.scheduledTime), 'MMMM d, yyyy h:mm a')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Vehicle</p>
                  <p className="font-medium">{selectedDelivery.vehicle?.name || 'Not assigned'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Driver</p>
                  <p className="font-medium">{selectedDelivery.driverName || 'Not assigned'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Setup Crew</p>
                  <p className="font-medium">{selectedDelivery.setupCrew || 'Not assigned'}</p>
                </div>
              </div>
              {selectedDelivery.routeNotes && (
                <div>
                  <p className="text-sm text-gray-500">Route Notes</p>
                  <p className="text-gray-700">{selectedDelivery.routeNotes}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setSelectedDelivery(null)} className="btn btn-secondary">Close</button>
              <button onClick={() => { openModal('delivery', selectedDelivery); setSelectedDelivery(null); }} className="btn btn-primary">Edit</button>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Detail Modal */}
      {selectedVehicle && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">{selectedVehicle.name}</h2>
                <span className={`badge ${selectedVehicle.isAvailable ? 'badge-success' : 'badge-warning'}`}>
                  {selectedVehicle.isAvailable ? 'Available' : 'In Use'}
                </span>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-medium">{selectedVehicle.type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">License Plate</p>
                  <p className="font-medium">{selectedVehicle.licensePlate || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Capacity</p>
                  <p className="font-medium">{selectedVehicle.capacity || 'N/A'}</p>
                </div>
              </div>
              {selectedVehicle.notes && (
                <div>
                  <p className="text-sm text-gray-500">Notes</p>
                  <p className="text-gray-700">{selectedVehicle.notes}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setSelectedVehicle(null)} className="btn btn-secondary">Close</button>
              <button onClick={() => { openModal('vehicle', selectedVehicle); setSelectedVehicle(null); }} className="btn btn-primary">Edit</button>
            </div>
          </div>
        </div>
      )}

      {/* Equipment Detail Modal */}
      {selectedEquipment && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">{selectedEquipment.name}</h2>
              <span className="badge badge-info mt-2">{selectedEquipment.category}</span>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Total Quantity</p>
                  <p className="font-medium text-lg">{selectedEquipment.quantity}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Available</p>
                  <p className={`font-medium text-lg ${selectedEquipment.available < selectedEquipment.quantity / 2 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {selectedEquipment.available}
                  </p>
                </div>
              </div>
              {selectedEquipment.description && (
                <div>
                  <p className="text-sm text-gray-500">Description</p>
                  <p className="text-gray-700">{selectedEquipment.description}</p>
                </div>
              )}
              {selectedEquipment.notes && (
                <div>
                  <p className="text-sm text-gray-500">Notes</p>
                  <p className="text-gray-700">{selectedEquipment.notes}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setSelectedEquipment(null)} className="btn btn-secondary">Close</button>
              <button onClick={() => { openModal('equipment', selectedEquipment); setSelectedEquipment(null); }} className="btn btn-primary">Edit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
