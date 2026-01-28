import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { format } from 'date-fns';
import {
  Calendar, MapPin, Users, FileText, DollarSign, Check, X, Clock,
  ChevronRight, Image, UtensilsCrossed
} from 'lucide-react';

export default function ClientPortal() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('dashboard');
  const [signatureData, setSignatureData] = useState('');
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadDashboard();
    }
  }, [user]);

  const loadDashboard = async () => {
    try {
      const res = await api.get('/client/dashboard', { params: { clientId: user.id } });
      setDashboard(res.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEventDetails = async (eventId) => {
    try {
      const res = await api.get(`/client/events/${eventId}`, { params: { clientId: user.id } });
      setSelectedEvent(res.data);
      setActiveView('event');
    } catch (error) {
      console.error('Failed to load event:', error);
    }
  };

  const loadProposalDetails = async (proposalId) => {
    try {
      const res = await api.get(`/client/proposals/${proposalId}`);
      setSelectedProposal(res.data);
      setActiveView('proposal');
    } catch (error) {
      console.error('Failed to load proposal:', error);
    }
  };

  const handleSignProposal = async () => {
    if (!signatureData.trim()) {
      alert('Please type your name to sign');
      return;
    }
    setSigning(true);
    try {
      await api.post(`/client/proposals/${selectedProposal.id}/sign`, {
        signedBy: signatureData,
        signatureData: signatureData
      });
      alert('Proposal accepted! Thank you.');
      setActiveView('dashboard');
      loadDashboard();
    } catch (error) {
      console.error('Failed to sign proposal:', error);
      alert('Failed to sign proposal');
    } finally {
      setSigning(false);
    }
  };

  const handleRejectProposal = async () => {
    const reason = prompt('Please provide a reason for declining (optional):');
    try {
      await api.post(`/client/proposals/${selectedProposal.id}/reject`, { reason });
      alert('Proposal declined.');
      setActiveView('dashboard');
      loadDashboard();
    } catch (error) {
      console.error('Failed to reject proposal:', error);
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Show message for non-client users
  if (user?.role !== 'CLIENT') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Client Portal</h1>
          <p className="text-gray-500">This portal is for client access only</p>
        </div>

        <div className="card bg-yellow-50 border border-yellow-200">
          <h3 className="font-semibold text-yellow-800 mb-3">Demo Mode</h3>
          <p className="text-gray-700 mb-4">
            You are logged in as <strong>{user?.role}</strong>. To view the Client Portal, log in with a client account.
          </p>
          <div className="bg-white rounded-lg p-4 border border-yellow-100">
            <p className="text-sm font-medium text-gray-700 mb-2">Test Client Accounts:</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li><strong>john@smithwedding.com</strong> - John Smith (2 events)</li>
              <li><strong>jane@techcorp.com</strong> - Jane Williams (3 events)</li>
              <li><strong>robert@events.com</strong> - Robert Brown (2 events)</li>
              <li><strong>emily@nonprofit.org</strong> - Emily Davis (2 events)</li>
              <li><strong>lisa@corporate.com</strong> - Lisa Anderson (2 events)</li>
            </ul>
            <p className="text-xs text-gray-500 mt-3">Password for all: <code className="bg-gray-100 px-1 rounded">password123</code></p>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard View
  if (activeView === 'dashboard') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.name}</h1>
          <p className="text-gray-500">Your catering dashboard</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card bg-indigo-50">
            <div className="flex items-center gap-3">
              <Calendar className="text-indigo-600" size={24} />
              <div>
                <p className="text-2xl font-bold text-indigo-600">{dashboard?.upcomingEvents?.length || 0}</p>
                <p className="text-sm text-gray-500">Upcoming Events</p>
              </div>
            </div>
          </div>
          <div className="card bg-yellow-50">
            <div className="flex items-center gap-3">
              <FileText className="text-yellow-600" size={24} />
              <div>
                <p className="text-2xl font-bold text-yellow-600">{dashboard?.pendingProposals?.length || 0}</p>
                <p className="text-sm text-gray-500">Pending Proposals</p>
              </div>
            </div>
          </div>
          <div className="card bg-red-50">
            <div className="flex items-center gap-3">
              <DollarSign className="text-red-600" size={24} />
              <div>
                <p className="text-2xl font-bold text-red-600">{dashboard?.pendingInvoices?.length || 0}</p>
                <p className="text-sm text-gray-500">Pending Invoices</p>
              </div>
            </div>
          </div>
          <div className="card bg-green-50">
            <div className="flex items-center gap-3">
              <Check className="text-green-600" size={24} />
              <div>
                <p className="text-2xl font-bold text-green-600">{dashboard?.totalEvents || 0}</p>
                <p className="text-sm text-gray-500">Total Events</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Proposals */}
        {dashboard?.pendingProposals?.length > 0 && (
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="text-yellow-600" size={20} />
              Action Required: Review Proposals
            </h2>
            <div className="space-y-3">
              {dashboard.pendingProposals.map(proposal => (
                <div
                  key={proposal.id}
                  className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg cursor-pointer hover:bg-yellow-100"
                  onClick={() => loadProposalDetails(proposal.id)}
                >
                  <div>
                    <p className="font-medium">{proposal.event?.name}</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(proposal.event?.date), 'MMM d, yyyy')} - ${proposal.totalAmount?.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge badge-warning">{proposal.status}</span>
                    <ChevronRight className="text-gray-400" size={20} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Events */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="text-indigo-600" size={20} />
            Upcoming Events
          </h2>
          {dashboard?.upcomingEvents?.length > 0 ? (
            <div className="space-y-3">
              {dashboard.upcomingEvents.map(event => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                  onClick={() => loadEventDetails(event.id)}
                >
                  <div>
                    <p className="font-medium">{event.name}</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(event.date), 'EEEE, MMMM d, yyyy')} | {event.guestCount} guests
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${getStatusBadge(event.status)}`}>
                      {event.status.replace('_', ' ')}
                    </span>
                    <ChevronRight className="text-gray-400" size={20} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No upcoming events</p>
          )}
        </div>

        {/* Pending Invoices */}
        {dashboard?.pendingInvoices?.length > 0 && (
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="text-red-600" size={20} />
              Pending Invoices
            </h2>
            <div className="space-y-3">
              {dashboard.pendingInvoices.map(invoice => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{invoice.invoiceNumber}</p>
                    <p className="text-sm text-gray-500">{invoice.event?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${invoice.total?.toLocaleString()}</p>
                    <span className={`badge ${
                      invoice.status === 'OVERDUE' ? 'badge-danger' : 'badge-warning'
                    }`}>
                      {invoice.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Event Detail View
  if (activeView === 'event' && selectedEvent) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setActiveView('dashboard')}
          className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
        >
          &larr; Back to Dashboard
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{selectedEvent.name}</h1>
            <p className="text-gray-500">
              {format(new Date(selectedEvent.date), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <span className={`badge ${getStatusBadge(selectedEvent.status)}`}>
            {selectedEvent.status.replace('_', ' ')}
          </span>
        </div>

        {/* Event Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card">
            <div className="flex items-center gap-3">
              <Clock className="text-indigo-600" size={24} />
              <div>
                <p className="text-sm text-gray-500">Time</p>
                <p className="font-medium">
                  {format(new Date(selectedEvent.startTime), 'h:mm a')} - {format(new Date(selectedEvent.endTime), 'h:mm a')}
                </p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <Users className="text-green-600" size={24} />
              <div>
                <p className="text-sm text-gray-500">Guest Count</p>
                <p className="font-medium">{selectedEvent.guestCount} guests</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <MapPin className="text-red-600" size={24} />
              <div>
                <p className="text-sm text-gray-500">Venue</p>
                <p className="font-medium">{selectedEvent.venue?.name || 'TBD'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Venue Details */}
        {selectedEvent.venue && (
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Venue Details</h3>
            <p className="text-gray-700">
              {selectedEvent.venue.address}<br />
              {selectedEvent.venue.city}, {selectedEvent.venue.state} {selectedEvent.venue.zipCode}
            </p>
            {selectedEvent.venue.parkingInfo && (
              <p className="text-sm text-gray-500 mt-2">
                <strong>Parking:</strong> {selectedEvent.venue.parkingInfo}
              </p>
            )}
          </div>
        )}

        {/* Timeline */}
        {selectedEvent.timeline?.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Event Timeline</h3>
            <div className="space-y-3">
              {selectedEvent.timeline.map(item => (
                <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-center min-w-[60px]">
                    <p className="font-medium">{format(new Date(item.time), 'h:mm')}</p>
                    <p className="text-xs text-gray-500">{format(new Date(item.time), 'a')}</p>
                  </div>
                  <div>
                    <p className="font-medium">{item.activity}</p>
                    {item.notes && <p className="text-sm text-gray-500">{item.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Photos */}
        {selectedEvent.photos?.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Image size={20} />
              Event Photos
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {selectedEvent.photos.map(photo => (
                <div key={photo.id} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={photo.url}
                    alt={photo.caption || 'Event photo'}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Proposal Detail View
  if (activeView === 'proposal' && selectedProposal) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setActiveView('dashboard')}
          className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
        >
          &larr; Back to Dashboard
        </button>

        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Proposal for {selectedProposal.event?.name}</h1>
              <p className="text-gray-500">
                {format(new Date(selectedProposal.event?.date), 'MMMM d, yyyy')} | {selectedProposal.event?.guestCount} guests
              </p>
            </div>
            <span className={`badge ${
              selectedProposal.status === 'ACCEPTED' ? 'badge-success' :
              selectedProposal.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'
            }`}>
              {selectedProposal.status}
            </span>
          </div>

          {/* Menu Options */}
          {selectedProposal.menus?.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <UtensilsCrossed size={20} />
                Menu Selection
              </h3>
              {selectedProposal.menus.map(menu => (
                <div key={menu.id} className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{menu.package?.name}</h4>
                      <p className="text-sm text-gray-500">{menu.package?.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">${menu.pricePerPerson}/person</p>
                      <p className="text-sm text-gray-500">{menu.guestCount} guests = ${(menu.pricePerPerson * menu.guestCount).toLocaleString()}</p>
                    </div>
                  </div>
                  {menu.package?.items?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-700 mb-2">Menu Items:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {menu.package.items.map(item => (
                          <div key={item.id} className="text-sm">
                            <span className="text-gray-700">{item.menuItem?.name}</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.menuItem?.isVegetarian && <span className="badge badge-success text-xs">V</span>}
                              {item.menuItem?.isVegan && <span className="badge badge-success text-xs">VG</span>}
                              {item.menuItem?.isGlutenFree && <span className="badge badge-warning text-xs">GF</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Line Items */}
          {selectedProposal.lineItems?.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Additional Items</h3>
              <div className="space-y-2">
                {selectedProposal.lineItems.map(item => (
                  <div key={item.id} className="flex justify-between py-2 border-b border-gray-100">
                    <span>{item.description}</span>
                    <span className="font-medium">${item.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total */}
          <div className="bg-indigo-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium">Total Amount</span>
              <span className="text-2xl font-bold text-indigo-600">
                ${selectedProposal.totalAmount?.toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Valid until {format(new Date(selectedProposal.validUntil), 'MMMM d, yyyy')}
            </p>
          </div>

          {/* Sign Section */}
          {(selectedProposal.status === 'SENT' || selectedProposal.status === 'VIEWED') && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">Accept Proposal</h3>
              <p className="text-sm text-gray-500 mb-4">
                By typing your name below and clicking "Accept", you agree to the terms of this proposal.
              </p>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="label">Signature (Type your full name)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="John Doe"
                    value={signatureData}
                    onChange={(e) => setSignatureData(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleSignProposal}
                  disabled={signing}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Check size={18} />
                  {signing ? 'Processing...' : 'Accept Proposal'}
                </button>
                <button
                  onClick={handleRejectProposal}
                  className="btn btn-secondary flex items-center gap-2 text-red-600"
                >
                  <X size={18} />
                  Decline
                </button>
              </div>
            </div>
          )}

          {selectedProposal.status === 'ACCEPTED' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700">
                <Check size={20} />
                <span className="font-medium">Proposal Accepted</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Signed by {selectedProposal.signedBy} on {format(new Date(selectedProposal.signedAt), 'MMMM d, yyyy')}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
