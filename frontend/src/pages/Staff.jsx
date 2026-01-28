import { useState, useEffect } from 'react';
import api from '../utils/api';
import { format } from 'date-fns';
import { Plus, Users, Clock, Calendar, Edit, Trash2, CheckCircle } from 'lucide-react';

export default function Staff() {
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
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedTimeEntry, setSelectedTimeEntry] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [staffRes, assignmentsRes, timeRes, eventsRes, usersRes, positionsRes, uniformSizesRes] = await Promise.all([
        api.get('/staff'),
        api.get('/staff/assignments/all'),
        api.get('/staff/time-entries/all'),
        api.get('/events'),
        api.get('/auth/users'),
        api.get('/staff/options/positions'),
        api.get('/staff/options/uniform-sizes')
      ]);
      setStaff(staffRes.data);
      setAssignments(assignmentsRes.data);
      setTimeEntries(timeRes.data);
      setEvents(eventsRes.data);
      // Filter users who don't already have a staff profile
      const staffUserIds = staffRes.data.map(s => s.userId);
      setUsers(usersRes.data.filter(u => u.role === 'STAFF' && !staffUserIds.includes(u.id)));
      setPositions(positionsRes.data);
      setUniformSizes(uniformSizesRes.data);
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
    try {
      if (modalType === 'staff') {
        if (editing) {
          await api.put(`/staff/${editing.id}`, formData);
        } else {
          await api.post('/staff', formData);
        }
      } else {
        await api.post('/staff/assignments', formData);
      }
      setShowModal(false);
      setEditing(null);
      loadData();
    } catch (err) {
      console.error('Failed to save:', err);
      setError(err.response?.data?.error || 'Failed to save. Please try again.');
    }
  };

  const confirmAssignment = async (id) => {
    try {
      await api.put(`/staff/assignments/${id}`, { confirmed: true });
      loadData();
    } catch (error) {
      console.error('Failed to confirm:', error);
    }
  };

  const approveTimeEntry = async (id) => {
    try {
      await api.post(`/staff/time-entries/${id}/approve`);
      loadData();
    } catch (error) {
      console.error('Failed to approve:', error);
    }
  };

  const handleDelete = async (type, id) => {
    if (!confirm('Are you sure?')) return;
    try {
      if (type === 'staff') await api.delete(`/staff/${id}`);
      else await api.delete(`/staff/assignments/${id}`);
      loadData();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
          <p className="text-gray-500">Manage staff, assignments, and time tracking</p>
        </div>
        <button
          onClick={() => openModal(activeTab === 'assignments' ? 'assignment' : 'staff')}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Add {activeTab === 'assignments' ? 'Assignment' : 'Staff'}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {[
            { id: 'staff', label: 'Staff', count: staff.length },
            { id: 'assignments', label: 'Assignments', count: assignments.length },
            { id: 'time', label: 'Time Tracking', count: timeEntries.length }
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

      {/* Staff List */}
      {activeTab === 'staff' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((s) => (
            <div key={s.id} className="card cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedStaff(s)}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
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

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
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
                        <select className="select" value={formData.userId} onChange={(e) => setFormData({...formData, userId: e.target.value, createNew: false})} required={!formData.createNew}>
                          <option value="">Select User</option>
                          {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">All staff users already have profiles. Create a new user below.</p>
                      )}
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                          <input type="checkbox" checked={formData.createNew || false} onChange={(e) => setFormData({...formData, createNew: e.target.checked, userId: ''})} />
                          Create new staff user
                        </label>
                        {formData.createNew && (
                          <div className="space-y-2">
                            <input type="text" className="input" placeholder="Full Name" value={formData.newUserName || ''} onChange={(e) => setFormData({...formData, newUserName: e.target.value})} required />
                            <input type="email" className="input" placeholder="Email" value={formData.newUserEmail || ''} onChange={(e) => setFormData({...formData, newUserEmail: e.target.value})} required />
                            <input type="text" className="input" placeholder="Phone (optional)" value={formData.newUserPhone || ''} onChange={(e) => setFormData({...formData, newUserPhone: e.target.value})} />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Position</label>
                      <select className="select" value={formData.position} onChange={(e) => setFormData({...formData, position: e.target.value})}>
                        {positions.map(p => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Hourly Rate</label>
                      <input type="number" className="input" step="0.01" value={formData.hourlyRate} onChange={(e) => setFormData({...formData, hourlyRate: e.target.value})} required />
                    </div>
                  </div>
                  <div>
                    <label className="label">Skills</label>
                    <input type="text" className="input" value={formData.skills} onChange={(e) => setFormData({...formData, skills: e.target.value})} />
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
                      <select className="select" value={formData.staffId} onChange={(e) => setFormData({...formData, staffId: e.target.value})} required>
                        <option value="">Select Staff</option>
                        {staff.map(s => (
                          <option key={s.id} value={s.id}>{s.user?.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Event</label>
                      <select className="select" value={formData.eventId} onChange={(e) => setFormData({...formData, eventId: e.target.value})} required>
                        <option value="">Select Event</option>
                        {events.map(e => (
                          <option key={e.id} value={e.id}>{e.name}</option>
                        ))}
                      </select>
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
                      <input type="datetime-local" className="input" value={formData.startTime} onChange={(e) => setFormData({...formData, startTime: e.target.value})} required />
                    </div>
                    <div>
                      <label className="label">End Time</label>
                      <input type="datetime-local" className="input" value={formData.endTime} onChange={(e) => setFormData({...formData, endTime: e.target.value})} required />
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
        <div className="modal-overlay">
          <div className="modal-content">
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
        <div className="modal-overlay">
          <div className="modal-content">
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
      {selectedStaff && (
        <div className="modal-overlay">
          <div className="modal-content">
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
              <button onClick={() => setSelectedStaff(null)} className="btn btn-secondary">Close</button>
              <button onClick={() => { setSelectedStaff(null); openModal('staff', selectedStaff); }} className="btn btn-primary">Edit Staff</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
