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
  Plus, Users, Clock, Calendar, Edit, Trash2, CheckCircle,
  Search, ArrowUpDown, Download, CheckSquare, Square, X
} from 'lucide-react';

export default function Staff() {
  const toast = useToast();
  const [staff, setStaff] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [positions, setPositions] = useState([]);
  const [uniformSizes, setUniformSizes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('staff');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('staff');
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({});
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedTimeEntry, setSelectedTimeEntry] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Search & Sort
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState([]);

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });

  useEffect(() => {
    loadData();
  }, [page, limit, sortBy, sortOrder]);

  const loadData = async () => {
    try {
      const [staffRes, assignmentsRes, timeRes, eventsRes, usersRes, positionsRes, uniformSizesRes] = await Promise.all([
        api.get('/staff', { params: { page, limit, sortBy, sortOrder, search: searchTerm || undefined } }),
        api.get('/staff/assignments/all'),
        api.get('/staff/time-entries/all'),
        api.get('/events'),
        api.get('/auth/users'),
        api.get('/staff/options/positions'),
        api.get('/staff/options/uniform-sizes')
      ]);
      const staffData = staffRes.data.data || staffRes.data;
      setStaff(Array.isArray(staffData) ? staffData : []);
      if (staffRes.data.pagination) setPagination(staffRes.data.pagination);
      else if (Array.isArray(staffRes.data)) setPagination({ total: staffRes.data.length, totalPages: 1 });

      const assignData = assignmentsRes.data.data || assignmentsRes.data;
      setAssignments(Array.isArray(assignData) ? assignData : []);
      const timeData = timeRes.data.data || timeRes.data;
      setTimeEntries(Array.isArray(timeData) ? timeData : []);
      const evtData = eventsRes.data.data || eventsRes.data;
      setEvents(Array.isArray(evtData) ? evtData : []);

      // Filter users who don't already have a staff profile
      const staffUserIds = (Array.isArray(staffData) ? staffData : []).map(s => s.userId);
      setUsers(usersRes.data.filter(u => u.role === 'STAFF' && !staffUserIds.includes(u.id)));
      setPositions(positionsRes.data);
      setUniformSizes(uniformSizesRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast?.error('Failed to load staff data');
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
    if (modalType === 'staff') {
      if (!editing) {
        if (!formData.createNew && !formData.userId) errs.userId = 'Please select a user or create a new one';
        if (formData.createNew) {
          if (!formData.newUserName?.trim()) errs.newUserName = 'Name is required';
          if (!formData.newUserEmail?.trim()) errs.newUserEmail = 'Email is required';
          else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.newUserEmail)) errs.newUserEmail = 'Invalid email format';
        }
      }
      if (!formData.position) errs.position = 'Position is required';
      if (!formData.hourlyRate || parseFloat(formData.hourlyRate) <= 0) errs.hourlyRate = 'Valid hourly rate is required';
    } else {
      if (!formData.staffId) errs.staffId = 'Staff member is required';
      if (!formData.eventId) errs.eventId = 'Event is required';
      if (!formData.startTime) errs.startTime = 'Start time is required';
      if (!formData.endTime) errs.endTime = 'End time is required';
      if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) errs.endTime = 'End time must be after start time';
    }
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const openModal = (type, item = null) => {
    setModalType(type);
    setEditing(item);
    setError('');
    setValidationErrors({});
    if (type === 'staff') {
      setFormData(item ? {
        position: item.position,
        hourlyRate: item.hourlyRate.toString(),
        skills: item.skills || '',
        uniformSize: item.uniformSize || '',
        availability: item.availability || ''
      } : {
        userId: '',
        position: 'SERVER',
        hourlyRate: '',
        skills: '',
        uniformSize: '',
        availability: ''
      });
    } else {
      setFormData({
        staffId: '',
        eventId: '',
        role: 'SERVER',
        startTime: '',
        endTime: '',
        notes: ''
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateForm()) return;
    try {
      if (modalType === 'staff') {
        if (editing) {
          await api.put(`/staff/${editing.id}`, formData);
          toast?.success('Staff member updated successfully');
        } else {
          await api.post('/staff', formData);
          toast?.success('Staff member created successfully');
        }
      } else {
        await api.post('/staff/assignments', formData);
        toast?.success('Assignment created successfully');
      }
      setShowModal(false);
      setEditing(null);
      loadData();
    } catch (err) {
      console.error('Failed to save:', err);
      const msg = err.response?.data?.error || 'Failed to save. Please try again.';
      setError(msg);
      toast?.error(msg);
    }
  };

  const confirmAssignment = async (id) => {
    try {
      await api.put(`/staff/assignments/${id}`, { confirmed: true });
      toast?.success('Assignment confirmed');
      loadData();
    } catch (error) {
      console.error('Failed to confirm:', error);
      toast?.error('Failed to confirm assignment');
    }
  };

  const approveTimeEntry = async (id) => {
    try {
      await api.post(`/staff/time-entries/${id}/approve`);
      toast?.success('Time entry approved');
      loadData();
    } catch (error) {
      console.error('Failed to approve:', error);
      toast?.error('Failed to approve time entry');
    }
  };

  const handleDelete = (type, id) => {
    setConfirmDialog({
      isOpen: true,
      title: `Delete ${type === 'staff' ? 'Staff Member' : 'Assignment'}`,
      message: `Are you sure you want to delete this ${type === 'staff' ? 'staff member' : 'assignment'}? This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          if (type === 'staff') await api.delete(`/staff/${id}`);
          else await api.delete(`/staff/assignments/${id}`);
          toast?.success(`${type === 'staff' ? 'Staff member' : 'Assignment'} deleted`);
          loadData();
        } catch (error) {
          console.error('Failed to delete:', error);
          toast?.error('Failed to delete');
        }
        setConfirmDialog({ isOpen: false });
      },
      onCancel: () => setConfirmDialog({ isOpen: false })
    });
  };

  // Bulk operations
  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleSelectAll = () => setSelectedIds(prev => prev.length === staff.length ? [] : staff.map(s => s.id));

  const handleBulkDelete = () => {
    if (!selectedIds.length) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Selected Staff',
      message: `Are you sure you want to delete ${selectedIds.length} staff members? This cannot be undone.`,
      confirmLabel: 'Delete All',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.post('/staff/bulk-delete', { ids: selectedIds });
          toast?.success(`${selectedIds.length} staff members deleted`);
          setSelectedIds([]);
          loadData();
        } catch (error) {
          console.error('Failed to bulk delete:', error);
          toast?.error('Failed to delete selected staff');
        }
        setConfirmDialog({ isOpen: false });
      },
      onCancel: () => setConfirmDialog({ isOpen: false })
    });
  };

  const handleBulkPositionUpdate = async (position) => {
    if (!selectedIds.length || !position) return;
    try {
      await api.put('/staff/bulk-update', { ids: selectedIds, data: { position } });
      toast?.success(`${selectedIds.length} staff members updated to ${position}`);
      setSelectedIds([]);
      loadData();
    } catch (error) {
      console.error('Failed to bulk update:', error);
      toast?.error('Failed to update selected staff');
    }
  };

  // Sort
  const handleSort = (field) => {
    if (sortBy === field) setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('asc'); }
  };

  // PDF Export
  const exportPDF = async () => {
    try {
      let exportData = staff;
      try {
        const res = await api.get('/staff/export/pdf');
        if (res.data?.rows) {
          exportData = res.data.rows;
        }
      } catch {
        // fallback to current data
      }
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('Staff Report', 14, 22);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
      autoTable(doc, {
        startY: 35,
        head: [['Name', 'Email', 'Position', 'Rate', 'Skills', 'Active']],
        body: (exportData || []).map(s => [
          s.user?.name || s.name || '',
          s.user?.email || s.email || '',
          s.position || '',
          `$${s.hourlyRate || 0}/hr`,
          s.skills || '-',
          s.isActive !== undefined ? (s.isActive ? 'Yes' : 'No') : 'Yes'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] }
      });
      doc.save('staff-report.pdf');
      toast?.success('PDF exported successfully');
    } catch (error) {
      console.error('Failed to export PDF:', error);
      toast?.error('Failed to export PDF');
    }
  };

  if (loading) return <SkeletonGrid count={6} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
          <p className="text-gray-500">Manage staff, assignments, and time tracking</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportPDF} className="btn btn-secondary flex items-center gap-2">
            <Download size={18} /> PDF
          </button>
          <button
            onClick={() => openModal(activeTab === 'assignments' ? 'assignment' : 'staff')}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Add {activeTab === 'assignments' ? 'Assignment' : 'Staff'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {[
            { id: 'staff', label: 'Staff', count: pagination.total || staff.length },
            { id: 'assignments', label: 'Assignments', count: assignments.length },
            { id: 'time', label: 'Time Tracking', count: timeEntries.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedIds([]); }}
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

      {/* Search & Sort Bar */}
      {activeTab === 'staff' && (
        <div className="card">
          <div className="flex flex-wrap gap-4">
            <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" size={20} />
                <input
                  type="text"
                  placeholder="Search by name, position..."
                  className="input"
                  style={{ paddingLeft: '2.5rem' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onBlur={handleSearch}
                />
              </div>
            </form>
            <button onClick={() => handleSort(sortBy === 'name' ? 'position' : 'name')} className="btn btn-secondary flex items-center gap-1">
              <ArrowUpDown size={16} /> {sortBy} {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
            <div onClick={toggleSelectAll} className="btn btn-secondary flex items-center gap-1 cursor-pointer">
              {selectedIds.length === staff.length && staff.length > 0 ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} />}
              Select All
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedIds.length > 0 && activeTab === 'staff' && (
        <div className="card bg-indigo-50 border-indigo-200 flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium text-indigo-700">{selectedIds.length} selected</span>
          <button onClick={handleBulkDelete} className="btn btn-danger text-sm py-1">Delete Selected</button>
          <select
            className="select w-auto text-sm py-1"
            defaultValue=""
            onChange={(e) => { if (e.target.value) handleBulkPositionUpdate(e.target.value); e.target.value = ''; }}
          >
            <option value="">Change Position...</option>
            {positions.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <button onClick={() => setSelectedIds([])} className="ml-auto text-gray-500 hover:text-gray-700"><X size={18} /></button>
        </div>
      )}

      {/* Staff List */}
      {activeTab === 'staff' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staff.map((s) => (
              <div
                key={s.id}
                className={`card cursor-pointer hover:shadow-lg transition-shadow ${selectedIds.includes(s.id) ? 'ring-2 ring-indigo-500' : ''}`}
                onClick={() => setSelectedStaff(s)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div onClick={(e) => { e.stopPropagation(); toggleSelect(s.id); }} className="cursor-pointer">
                      {selectedIds.includes(s.id) ? <CheckSquare className="text-indigo-600" size={18} /> : <Square className="text-gray-400" size={18} />}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">
                      {s.user?.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{s.user?.name}</p>
                      <p className="text-sm text-gray-500">{s.position}</p>
                    </div>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => openModal('staff', s)} className="p-1 text-gray-400 hover:text-indigo-600">
                      <Edit size={18} />
                    </button>
                    <button onClick={() => handleDelete('staff', s.id)} className="p-1 text-gray-400 hover:text-red-600">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-500">
                  <p><span className="font-medium">Rate:</span> ${s.hourlyRate}/hr</p>
                  {s.skills && <p><span className="font-medium">Skills:</span> {s.skills}</p>}
                  {s.uniformSize && <p><span className="font-medium">Uniform:</span> {s.uniformSize}</p>}
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100">
                  <span className={`badge ${s.isActive ? 'badge-success' : 'badge-gray'}`}>
                    {s.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {staff.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No staff found</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by adding a new staff member.</p>
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
        </>
      )}

      {/* Assignments */}
      {activeTab === 'assignments' && (
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>Staff</th>
                <th>Event</th>
                <th>Role</th>
                <th>Time</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {assignments.map((a) => (
                <tr key={a.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setSelectedAssignment(a)}>
                  <td className="font-medium">{a.staff?.user?.name}</td>
                  <td>
                    <div>{a.event?.name}</div>
                    <div className="text-sm text-gray-500">
                      {format(new Date(a.startTime), 'MMM d')}
                    </div>
                  </td>
                  <td>{a.role}</td>
                  <td>
                    {format(new Date(a.startTime), 'h:mm a')} - {format(new Date(a.endTime), 'h:mm a')}
                  </td>
                  <td>
                    <span className={`badge ${a.confirmed ? 'badge-success' : 'badge-warning'}`}>
                      {a.confirmed ? 'Confirmed' : 'Pending'}
                    </span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      {!a.confirmed && (
                        <button onClick={() => confirmAssignment(a.id)} className="p-1 text-gray-400 hover:text-green-600" title="Confirm">
                          <CheckCircle size={18} />
                        </button>
                      )}
                      <button onClick={() => handleDelete('assignment', a.id)} className="p-1 text-gray-400 hover:text-red-600">
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

      {/* Time Tracking */}
      {activeTab === 'time' && (
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>Staff</th>
                <th>Date</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Break</th>
                <th>Total Hours</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {timeEntries.map((entry) => (
                <tr key={entry.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setSelectedTimeEntry(entry)}>
                  <td className="font-medium">{entry.staff?.user?.name}</td>
                  <td>{format(new Date(entry.date), 'MMM d, yyyy')}</td>
                  <td>{format(new Date(entry.clockIn), 'h:mm a')}</td>
                  <td>{entry.clockOut ? format(new Date(entry.clockOut), 'h:mm a') : '-'}</td>
                  <td>{entry.breakMinutes} min</td>
                  <td>{entry.totalHours?.toFixed(2) || '-'}</td>
                  <td>
                    <span className={`badge ${entry.approved ? 'badge-success' : 'badge-warning'}`}>
                      {entry.approved ? 'Approved' : 'Pending'}
                    </span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {!entry.approved && entry.clockOut && (
                      <button onClick={() => approveTimeEntry(entry.id)} className="p-1 text-gray-400 hover:text-green-600" title="Approve">
                        <CheckCircle size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setEditing(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editing ? 'Edit' : 'Add'} {modalType === 'staff' ? 'Staff' : 'Assignment'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                  {error}
                </div>
              )}
              {modalType === 'staff' ? (
                <>
                  {!editing && (
                    <div>
                      <label className="label">User</label>
                      {users.length > 0 ? (
                        <select
                          className={`select ${validationErrors.userId ? 'border-red-500' : ''}`}
                          value={formData.userId}
                          onChange={(e) => setFormData({...formData, userId: e.target.value, createNew: false})}
                          required={!formData.createNew}
                        >
                          <option value="">Select User</option>
                          {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">All staff users already have profiles. Create a new user below.</p>
                      )}
                      {validationErrors.userId && <p className="text-xs text-red-500 mt-1">{validationErrors.userId}</p>}
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                          <input type="checkbox" checked={formData.createNew || false} onChange={(e) => setFormData({...formData, createNew: e.target.checked, userId: ''})} />
                          Create new staff user
                        </label>
                        {formData.createNew && (
                          <div className="space-y-2">
                            <div>
                              <input type="text" className={`input ${validationErrors.newUserName ? 'border-red-500' : ''}`} placeholder="Full Name" value={formData.newUserName || ''} onChange={(e) => setFormData({...formData, newUserName: e.target.value})} />
                              {validationErrors.newUserName && <p className="text-xs text-red-500 mt-1">{validationErrors.newUserName}</p>}
                            </div>
                            <div>
                              <input type="email" className={`input ${validationErrors.newUserEmail ? 'border-red-500' : ''}`} placeholder="Email" value={formData.newUserEmail || ''} onChange={(e) => setFormData({...formData, newUserEmail: e.target.value})} />
                              {validationErrors.newUserEmail && <p className="text-xs text-red-500 mt-1">{validationErrors.newUserEmail}</p>}
                            </div>
                            <input type="text" className="input" placeholder="Phone (optional)" value={formData.newUserPhone || ''} onChange={(e) => setFormData({...formData, newUserPhone: e.target.value})} />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Position</label>
                      <select className={`select ${validationErrors.position ? 'border-red-500' : ''}`} value={formData.position} onChange={(e) => setFormData({...formData, position: e.target.value})}>
                        {positions.map(p => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                      {validationErrors.position && <p className="text-xs text-red-500 mt-1">{validationErrors.position}</p>}
                    </div>
                    <div>
                      <label className="label">Hourly Rate</label>
                      <input type="number" className={`input ${validationErrors.hourlyRate ? 'border-red-500' : ''}`} step="0.01" value={formData.hourlyRate} onChange={(e) => setFormData({...formData, hourlyRate: e.target.value})} />
                      {validationErrors.hourlyRate && <p className="text-xs text-red-500 mt-1">{validationErrors.hourlyRate}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="label">Skills</label>
                    <input type="text" className="input" value={formData.skills} onChange={(e) => setFormData({...formData, skills: e.target.value})} placeholder="e.g., Bartending, Food Safety" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Uniform Size</label>
                      <select className="select" value={formData.uniformSize} onChange={(e) => setFormData({...formData, uniformSize: e.target.value})}>
                        <option value="">Select Size</option>
                        {uniformSizes.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Availability</label>
                      <input type="text" className="input" placeholder="e.g., Weekends" value={formData.availability} onChange={(e) => setFormData({...formData, availability: e.target.value})} />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Staff</label>
                      <select className={`select ${validationErrors.staffId ? 'border-red-500' : ''}`} value={formData.staffId} onChange={(e) => setFormData({...formData, staffId: e.target.value})}>
                        <option value="">Select Staff</option>
                        {staff.map(s => (
                          <option key={s.id} value={s.id}>{s.user?.name}</option>
                        ))}
                      </select>
                      {validationErrors.staffId && <p className="text-xs text-red-500 mt-1">{validationErrors.staffId}</p>}
                    </div>
                    <div>
                      <label className="label">Event</label>
                      <select className={`select ${validationErrors.eventId ? 'border-red-500' : ''}`} value={formData.eventId} onChange={(e) => setFormData({...formData, eventId: e.target.value})}>
                        <option value="">Select Event</option>
                        {events.map(ev => (
                          <option key={ev.id} value={ev.id}>{ev.name}</option>
                        ))}
                      </select>
                      {validationErrors.eventId && <p className="text-xs text-red-500 mt-1">{validationErrors.eventId}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="label">Role</label>
                    <select className="select" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}>
                      {positions.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Start Time</label>
                      <input type="datetime-local" className={`input ${validationErrors.startTime ? 'border-red-500' : ''}`} value={formData.startTime} onChange={(e) => setFormData({...formData, startTime: e.target.value})} />
                      {validationErrors.startTime && <p className="text-xs text-red-500 mt-1">{validationErrors.startTime}</p>}
                    </div>
                    <div>
                      <label className="label">End Time</label>
                      <input type="datetime-local" className={`input ${validationErrors.endTime ? 'border-red-500' : ''}`} value={formData.endTime} onChange={(e) => setFormData({...formData, endTime: e.target.value})} />
                      {validationErrors.endTime && <p className="text-xs text-red-500 mt-1">{validationErrors.endTime}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="label">Notes</label>
                    <textarea className="input" rows="2" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
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

      {/* Assignment Detail Modal */}
      {selectedAssignment && (
        <div className="modal-overlay" onClick={() => setSelectedAssignment(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Assignment Details</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Staff Member</p>
                  <p className="font-medium">{selectedAssignment.staff?.user?.name}</p>
                  <p className="text-sm text-gray-500">{selectedAssignment.staff?.user?.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Role</p>
                  <p className="font-medium">{selectedAssignment.role}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Event</p>
                  <p className="font-medium">{selectedAssignment.event?.name}</p>
                  <p className="text-sm text-gray-500">{selectedAssignment.event?.venue?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`badge ${selectedAssignment.confirmed ? 'badge-success' : 'badge-warning'}`}>
                    {selectedAssignment.confirmed ? 'Confirmed' : 'Pending'}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Start Time</p>
                  <p className="font-medium">{format(new Date(selectedAssignment.startTime), 'MMM d, yyyy h:mm a')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">End Time</p>
                  <p className="font-medium">{format(new Date(selectedAssignment.endTime), 'MMM d, yyyy h:mm a')}</p>
                </div>
              </div>
              {selectedAssignment.notes && (
                <div>
                  <p className="text-sm text-gray-500">Notes</p>
                  <p className="text-gray-700">{selectedAssignment.notes}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => handleDelete('assignment', selectedAssignment.id)} className="btn btn-danger">Delete</button>
              <button onClick={() => setSelectedAssignment(null)} className="btn btn-secondary">Close</button>
              {!selectedAssignment.confirmed && (
                <button onClick={() => { confirmAssignment(selectedAssignment.id); setSelectedAssignment(null); }} className="btn btn-primary">Confirm Assignment</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Time Entry Detail Modal */}
      {selectedTimeEntry && (
        <div className="modal-overlay" onClick={() => setSelectedTimeEntry(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Time Entry Details</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Staff Member</p>
                  <p className="font-medium">{selectedTimeEntry.staff?.user?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">{format(new Date(selectedTimeEntry.date), 'MMMM d, yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Clock In</p>
                  <p className="font-medium">{format(new Date(selectedTimeEntry.clockIn), 'h:mm a')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Clock Out</p>
                  <p className="font-medium">{selectedTimeEntry.clockOut ? format(new Date(selectedTimeEntry.clockOut), 'h:mm a') : 'Not clocked out'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Break Time</p>
                  <p className="font-medium">{selectedTimeEntry.breakMinutes || 0} minutes</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Hours</p>
                  <p className="font-medium text-lg text-indigo-600">{selectedTimeEntry.totalHours?.toFixed(2) || '-'} hrs</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`badge ${selectedTimeEntry.approved ? 'badge-success' : 'badge-warning'}`}>
                    {selectedTimeEntry.approved ? 'Approved' : 'Pending Approval'}
                  </span>
                </div>
              </div>
              {selectedTimeEntry.notes && (
                <div>
                  <p className="text-sm text-gray-500">Notes</p>
                  <p className="text-gray-700">{selectedTimeEntry.notes}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setSelectedTimeEntry(null)} className="btn btn-secondary">Close</button>
              {!selectedTimeEntry.approved && selectedTimeEntry.clockOut && (
                <button onClick={() => { approveTimeEntry(selectedTimeEntry.id); setSelectedTimeEntry(null); }} className="btn btn-primary">Approve Entry</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Staff Detail Modal */}
      {selectedStaff && !showModal && (
        <div className="modal-overlay" onClick={() => setSelectedStaff(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Staff Details</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-2xl">
                  {selectedStaff.user?.name?.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{selectedStaff.user?.name}</h3>
                  <p className="text-gray-500">{selectedStaff.position}</p>
                </div>
                <div className="ml-auto">
                  <span className={`badge ${selectedStaff.isActive ? 'badge-success' : 'badge-gray'}`}>
                    {selectedStaff.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{selectedStaff.user?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{selectedStaff.user?.phone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Hourly Rate</p>
                  <p className="font-medium text-lg text-green-600">${selectedStaff.hourlyRate}/hr</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Uniform Size</p>
                  <p className="font-medium">{selectedStaff.uniformSize || 'Not specified'}</p>
                </div>
              </div>

              {selectedStaff.skills && (
                <div>
                  <p className="text-sm text-gray-500">Skills</p>
                  <p className="font-medium">{selectedStaff.skills}</p>
                </div>
              )}

              {selectedStaff.availability && (
                <div>
                  <p className="text-sm text-gray-500">Availability</p>
                  <p className="font-medium">{selectedStaff.availability}</p>
                </div>
              )}

              {selectedStaff.certifications && (
                <div>
                  <p className="text-sm text-gray-500">Certifications</p>
                  <p className="font-medium">{selectedStaff.certifications}</p>
                </div>
              )}

              {selectedStaff.emergencyContact && (
                <div>
                  <p className="text-sm text-gray-500">Emergency Contact</p>
                  <p className="font-medium">{selectedStaff.emergencyContact}</p>
                </div>
              )}

              {/* Assignments for this staff member */}
              {(() => {
                const staffAssignments = assignments.filter(a => a.staffId === selectedStaff.id);
                if (staffAssignments.length === 0) return null;
                return (
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-500 mb-2">Assignments ({staffAssignments.length})</p>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {staffAssignments.map(a => (
                        <div key={a.id} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                          <span>{a.event?.name} - {a.role}</span>
                          <span className={`badge text-xs ${a.confirmed ? 'badge-success' : 'badge-warning'}`}>
                            {a.confirmed ? 'Confirmed' : 'Pending'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Time entries for this staff member */}
              {(() => {
                const staffTime = timeEntries.filter(t => t.staffId === selectedStaff.id);
                if (staffTime.length === 0) return null;
                return (
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-500 mb-2">Recent Time Entries ({staffTime.length})</p>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {staffTime.slice(0, 5).map(t => (
                        <div key={t.id} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                          <span>{format(new Date(t.date), 'MMM d, yyyy')}</span>
                          <span className="font-medium text-indigo-600">{t.totalHours?.toFixed(2) || '-'} hrs</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <p className="text-sm text-gray-500">Hire Date</p>
                  <p className="font-medium">{selectedStaff.hireDate ? format(new Date(selectedStaff.hireDate), 'MMMM d, yyyy') : 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Member Since</p>
                  <p className="font-medium">{format(new Date(selectedStaff.createdAt), 'MMMM d, yyyy')}</p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  handleDelete('staff', selectedStaff.id);
                  setSelectedStaff(null);
                }}
                className="btn btn-danger"
              >
                Delete
              </button>
              <button onClick={() => setSelectedStaff(null)} className="btn btn-secondary">Close</button>
              <button onClick={() => { const s = selectedStaff; setSelectedStaff(null); openModal('staff', s); }} className="btn btn-primary">Edit Staff</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={confirmDialog.onCancel}
      />
    </div>
  );
}
