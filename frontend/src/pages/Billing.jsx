import { useState, useEffect } from 'react';
import api from '../utils/api';
import { format } from 'date-fns';
import { Plus, CreditCard, FileText, DollarSign, Send, Eye, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Billing() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [events, setEvents] = useState([]);
  const [invoiceTypes, setInvoiceTypes] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('invoices');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('invoice');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [formData, setFormData] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [invoicesRes, paymentsRes, eventsRes, typesRes, methodsRes] = await Promise.all([
        api.get('/billing/invoices'),
        api.get('/billing/payments'),
        api.get('/events'),
        api.get('/billing/options/invoice-types'),
        api.get('/billing/options/payment-methods')
      ]);
      setInvoices(invoicesRes.data);
      setPayments(paymentsRes.data);
      setEvents(eventsRes.data);
      setInvoiceTypes(typesRes.data);
      setPaymentMethods(methodsRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openInvoiceModal = () => {
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    setError('');
    setFormData({
      eventId: '',
      type: 'FINAL',
      subtotal: '',
      taxRate: '8',
      gratuity: '0',
      dueDate: format(nextMonth, 'yyyy-MM-dd'),
      notes: '',
      lineItems: [{ description: '', quantity: '1', unitPrice: '' }]
    });
    setModalType('invoice');
    setShowModal(true);
  };

  const openPaymentModal = (invoice) => {
    setSelectedInvoice(invoice);
    setError('');
    setFormData({
      invoiceId: invoice.id,
      amount: '',
      method: 'CREDIT_CARD',
      reference: '',
      notes: ''
    });
    setModalType('payment');
    setShowModal(true);
  };

  const calculateTotals = () => {
    const lineTotal = formData.lineItems?.reduce((sum, l) =>
      sum + (parseFloat(l.unitPrice) || 0) * (parseInt(l.quantity) || 1), 0) || 0;
    const subtotal = parseFloat(formData.subtotal) || lineTotal;
    const taxAmount = (subtotal * (parseFloat(formData.taxRate) || 0)) / 100;
    const total = subtotal + taxAmount + (parseFloat(formData.gratuity) || 0);
    return { subtotal, taxAmount, total };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (modalType === 'invoice') {
        const { subtotal } = calculateTotals();
        await api.post('/billing/invoices', {
          ...formData,
          createdById: user.id,
          subtotal
        });
      } else {
        await api.post('/billing/payments', formData);
      }
      setShowModal(false);
      setSelectedInvoice(null);
      loadData();
    } catch (err) {
      console.error('Failed to save:', err);
      setError(err.response?.data?.error || 'Failed to save. Please try again.');
    }
  };

  const sendInvoice = async (id) => {
    try {
      await api.post(`/billing/invoices/${id}/send`);
      loadData();
    } catch (error) {
      console.error('Failed to send:', error);
    }
  };

  const handleDelete = async (type, id) => {
    if (!confirm('Are you sure?')) return;
    try {
      if (type === 'invoice') await api.delete(`/billing/invoices/${id}`);
      else await api.delete(`/billing/payments/${id}`);
      loadData();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      DRAFT: 'badge-gray',
      SENT: 'badge-info',
      VIEWED: 'badge-warning',
      PARTIALLY_PAID: 'badge-warning',
      PAID: 'badge-success',
      OVERDUE: 'badge-danger',
      CANCELLED: 'badge-gray'
    };
    return badges[status] || 'badge-gray';
  };

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalPending = invoices
    .filter(i => ['SENT', 'VIEWED', 'PARTIALLY_PAID'].includes(i.status))
    .reduce((sum, i) => sum + i.total, 0);

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
          <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
          <p className="text-gray-500">Manage invoices and payments</p>
        </div>
        <button onClick={openInvoiceModal} className="btn btn-primary flex items-center gap-2">
          <Plus size={20} />
          New Invoice
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-lg">
              <DollarSign className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <FileText className="text-yellow-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-gray-900">${totalPending.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <CreditCard className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Payments This Month</p>
              <p className="text-2xl font-bold text-gray-900">{payments.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {[
            { id: 'invoices', label: 'Invoices', count: invoices.length },
            { id: 'payments', label: 'Payments', count: payments.length }
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

      {/* Invoices */}
      {activeTab === 'invoices' && (
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Event</th>
                <th>Client</th>
                <th>Type</th>
                <th>Total</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setSelectedInvoice(invoice)}>
                  <td className="font-medium">{invoice.invoiceNumber}</td>
                  <td>{invoice.event?.name}</td>
                  <td>{invoice.event?.client?.name}</td>
                  <td>{invoice.type}</td>
                  <td className="font-medium">${invoice.total.toLocaleString()}</td>
                  <td>{format(new Date(invoice.dueDate), 'MMM d, yyyy')}</td>
                  <td>
                    <span className={`badge ${getStatusBadge(invoice.status)}`}>
                      {invoice.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      <button onClick={() => setSelectedInvoice(invoice)} className="p-1 text-gray-400 hover:text-indigo-600" title="View">
                        <Eye size={18} />
                      </button>
                      {invoice.status === 'DRAFT' && (
                        <button onClick={() => sendInvoice(invoice.id)} className="p-1 text-gray-400 hover:text-green-600" title="Send">
                          <Send size={18} />
                        </button>
                      )}
                      {['SENT', 'VIEWED', 'PARTIALLY_PAID'].includes(invoice.status) && (
                        <button onClick={() => openPaymentModal(invoice)} className="p-1 text-gray-400 hover:text-green-600" title="Record Payment">
                          <DollarSign size={18} />
                        </button>
                      )}
                      <button onClick={() => handleDelete('invoice', invoice.id)} className="p-1 text-gray-400 hover:text-red-600" title="Delete">
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

      {/* Payments */}
      {activeTab === 'payments' && (
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Invoice</th>
                <th>Event</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr key={payment.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setSelectedPayment(payment)}>
                  <td>{format(new Date(payment.receivedAt), 'MMM d, yyyy')}</td>
                  <td>{payment.invoice?.invoiceNumber}</td>
                  <td>{payment.invoice?.event?.name}</td>
                  <td className="font-medium text-green-600">${payment.amount.toLocaleString()}</td>
                  <td>{payment.method.replace('_', ' ')}</td>
                  <td>{payment.reference || '-'}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => handleDelete('payment', payment.id)} className="p-1 text-gray-400 hover:text-red-600">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showModal && modalType === 'invoice' && (
        <div className="modal-overlay">
          <div className="modal-content max-w-2xl">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">New Invoice</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Event</label>
                  <select className="select" value={formData.eventId} onChange={(e) => setFormData({...formData, eventId: e.target.value})} required>
                    <option value="">Select Event</option>
                    {events.map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Type</label>
                  <select className="select" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}>
                    {invoiceTypes.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label">Line Items</label>
                  <button type="button" onClick={() => setFormData({
                    ...formData,
                    lineItems: [...formData.lineItems, { description: '', quantity: '1', unitPrice: '' }]
                  })} className="text-indigo-600 text-sm">+ Add Item</button>
                </div>
                {formData.lineItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input type="text" className="input flex-1" placeholder="Description" value={item.description}
                      onChange={(e) => {
                        const items = [...formData.lineItems];
                        items[idx].description = e.target.value;
                        setFormData({...formData, lineItems: items});
                      }} required />
                    <input type="number" className="input w-20" placeholder="Qty" value={item.quantity}
                      onChange={(e) => {
                        const items = [...formData.lineItems];
                        items[idx].quantity = e.target.value;
                        setFormData({...formData, lineItems: items});
                      }} />
                    <input type="number" className="input w-28" placeholder="Price" step="0.01" value={item.unitPrice}
                      onChange={(e) => {
                        const items = [...formData.lineItems];
                        items[idx].unitPrice = e.target.value;
                        setFormData({...formData, lineItems: items});
                      }} required />
                    <button type="button" onClick={() => setFormData({
                      ...formData, lineItems: formData.lineItems.filter((_, i) => i !== idx)
                    })} className="text-red-600"><Trash2 size={18} /></button>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Tax Rate (%)</label>
                  <input type="number" className="input" step="0.01" value={formData.taxRate}
                    onChange={(e) => setFormData({...formData, taxRate: e.target.value})} />
                </div>
                <div>
                  <label className="label">Gratuity</label>
                  <input type="number" className="input" step="0.01" value={formData.gratuity}
                    onChange={(e) => setFormData({...formData, gratuity: e.target.value})} />
                </div>
                <div>
                  <label className="label">Due Date</label>
                  <input type="date" className="input" value={formData.dueDate}
                    onChange={(e) => setFormData({...formData, dueDate: e.target.value})} required />
                </div>
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea className="input" rows="2" value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})} />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="text-lg font-bold">Total: ${calculateTotals().total.toLocaleString()}</div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary">Create Invoice</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showModal && modalType === 'payment' && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Record Payment</h2>
              <p className="text-sm text-gray-500">Invoice: {selectedInvoice?.invoiceNumber}</p>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Amount</label>
                <input type="number" className="input" step="0.01" value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  placeholder={`Outstanding: $${selectedInvoice?.total}`} required />
              </div>
              <div>
                <label className="label">Payment Method</label>
                <select className="select" value={formData.method}
                  onChange={(e) => setFormData({...formData, method: e.target.value})}>
                  {paymentMethods.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Reference #</label>
                <input type="text" className="input" value={formData.reference}
                  onChange={(e) => setFormData({...formData, reference: e.target.value})}
                  placeholder="Check #, transaction ID, etc." />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input" rows="2" value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})} />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => { setShowModal(false); setSelectedInvoice(null); }} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-success">Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Invoice Modal */}
      {selectedInvoice && !showModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">{selectedInvoice.invoiceNumber}</h2>
                <span className={`badge ${getStatusBadge(selectedInvoice.status)}`}>{selectedInvoice.status}</span>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Event</p>
                  <p className="font-medium">{selectedInvoice.event?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Client</p>
                  <p className="font-medium">{selectedInvoice.event?.client?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Due Date</p>
                  <p className="font-medium">{format(new Date(selectedInvoice.dueDate), 'MMMM d, yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-medium">{selectedInvoice.type}</p>
                </div>
              </div>

              {selectedInvoice.lineItems?.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Line Items</p>
                  {selectedInvoice.lineItems.map((item) => (
                    <div key={item.id} className="flex justify-between p-2 bg-gray-50 rounded mb-1">
                      <span>{item.description} x{item.quantity}</span>
                      <span className="font-medium">${item.total.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex justify-between"><span>Subtotal</span><span>${selectedInvoice.subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Tax ({selectedInvoice.taxRate}%)</span><span>${selectedInvoice.taxAmount.toLocaleString()}</span></div>
                {selectedInvoice.gratuity > 0 && (
                  <div className="flex justify-between"><span>Gratuity</span><span>${selectedInvoice.gratuity.toLocaleString()}</span></div>
                )}
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span><span>${selectedInvoice.total.toLocaleString()}</span>
                </div>
              </div>

              {selectedInvoice.payments?.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Payments Received</p>
                  {selectedInvoice.payments.map((p) => (
                    <div key={p.id} className="flex justify-between p-2 bg-green-50 rounded mb-1">
                      <span>{format(new Date(p.receivedAt), 'MMM d')} - {p.method}</span>
                      <span className="font-medium text-green-600">${p.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button onClick={() => setSelectedInvoice(null)} className="btn btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* View Payment Modal */}
      {selectedPayment && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Payment Details</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-center mb-4">
                <p className="text-3xl font-bold text-green-600">${selectedPayment.amount.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Payment Received</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">{format(new Date(selectedPayment.receivedAt), 'MMMM d, yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Method</p>
                  <p className="font-medium">{selectedPayment.method.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Invoice</p>
                  <p className="font-medium">{selectedPayment.invoice?.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Event</p>
                  <p className="font-medium">{selectedPayment.invoice?.event?.name}</p>
                </div>
                {selectedPayment.reference && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Reference</p>
                    <p className="font-medium">{selectedPayment.reference}</p>
                  </div>
                )}
                {selectedPayment.notes && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Notes</p>
                    <p className="text-gray-700">{selectedPayment.notes}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button onClick={() => setSelectedPayment(null)} className="btn btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
