import { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import { format } from 'date-fns';
import {
  Plus, Truck, MapPin, Package, Clock, Edit, Trash2, X, Search,
  ArrowUpDown, CheckSquare, Square, FileText
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import { SkeletonGrid, SkeletonTable } from '../components/SkeletonLoader';
import { useToast } from '../context/ToastContext';

export default function Logistics() {
  const toast = useToast();

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
  const [formErrors, setFormErrors] = useState({});
  const [error, setError] = useState('');

  // Detail modals
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedEquipment, setSelectedEquipment] = useState(null);

  // Search, sort, pagination
  const [deliverySearch, setDeliverySearch] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [equipmentSearch, setEquipmentSearch] = useState('');

  const [deliverySort, setDeliverySort] = useState({ field: 'scheduledTime', dir: 'asc' });
  const [vehicleSort, setVehicleSort] = useState({ field: 'name', dir: 'asc' });
  const [equipmentSort, setEquipmentSort] = useState({ field: 'name', dir: 'asc' });

  const [deliveryPage, setDeliveryPage] = useState(1);
  const [vehiclePage, setVehiclePage] = useState(1);
  const [equipmentPage, setEquipmentPage] = useState(1);
  const pageLimit = 12;

  // Bulk select
  const [deliverySelected, setDeliverySelected] = useState([]);
  const [vehicleSelected, setVehicleSelected] = useState([]);
  const [equipmentSelected, setEquipmentSelected] = useState([]);

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  useEffect(() => {
    loadData();
  }, []);

  const extractArray = (data) => {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    return [];
  };

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
      setVehicles(extractArray(vehiclesRes.data));
      setDeliveries(extractArray(deliveriesRes.data));
      setEquipment(extractArray(equipmentRes.data));
      setEvents(extractArray(eventsRes.data));
      setVehicleTypes(extractArray(vehicleTypesRes.data));
      setEquipmentCategories(extractArray(equipmentCategoriesRes.data));
      setDeliveryStatuses(extractArray(deliveryStatusesRes.data));
    } catch (err) {
      console.error('Failed to load data:', err);
      toast?.error('Failed to load logistics data');
    } finally {
      setLoading(false);
    }
  };

  // --- Sort helper ---
  const sortItems = (items, sort) => {
    return [...items].sort((a, b) => {
      let aVal = a[sort.field];
      let bVal = b[sort.field];
      // Handle nested fields
      if (sort.field === 'eventName') { aVal = a.event?.name || ''; bVal = b.event?.name || ''; }
      if (sort.field === 'vehicleName') { aVal = a.vehicle?.name || ''; bVal = b.vehicle?.name || ''; }
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return sort.dir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const toggleSort = (setter, currentSort, field) => {
    setter({ field, dir: currentSort.field === field && currentSort.dir === 'asc' ? 'desc' : 'asc' });
  };

  // --- Filtered + sorted + paginated ---
  const filteredDeliveries = useMemo(() => {
    let items = deliveries.filter(d =>
      (d.event?.name || '').toLowerCase().includes(deliverySearch.toLowerCase()) ||
      (d.driverName || '').toLowerCase().includes(deliverySearch.toLowerCase()) ||
      (d.vehicle?.name || '').toLowerCase().includes(deliverySearch.toLowerCase()) ||
      (d.status || '').toLowerCase().includes(deliverySearch.toLowerCase())
    );
    return sortItems(items, deliverySort);
  }, [deliveries, deliverySearch, deliverySort]);

  const paginatedDeliveries = useMemo(() => {
    const start = (deliveryPage - 1) * pageLimit;
    return filteredDeliveries.slice(start, start + pageLimit);
  }, [filteredDeliveries, deliveryPage]);

  const filteredVehicles = useMemo(() => {
    let items = vehicles.filter(v =>
      (v.name || '').toLowerCase().includes(vehicleSearch.toLowerCase()) ||
      (v.type || '').toLowerCase().includes(vehicleSearch.toLowerCase()) ||
      (v.licensePlate || '').toLowerCase().includes(vehicleSearch.toLowerCase())
    );
    return sortItems(items, vehicleSort);
  }, [vehicles, vehicleSearch, vehicleSort]);

  const paginatedVehicles = useMemo(() => {
    const start = (vehiclePage - 1) * pageLimit;
    return filteredVehicles.slice(start, start + pageLimit);
  }, [filteredVehicles, vehiclePage]);

  const filteredEquipment = useMemo(() => {
    let items = equipment.filter(e =>
      (e.name || '').toLowerCase().includes(equipmentSearch.toLowerCase()) ||
      (e.category || '').toLowerCase().includes(equipmentSearch.toLowerCase())
    );
    return sortItems(items, equipmentSort);
  }, [equipment, equipmentSearch, equipmentSort]);

  const paginatedEquipment = useMemo(() => {
    const start = (equipmentPage - 1) * pageLimit;
    return filteredEquipment.slice(start, start + pageLimit);
  }, [filteredEquipment, equipmentPage]);

  // --- Bulk select helpers ---
  const toggleSelectAll = (filtered, selected, setSelected) => {
    const ids = filtered.map(i => i.id);
    if (ids.every(id => selected.includes(id))) {
      setSelected([]);
    } else {
      setSelected(ids);
    }
  };

  const toggleSelectOne = (id, selected, setSelected) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // --- Bulk delete ---
  const handleBulkDelete = (type, ids, setSelected) => {
    if (ids.length === 0) return;
    setConfirmDialog({
      isOpen: true,
      title: `Delete ${ids.length} item(s)?`,
      message: `This will permanently delete ${ids.length} selected item(s). This action cannot be undone.`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          let endpoint;
          if (type === 'delivery') endpoint = '/logistics/deliveries';
          else if (type === 'vehicle') endpoint = '/logistics/vehicles';
          else endpoint = '/logistics/equipment';
          await Promise.all(ids.map(id => api.delete(`${endpoint}/${id}`)));
          setSelected([]);
          toast?.success(`${ids.length} item(s) deleted successfully`);
          loadData();
        } catch (err) {
          console.error('Bulk delete failed:', err);
          toast?.error('Failed to delete some items');
        }
      }
    });
  };

  // --- PDF export ---
  const exportPDF = (title, columns, rows) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(title, 14, 20);
    doc.setFontSize(10);
    doc.text(`Exported: ${format(new Date(), 'MMM d, yyyy h:mm a')}`, 14, 28);
    autoTable(doc, {
      startY: 35,
      head: [columns],
      body: rows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [79, 70, 229] }
    });
    doc.save(`${title.replace(/\s+/g, '_').toLowerCase()}.pdf`);
    toast?.success('PDF exported successfully');
  };

  const exportDeliveriesPDF = () => {
    exportPDF('Deliveries', ['Event', 'Scheduled', 'Vehicle', 'Driver', 'Status'], filteredDeliveries.map(d => [
      d.event?.name || '', format(new Date(d.scheduledTime), 'MMM d, h:mm a'),
      d.vehicle?.name || 'Not assigned', d.driverName || '-', d.status
    ]));
  };

  const exportVehiclesPDF = () => {
    exportPDF('Vehicles', ['Name', 'Type', 'License Plate', 'Capacity', 'Status'], filteredVehicles.map(v => [
      v.name, v.type, v.licensePlate || '-', v.capacity || '-', v.isAvailable ? 'Available' : 'In Use'
    ]));
  };

  const exportEquipmentPDF = () => {
    exportPDF('Equipment', ['Name', 'Category', 'Total', 'Available'], filteredEquipment.map(e => [
      e.name, e.category, e.quantity, e.available
    ]));
  };

  // --- Form validation ---
  const validateForm = () => {
    const errors = {};
    if (modalType === 'vehicle') {
      if (!formData.name?.trim()) errors.name = 'Vehicle name is required';
      if (!formData.type) errors.type = 'Type is required';
    } else if (modalType === 'delivery') {
      if (!formData.eventId) errors.eventId = 'Event is required';
      if (!formData.scheduledTime) errors.scheduledTime = 'Scheduled time is required';
      if (formData.driverName && formData.driverName.trim().length < 2) errors.driverName = 'Driver name must be at least 2 characters';
    } else {
      if (!formData.name?.trim()) errors.name = 'Equipment name is required';
      if (!formData.quantity || parseInt(formData.quantity) < 1) errors.quantity = 'Quantity must be at least 1';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openModal = (type, item = null) => {
    setModalType(type);
    setEditing(item);
    setError('');
    setFormErrors({});
    if (type === 'vehicle') {
      setFormData(item ? { name: item.name, type: item.type, licensePlate: item.licensePlate || '', capacity: item.capacity || '', notes: item.notes || '' }
        : { name: '', type: 'VAN', licensePlate: '', capacity: '', notes: '' });
    } else if (type === 'delivery') {
      setFormData(item ? { eventId: item.eventId, vehicleId: item.vehicleId || '', scheduledTime: format(new Date(item.scheduledTime), "yyyy-MM-dd'T'HH:mm"), driverName: item.driverName || '', routeNotes: item.routeNotes || '', setupCrew: item.setupCrew || '' }
        : { eventId: '', vehicleId: '', scheduledTime: '', driverName: '', routeNotes: '', setupCrew: '' });
    } else {
      setFormData(item ? { name: item.name, category: item.category, quantity: item.quantity.toString(), description: item.description || '', notes: item.notes || '' }
        : { name: '', category: 'SERVING', quantity: '', description: '', notes: '' });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setError('');
    try {
      let endpoint;
      if (modalType === 'vehicle') endpoint = '/logistics/vehicles';
      else if (modalType === 'delivery') endpoint = '/logistics/deliveries';
      else endpoint = '/logistics/equipment';

      if (editing) {
        await api.put(`${endpoint}/${editing.id}`, formData);
        toast?.success(`${modalType.charAt(0).toUpperCase() + modalType.slice(1)} updated successfully`);
      } else {
        await api.post(endpoint, formData);
        toast?.success(`${modalType.charAt(0).toUpperCase() + modalType.slice(1)} created successfully`);
      }
      setShowModal(false);
      setEditing(null);
      loadData();
    } catch (err) {
      console.error('Failed to save:', err);
      setError(err.response?.data?.error || 'Failed to save. Please try again.');
      toast?.error('Failed to save');
    }
  };

  const updateDeliveryStatus = async (id, status) => {
    try {
      await api.post(`/logistics/deliveries/${id}/status`, { status });
      toast?.success('Delivery status updated');
      loadData();
    } catch (err) {
      console.error('Failed to update status:', err);
      toast?.error('Failed to update status');
    }
  };

  const handleDelete = (type, id) => {
    setConfirmDialog({
      isOpen: true,
      title: `Delete ${type}?`,
      message: `Are you sure you want to delete this ${type}? This action cannot be undone.`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          let endpoint;
          if (type === 'vehicle') endpoint = `/logistics/vehicles/${id}`;
          else if (type === 'delivery') endpoint = `/logistics/deliveries/${id}`;
          else endpoint = `/logistics/equipment/${id}`;
          await api.delete(endpoint);
          // Close detail modals
          setSelectedDelivery(null);
          setSelectedVehicle(null);
          setSelectedEquipment(null);
          toast?.success(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted`);
          loadData();
        } catch (err) {
          console.error('Failed to delete:', err);
          toast?.error('Failed to delete');
        }
      }
    });
  };

  const getStatusBadge = (status) => {
    const badges = { SCHEDULED: 'badge-info', LOADING: 'badge-warning', IN_TRANSIT: 'badge-info', ARRIVED: 'badge-success', SETUP_COMPLETE: 'badge-success', RETURNED: 'badge-gray' };
    return badges[status] || 'badge-gray';
  };

  // --- Reusable components ---
  const SearchBar = ({ value, onChange, placeholder }) => (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
      <input type="text" placeholder={placeholder || 'Search...'} className="input pl-10" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );

  const SortButton = ({ label, field, sort, onToggle }) => (
    <button onClick={() => onToggle(field)} className="flex items-center gap-1 text-sm text-gray-600 hover:text-indigo-600">
      {label}
      <ArrowUpDown size={14} className={sort.field === field ? 'text-indigo-600' : 'text-gray-400'} />
    </button>
  );

  const TabToolbar = ({ search, onSearch, sort, onSort, selected, onBulkDelete, onExport, sortFields, searchPlaceholder }) => (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <div className="flex-1 min-w-[200px]">
        <SearchBar value={search} onChange={onSearch} placeholder={searchPlaceholder} />
      </div>
      <div className="flex items-center gap-2">
        {sortFields.map(sf => (
          <SortButton key={sf.field} label={sf.label} field={sf.field} sort={sort} onToggle={onSort} />
        ))}
      </div>
      <div className="flex items-center gap-2">
        {selected.length > 0 && (
          <button onClick={onBulkDelete} className="btn btn-danger flex items-center gap-1 text-sm py-1 px-3">
            <Trash2 size={14} /> Delete ({selected.length})
          </button>
        )}
        <button onClick={onExport} className="btn btn-secondary flex items-center gap-1 text-sm py-1 px-3">
          <FileText size={14} /> PDF
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Logistics</h1>
            <p className="text-gray-500">Manage deliveries, vehicles, and equipment</p>
          </div>
        </div>
        <SkeletonTable rows={5} cols={6} />
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
          onClick={() => openModal(activeTab === 'deliveries' ? 'delivery' : activeTab === 'vehicles' ? 'vehicle' : 'equipment')}
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
                ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Deliveries Tab */}
      {activeTab === 'deliveries' && (
        <div>
          <TabToolbar
            search={deliverySearch} onSearch={(v) => { setDeliverySearch(v); setDeliveryPage(1); }}
            sort={deliverySort} onSort={(field) => toggleSort(setDeliverySort, deliverySort, field)}
            selected={deliverySelected}
            onBulkDelete={() => handleBulkDelete('delivery', deliverySelected, setDeliverySelected)}
            onExport={exportDeliveriesPDF}
            sortFields={[{ field: 'scheduledTime', label: 'Time' }, { field: 'status', label: 'Status' }, { field: 'eventName', label: 'Event' }]}
            searchPlaceholder="Search deliveries..."
          />
          <div className="card overflow-hidden">
            <table className="table">
              <thead>
                <tr>
                  <th>
                    <button onClick={() => toggleSelectAll(filteredDeliveries, deliverySelected, setDeliverySelected)} className="text-gray-500 hover:text-indigo-600">
                      {filteredDeliveries.length > 0 && filteredDeliveries.every(i => deliverySelected.includes(i.id)) ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>
                  </th>
                  <th>Event</th>
                  <th>Scheduled</th>
                  <th>Vehicle</th>
                  <th>Driver</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedDeliveries.map((delivery) => (
                  <tr key={delivery.id} className={`cursor-pointer hover:bg-gray-50 ${deliverySelected.includes(delivery.id) ? 'bg-indigo-50' : ''}`} onClick={() => setSelectedDelivery(delivery)}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => toggleSelectOne(delivery.id, deliverySelected, setDeliverySelected)} className="text-gray-400 hover:text-indigo-600">
                        {deliverySelected.includes(delivery.id) ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} />}
                      </button>
                    </td>
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
                        {deliveryStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <button onClick={() => openModal('delivery', delivery)} className="p-1 text-gray-400 hover:text-indigo-600"><Edit size={18} /></button>
                        <button onClick={() => handleDelete('delivery', delivery.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredDeliveries.length === 0 && <div className="text-center py-12 text-gray-500">No deliveries found.</div>}
          </div>
          <Pagination page={deliveryPage} totalPages={Math.ceil(filteredDeliveries.length / pageLimit)} total={filteredDeliveries.length} limit={pageLimit} onPageChange={setDeliveryPage} />
        </div>
      )}

      {/* Vehicles Tab */}
      {activeTab === 'vehicles' && (
        <div>
          <TabToolbar
            search={vehicleSearch} onSearch={(v) => { setVehicleSearch(v); setVehiclePage(1); }}
            sort={vehicleSort} onSort={(field) => toggleSort(setVehicleSort, vehicleSort, field)}
            selected={vehicleSelected}
            onBulkDelete={() => handleBulkDelete('vehicle', vehicleSelected, setVehicleSelected)}
            onExport={exportVehiclesPDF}
            sortFields={[{ field: 'name', label: 'Name' }, { field: 'type', label: 'Type' }]}
            searchPlaceholder="Search vehicles..."
          />
          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => toggleSelectAll(filteredVehicles, vehicleSelected, setVehicleSelected)} className="text-gray-500 hover:text-indigo-600">
              {filteredVehicles.length > 0 && filteredVehicles.every(i => vehicleSelected.includes(i.id)) ? <CheckSquare size={18} /> : <Square size={18} />}
            </button>
            <span className="text-sm text-gray-500">Select all</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedVehicles.map((vehicle) => (
              <div key={vehicle.id} className={`card cursor-pointer hover:shadow-md transition-shadow ${vehicleSelected.includes(vehicle.id) ? 'ring-2 ring-indigo-400' : ''}`}>
                <div className="flex items-start gap-2">
                  <button onClick={(e) => { e.stopPropagation(); toggleSelectOne(vehicle.id, vehicleSelected, setVehicleSelected); }} className="mt-1 text-gray-400 hover:text-indigo-600">
                    {vehicleSelected.includes(vehicle.id) ? <CheckSquare size={18} className="text-indigo-600" /> : <Square size={18} />}
                  </button>
                  <div className="flex-1" onClick={() => setSelectedVehicle(vehicle)}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Truck className="text-indigo-600" />
                        <h3 className="font-semibold text-gray-900">{vehicle.name}</h3>
                      </div>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => openModal('vehicle', vehicle)} className="p-1 text-gray-400 hover:text-indigo-600"><Edit size={18} /></button>
                        <button onClick={() => handleDelete('vehicle', vehicle.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={18} /></button>
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
                </div>
              </div>
            ))}
          </div>
          {filteredVehicles.length === 0 && <div className="text-center py-12 text-gray-500">No vehicles found.</div>}
          <Pagination page={vehiclePage} totalPages={Math.ceil(filteredVehicles.length / pageLimit)} total={filteredVehicles.length} limit={pageLimit} onPageChange={setVehiclePage} />
        </div>
      )}

      {/* Equipment Tab */}
      {activeTab === 'equipment' && (
        <div>
          <TabToolbar
            search={equipmentSearch} onSearch={(v) => { setEquipmentSearch(v); setEquipmentPage(1); }}
            sort={equipmentSort} onSort={(field) => toggleSort(setEquipmentSort, equipmentSort, field)}
            selected={equipmentSelected}
            onBulkDelete={() => handleBulkDelete('equipment', equipmentSelected, setEquipmentSelected)}
            onExport={exportEquipmentPDF}
            sortFields={[{ field: 'name', label: 'Name' }, { field: 'category', label: 'Category' }, { field: 'quantity', label: 'Qty' }]}
            searchPlaceholder="Search equipment..."
          />
          <div className="card overflow-hidden">
            <table className="table">
              <thead>
                <tr>
                  <th>
                    <button onClick={() => toggleSelectAll(filteredEquipment, equipmentSelected, setEquipmentSelected)} className="text-gray-500 hover:text-indigo-600">
                      {filteredEquipment.length > 0 && filteredEquipment.every(i => equipmentSelected.includes(i.id)) ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>
                  </th>
                  <th>Equipment</th>
                  <th>Category</th>
                  <th>Total</th>
                  <th>Available</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedEquipment.map((item) => (
                  <tr key={item.id} className={`cursor-pointer hover:bg-gray-50 ${equipmentSelected.includes(item.id) ? 'bg-indigo-50' : ''}`} onClick={() => setSelectedEquipment(item)}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => toggleSelectOne(item.id, equipmentSelected, setEquipmentSelected)} className="text-gray-400 hover:text-indigo-600">
                        {equipmentSelected.includes(item.id) ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} />}
                      </button>
                    </td>
                    <td>
                      <div className="font-medium">{item.name}</div>
                      {item.description && <div className="text-sm text-gray-500">{item.description}</div>}
                    </td>
                    <td>{item.category}</td>
                    <td>{item.quantity}</td>
                    <td>
                      <span className={item.available < item.quantity / 2 ? 'text-yellow-600 font-medium' : ''}>{item.available}</span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <button onClick={() => openModal('equipment', item)} className="p-1 text-gray-400 hover:text-indigo-600"><Edit size={18} /></button>
                        <button onClick={() => handleDelete('equipment', item.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredEquipment.length === 0 && <div className="text-center py-12 text-gray-500">No equipment found.</div>}
          </div>
          <Pagination page={equipmentPage} totalPages={Math.ceil(filteredEquipment.length / pageLimit)} total={filteredEquipment.length} limit={pageLimit} onPageChange={setEquipmentPage} />
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editing ? 'Edit' : 'Add'} {modalType.charAt(0).toUpperCase() + modalType.slice(1)}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}

              {modalType === 'vehicle' && (
                <>
                  <div>
                    <label className="label">Name *</label>
                    <input type="text" className={`input ${formErrors.name ? 'border-red-500' : ''}`} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Type *</label>
                      <select className={`select ${formErrors.type ? 'border-red-500' : ''}`} value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                        {vehicleTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      {formErrors.type && <p className="text-red-500 text-xs mt-1">{formErrors.type}</p>}
                    </div>
                    <div>
                      <label className="label">License Plate</label>
                      <input type="text" className="input" value={formData.licensePlate} onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="label">Capacity</label>
                    <input type="text" className="input" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Notes</label>
                    <textarea className="input" rows="2" value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                  </div>
                </>
              )}

              {modalType === 'delivery' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Event *</label>
                      <select className={`select ${formErrors.eventId ? 'border-red-500' : ''}`} value={formData.eventId} onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}>
                        <option value="">Select Event</option>
                        {events.map(event => <option key={event.id} value={event.id}>{event.name}</option>)}
                      </select>
                      {formErrors.eventId && <p className="text-red-500 text-xs mt-1">{formErrors.eventId}</p>}
                    </div>
                    <div>
                      <label className="label">Vehicle</label>
                      <select className="select" value={formData.vehicleId} onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}>
                        <option value="">Select Vehicle</option>
                        {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Scheduled Time *</label>
                      <input type="datetime-local" className={`input ${formErrors.scheduledTime ? 'border-red-500' : ''}`} value={formData.scheduledTime} onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })} />
                      {formErrors.scheduledTime && <p className="text-red-500 text-xs mt-1">{formErrors.scheduledTime}</p>}
                    </div>
                    <div>
                      <label className="label">Driver Name</label>
                      <input type="text" className={`input ${formErrors.driverName ? 'border-red-500' : ''}`} value={formData.driverName} onChange={(e) => setFormData({ ...formData, driverName: e.target.value })} />
                      {formErrors.driverName && <p className="text-red-500 text-xs mt-1">{formErrors.driverName}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="label">Setup Crew</label>
                    <input type="text" className="input" value={formData.setupCrew} onChange={(e) => setFormData({ ...formData, setupCrew: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Route Notes</label>
                    <textarea className="input" rows="2" value={formData.routeNotes} onChange={(e) => setFormData({ ...formData, routeNotes: e.target.value })} />
                  </div>
                </>
              )}

              {modalType === 'equipment' && (
                <>
                  <div>
                    <label className="label">Name *</label>
                    <input type="text" className={`input ${formErrors.name ? 'border-red-500' : ''}`} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Category</label>
                      <select className="select" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                        {equipmentCategories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Quantity *</label>
                      <input type="number" className={`input ${formErrors.quantity ? 'border-red-500' : ''}`} value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} min="1" />
                      {formErrors.quantity && <p className="text-red-500 text-xs mt-1">{formErrors.quantity}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="label">Description</label>
                    <textarea className="input" rows="2" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
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
                <div><p className="text-sm text-gray-500">Event</p><p className="font-medium">{selectedDelivery.event?.name}</p></div>
                <div><p className="text-sm text-gray-500">Venue</p><p className="font-medium">{selectedDelivery.event?.venue?.name}</p><p className="text-sm text-gray-500">{selectedDelivery.event?.venue?.address}</p></div>
                <div><p className="text-sm text-gray-500">Scheduled Time</p><p className="font-medium">{format(new Date(selectedDelivery.scheduledTime), 'MMMM d, yyyy h:mm a')}</p></div>
                <div><p className="text-sm text-gray-500">Vehicle</p><p className="font-medium">{selectedDelivery.vehicle?.name || 'Not assigned'}</p></div>
                <div><p className="text-sm text-gray-500">Driver</p><p className="font-medium">{selectedDelivery.driverName || 'Not assigned'}</p></div>
                <div><p className="text-sm text-gray-500">Setup Crew</p><p className="font-medium">{selectedDelivery.setupCrew || 'Not assigned'}</p></div>
              </div>
              {selectedDelivery.departedAt && (
                <div><p className="text-sm text-gray-500">Departed At</p><p className="font-medium">{format(new Date(selectedDelivery.departedAt), 'MMMM d, yyyy h:mm a')}</p></div>
              )}
              {selectedDelivery.arrivedAt && (
                <div><p className="text-sm text-gray-500">Arrived At</p><p className="font-medium">{format(new Date(selectedDelivery.arrivedAt), 'MMMM d, yyyy h:mm a')}</p></div>
              )}
              {selectedDelivery.routeNotes && (
                <div><p className="text-sm text-gray-500">Route Notes</p><p className="text-gray-700">{selectedDelivery.routeNotes}</p></div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-between">
              <button onClick={() => handleDelete('delivery', selectedDelivery.id)} className="btn btn-danger flex items-center gap-1"><Trash2 size={16} /> Delete</button>
              <div className="flex gap-3">
                <button onClick={() => setSelectedDelivery(null)} className="btn btn-secondary">Close</button>
                <button onClick={() => { openModal('delivery', selectedDelivery); setSelectedDelivery(null); }} className="btn btn-primary flex items-center gap-1"><Edit size={16} /> Edit</button>
              </div>
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
                <div><p className="text-sm text-gray-500">Type</p><p className="font-medium">{selectedVehicle.type}</p></div>
                <div><p className="text-sm text-gray-500">License Plate</p><p className="font-medium">{selectedVehicle.licensePlate || 'N/A'}</p></div>
                <div><p className="text-sm text-gray-500">Capacity</p><p className="font-medium">{selectedVehicle.capacity || 'N/A'}</p></div>
              </div>
              {selectedVehicle.notes && (
                <div><p className="text-sm text-gray-500">Notes</p><p className="text-gray-700">{selectedVehicle.notes}</p></div>
              )}
              {/* Show deliveries assigned to this vehicle */}
              {deliveries.filter(d => d.vehicleId === selectedVehicle.id).length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Assigned Deliveries</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {deliveries.filter(d => d.vehicleId === selectedVehicle.id).map(d => (
                      <div key={d.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                        <span className="font-medium">{d.event?.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">{format(new Date(d.scheduledTime), 'MMM d, h:mm a')}</span>
                          <span className={`badge text-xs ${getStatusBadge(d.status)}`}>{d.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-between">
              <button onClick={() => handleDelete('vehicle', selectedVehicle.id)} className="btn btn-danger flex items-center gap-1"><Trash2 size={16} /> Delete</button>
              <div className="flex gap-3">
                <button onClick={() => setSelectedVehicle(null)} className="btn btn-secondary">Close</button>
                <button onClick={() => { openModal('vehicle', selectedVehicle); setSelectedVehicle(null); }} className="btn btn-primary flex items-center gap-1"><Edit size={16} /> Edit</button>
              </div>
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
                <div><p className="text-sm text-gray-500">Total Quantity</p><p className="font-medium text-lg">{selectedEquipment.quantity}</p></div>
                <div>
                  <p className="text-sm text-gray-500">Available</p>
                  <p className={`font-medium text-lg ${selectedEquipment.available < selectedEquipment.quantity / 2 ? 'text-yellow-600' : 'text-green-600'}`}>{selectedEquipment.available}</p>
                </div>
              </div>
              {selectedEquipment.description && <div><p className="text-sm text-gray-500">Description</p><p className="text-gray-700">{selectedEquipment.description}</p></div>}
              {selectedEquipment.notes && <div><p className="text-sm text-gray-500">Notes</p><p className="text-gray-700">{selectedEquipment.notes}</p></div>}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-between">
              <button onClick={() => handleDelete('equipment', selectedEquipment.id)} className="btn btn-danger flex items-center gap-1"><Trash2 size={16} /> Delete</button>
              <div className="flex gap-3">
                <button onClick={() => setSelectedEquipment(null)} className="btn btn-secondary">Close</button>
                <button onClick={() => { openModal('equipment', selectedEquipment); setSelectedEquipment(null); }} className="btn btn-primary flex items-center gap-1"><Edit size={16} /> Edit</button>
              </div>
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
