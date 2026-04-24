import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import { SkeletonGrid, SkeletonTable } from '../components/SkeletonLoader';
import {
  Plus, CreditCard, FileText, DollarSign, Send, Eye, Trash2, Edit,
  Search, ArrowUpDown, Download, CheckSquare, Square, X
} from 'lucide-react';

export default function Billing() {
  const { user } = useAuth();
  const toast = useToast();
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [events, setEvents] = useState([]);
  const [invoiceTypes, setInvoiceTypes] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('invoices');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('invoice');
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [formData, setFormData] = useState({});
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  // Pagination (invoices)
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Search & Sort
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentSearchTerm, setPaymentSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState([]);

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });

  useEffect(() => {
    loadData();
  }, [page, limit, sortBy, sortOrder]);

  const loadData = async () => {
    try {
      const [invoicesRes, paymentsRes, eventsRes, typesRes, methodsRes] = await Promise.all([
        api.get('/billing/invoices', { params: { page, limit, sortBy, sortOrder, search: searchTerm || undefined } }),
        api.get('/billing/payments'),
        api.get('/events'),
        api.get('/billing/options/invoice-types'),
        api.get('/billing/options/payment-methods')
      ]);
      const invData = invoicesRes.data.data || invoicesRes.data;
      setInvoices(Array.isArray(invData) ? invData : []);
      if (invoicesRes.data.pagination) setPagination(invoicesRes.data.pagination);
      else if (Array.isArray(invoicesRes.data)) setPagination({ total: invoicesRes.data.length, totalPages: 1 });

      const payData = paymentsRes.data.data || paymentsRes.data;
      setPayments(Array.isArray(payData) ? payData : []);
      const evtData = eventsRes.data.data || eventsRes.data;
      setEvents(Array.isArray(evtData) ? evtData : []);
      setInvoiceTypes(typesRes.data);
      setPaymentMethods(methodsRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast?.error('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e?.preventDefault?.();
    setPage(1);
    loadData();
  };

  // Validation
  const validateInvoiceForm = () => {
    const errs = {};
    if (!formData.eventId) errs.eventId = 'Event is required';
    if (!formData.type) errs.type = 'Invoice type is required';
    if (!formData.dueDate) errs.dueDate = 'Due date is required';
    if (formData.lineItems && formData.lineItems.length > 0) {
      formData.lineItems.forEach((item, idx) => {
        if (!item.description?.trim()) errs[`lineItem_${idx}_desc`] = 'Description required';
        if (!item.unitPrice || parseFloat(item.unitPrice) <= 0) errs[`lineItem_${idx}_price`] = 'Valid price required';
      });
    }
    if (formData.taxRate && (parseFloat(formData.taxRate) < 0 || parseFloat(formData.taxRate) > 100)) errs.taxRate = 'Tax rate must be 0-100';
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validatePaymentForm = () => {
    const errs = {};
    if (!formData.amount || parseFloat(formData.amount) <= 0) errs.amount = 'Valid amount is required';
    if (!formData.method) errs.method = 'Payment method is required';
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const openInvoiceModal = (invoice = null) => {
    setEditingInvoice(invoice);
    setError('');
    setValidationErrors({});
    if (invoice) {
      setFormData({
        eventId: invoice.eventId,
        type: invoice.type,
        subtotal: invoice.subtotal?.toString() || '',
        taxRate: invoice.taxRate?.toString() || '8',
        gratuity: invoice.gratuity?.toString() || '0',
        dueDate: format(new Date(invoice.dueDate), 'yyyy-MM-dd'),
        notes: invoice.notes || '',
        lineItems: invoice.lineItems?.map(li => ({
          description: li.description,
          quantity: li.quantity?.toString() || '1',
          unitPrice: li.unitPrice?.toString() || ''
        })) || [{ description: '', quantity: '1', unitPrice: '' }]
      });
    } else {
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);
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
    }
    setModalType('invoice');
    setShowModal(true);
  };

  const openPaymentModal = (invoice) => {
    setSelectedInvoice(invoice);
    setError('');
    setValidationErrors({});
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
        if (!validateInvoiceForm()) return;
        const { subtotal } = calculateTotals();
        if (editingInvoice) {
          await api.put(`/billing/invoices/${editingInvoice.id}`, {
            ...formData,
            subtotal
          });
          toast?.success('Invoice updated successfully');
        } else {
          await api.post('/billing/invoices', {
            ...formData,
            createdById: user.id,
            subtotal
          });
          toast?.success('Invoice created successfully');
        }
      } else {
        if (!validatePaymentForm()) return;
        await api.post('/billing/payments', formData);
        toast?.success('Payment recorded successfully');
      }
      setShowModal(false);
      setSelectedInvoice(null);
      setEditingInvoice(null);
      loadData();
    } catch (err) {
      console.error('Failed to save:', err);
      const msg = err.response?.data?.error || 'Failed to save. Please try again.';
      setError(msg);
      toast?.error(msg);
    }
  };

  const sendInvoice = async (id) => {
    try {
      await api.post(`/billing/invoices/${id}/send`);
      toast?.success('Invoice sent');
      loadData();
    } catch (error) {
      console.error('Failed to send:', error);
      toast?.error('Failed to send invoice');
    }
  };

  const handleDelete = (type, id) => {
    setConfirmDialog({
      isOpen: true,
      title: `Delete ${type === 'invoice' ? 'Invoice' : 'Payment'}`,
      message: `Are you sure you want to delete this ${type}? This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          if (type === 'invoice') await api.delete(`/billing/invoices/${id}`);
          else await api.delete(`/billing/payments/${id}`);
          toast?.success(`${type === 'invoice' ? 'Invoice' : 'Payment'} deleted`);
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
  const toggleSelectAll = () => setSelectedIds(prev => prev.length === invoices.length ? [] : invoices.map(i => i.id));

  const handleBulkDelete = () => {
    if (!selectedIds.length) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Selected Invoices',
      message: `Are you sure you want to delete ${selectedIds.length} invoices? This cannot be undone.`,
      confirmLabel: 'Delete All',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.post('/billing/invoices/bulk-delete', { ids: selectedIds });
          toast?.success(`${selectedIds.length} invoices deleted`);
          setSelectedIds([]);
          loadData();
        } catch (error) {
          console.error('Failed to bulk delete:', error);
          toast?.error('Failed to delete selected invoices');
        }
        setConfirmDialog({ isOpen: false });
      },
      onCancel: () => setConfirmDialog({ isOpen: false })
    });
  };

  const handleBulkStatusUpdate = async (status) => {
    if (!selectedIds.length || !status) return;
    try {
      await api.put('/billing/invoices/bulk-update', { ids: selectedIds, data: { status } });
      toast?.success(`${selectedIds.length} invoices updated to ${status.replace('_', ' ')}`);
      setSelectedIds([]);
      loadData();
    } catch (error) {
      console.error('Failed to bulk update:', error);
      toast?.error('Failed to update selected invoices');
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
      let exportData = invoices;
      try {
        const res = await api.get('/billing/invoices/export/pdf');
        if (res.data?.rows) {
          exportData = res.data.rows;
        }
      } catch {
        // fallback to current data
      }
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('Invoices Report', 14, 22);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
      autoTable(doc, {
        startY: 35,
        head: [['Invoice #', 'Event', 'Type', 'Status', 'Subtotal', 'Tax', 'Total', 'Due Date']],
        body: (exportData || []).map(inv => [
          inv.invoiceNumber || '',
          inv.event?.name || inv.eventName || '',
          inv.type || '',
          inv.status || '',
          `$${(inv.subtotal || 0).toLocaleString()}`,
          `$${(inv.taxAmount || 0).toLocaleString()}`,
          `$${(inv.total || 0).toLocaleString()}`,
          inv.dueDate ? format(new Date(inv.dueDate), 'MMM d, yyyy') : ''
        ]),
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] }
      });
      doc.save('invoices-report.pdf');
      toast?.success('PDF exported successfully');
    } catch (error) {
      console.error('Failed to export PDF:', error);
      toast?.error('Failed to export PDF');
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

  const invoiceStatuses = [
    { value: 'DRAFT', label: 'Draft' },
    { value: 'SENT', label: 'Sent' },
    { value: 'VIEWED', label: 'Viewed' },
    { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
    { value: 'PAID', label: 'Paid' },
    { value: 'OVERDUE', label: 'Overdue' },
    { value: 'CANCELLED', label: 'Cancelled' }
  ];

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalPending = invoices
    .filter(i => ['SENT', 'VIEWED', 'PARTIALLY_PAID'].includes(i.status))
    .reduce((sum, i) => sum + i.total, 0);

  // Filtered payments for search
  const filteredPayments = payments.filter(p => {
    if (!paymentSearchTerm) return true;
    const term = paymentSearchTerm.toLowerCase();
    return (
      p.invoice?.invoiceNumber?.toLowerCase().includes(term) ||
      p.invoice?.event?.name?.toLowerCase().includes(term) ||
      p.method?.toLowerCase().includes(term) ||
      p.reference?.toLowerCase().includes(term)
    );
  });

  if (loading) return <SkeletonGrid count={3} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
          <p className="text-gray-500">Manage invoices and payments</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportPDF} className="btn btn-secondary flex items-center gap-2">
            <Download size={18} /> PDF
          </button>
          <button onClick={() => openInvoiceModal()} className="btn btn-primary flex items-center gap-2">
            <Plus size={20} />
            New Invoice
          </button>
        </div>
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
            { id: 'invoices', label: 'Invoices', count: pagination.total || invoices.length },
            { id: 'payments', label: 'Payments', count: payments.length }
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

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <>
          {/* Search & Sort Bar */}
          <div className="card">
            <div className="flex flex-wrap gap-4">
              <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" size={20} />
                  <input
                    type="text"
                    placeholder="Search by invoice #, event name..."
                    className="input"
                    style={{ paddingLeft: '2.5rem' }}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onBlur={handleSearch}
                  />
                </div>
              </form>
              <button onClick={() => handleSort(sortBy === 'createdAt' ? 'total' : sortBy === 'total' ? 'dueDate' : 'createdAt')} className="btn btn-secondary flex items-center gap-1">
                <ArrowUpDown size={16} /> {sortBy === 'createdAt' ? 'Date' : sortBy} {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
              <div onClick={toggleSelectAll} className="btn btn-secondary flex items-center gap-1 cursor-pointer">
                {selectedIds.length === invoices.length && invoices.length > 0 ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} />}
                Select All
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedIds.length > 0 && (
            <div className="card bg-indigo-50 border-indigo-200 flex flex-wrap items-center gap-4">
              <span className="text-sm font-medium text-indigo-700">{selectedIds.length} selected</span>
              <button onClick={handleBulkDelete} className="btn btn-danger text-sm py-1">Delete Selected</button>
              <select
                className="select w-auto text-sm py-1"
                defaultValue=""
                onChange={(e) => { if (e.target.value) handleBulkStatusUpdate(e.target.value); e.target.value = ''; }}
              >
                <option value="">Change Status...</option>
                {invoiceStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <button onClick={() => setSelectedIds([])} className="ml-auto text-gray-500 hover:text-gray-700"><X size={18} /></button>
            </div>
          )}

          {/* Invoices Table */}
          <div className="card overflow-hidden">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-8">
                    <div onClick={toggleSelectAll} className="cursor-pointer">
                      {selectedIds.length === invoices.length && invoices.length > 0 ? <CheckSquare className="text-indigo-600" size={16} /> : <Square className="text-gray-400" size={16} />}
                    </div>
                  </th>
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
                  <tr
                    key={invoice.id}
                    className={`cursor-pointer hover:bg-gray-50 ${selectedIds.includes(invoice.id) ? 'bg-indigo-50' : ''}`}
                    onClick={() => setSelectedInvoice(invoice)}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <div onClick={() => toggleSelect(invoice.id)} className="cursor-pointer">
                        {selectedIds.includes(invoice.id) ? <CheckSquare className="text-indigo-600" size={16} /> : <Square className="text-gray-400" size={16} />}
                      </div>
                    </td>
                    <td className="font-medium">{invoice.invoiceNumber}</td>
                    <td>{invoice.event?.name}</td>
                    <td>{invoice.event?.client?.name}</td>
                    <td>{invoice.type}</td>
                    <td className="font-medium">${invoice.total?.toLocaleString()}</td>
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
                        <button onClick={() => openInvoiceModal(invoice)} className="p-1 text-gray-400 hover:text-indigo-600" title="Edit">
                          <Edit size={18} />
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

          {invoices.length === 0 && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices found</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new invoice.</p>
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

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <>
          {/* Payment Search */}
          <div className="card">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" size={20} />
                  <input
                    type="text"
                    placeholder="Search payments..."
                    className="input"
                    style={{ paddingLeft: '2.5rem' }}
                    value={paymentSearchTerm}
                    onChange={(e) => setPaymentSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

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
                {filteredPayments.map((payment) => (
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

          {filteredPayments.length === 0 && (
            <div className="text-center py-12">
              <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No payments found</h3>
              <p className="mt-1 text-sm text-gray-500">Payments will appear here when recorded against invoices.</p>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Invoice Modal */}
      {showModal && modalType === 'invoice' && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setEditingInvoice(null); }}>
          <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingInvoice ? 'Edit Invoice' : 'New Invoice'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Event</label>
                  <select
                    className={`select ${validationErrors.eventId ? 'border-red-500' : ''}`}
                    value={formData.eventId}
                    onChange={(e) => setFormData({...formData, eventId: e.target.value})}
                  >
                    <option value="">Select Event</option>
                    {events.map(ev => (
                      <option key={ev.id} value={ev.id}>{ev.name}</option>
                    ))}
                  </select>
                  {validationErrors.eventId && <p className="text-xs text-red-500 mt-1">{validationErrors.eventId}</p>}
                </div>
                <div>
                  <label className="label">Type</label>
                  <select
                    className={`select ${validationErrors.type ? 'border-red-500' : ''}`}
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                  >
                    {invoiceTypes.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  {validationErrors.type && <p className="text-xs text-red-500 mt-1">{validationErrors.type}</p>}
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
                  <div key={idx} className="mb-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className={`input flex-1 ${validationErrors[`lineItem_${idx}_desc`] ? 'border-red-500' : ''}`}
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => {
                          const items = [...formData.lineItems];
                          items[idx].description = e.target.value;
                          setFormData({...formData, lineItems: items});
                        }}
                      />
                      <input type="number" className="input w-20" placeholder="Qty" value={item.quantity}
                        onChange={(e) => {
                          const items = [...formData.lineItems];
                          items[idx].quantity = e.target.value;
                          setFormData({...formData, lineItems: items});
                        }} />
                      <input
                        type="number"
                        className={`input w-28 ${validationErrors[`lineItem_${idx}_price`] ? 'border-red-500' : ''}`}
                        placeholder="Price"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const items = [...formData.lineItems];
                          items[idx].unitPrice = e.target.value;
                          setFormData({...formData, lineItems: items});
                        }}
                      />
                      <button type="button" onClick={() => setFormData({
                        ...formData, lineItems: formData.lineItems.filter((_, i) => i !== idx)
                      })} className="text-red-600"><Trash2 size={18} /></button>
                    </div>
                    {(validationErrors[`lineItem_${idx}_desc`] || validationErrors[`lineItem_${idx}_price`]) && (
                      <p className="text-xs text-red-500 mt-1">
                        {validationErrors[`lineItem_${idx}_desc`] || validationErrors[`lineItem_${idx}_price`]}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Tax Rate (%)</label>
                  <input
                    type="number"
                    className={`input ${validationErrors.taxRate ? 'border-red-500' : ''}`}
                    step="0.01"
                    value={formData.taxRate}
                    onChange={(e) => setFormData({...formData, taxRate: e.target.value})}
                  />
                  {validationErrors.taxRate && <p className="text-xs text-red-500 mt-1">{validationErrors.taxRate}</p>}
                </div>
                <div>
                  <label className="label">Gratuity</label>
                  <input type="number" className="input" step="0.01" value={formData.gratuity}
                    onChange={(e) => setFormData({...formData, gratuity: e.target.value})} />
                </div>
                <div>
                  <label className="label">Due Date</label>
                  <input
                    type="date"
                    className={`input ${validationErrors.dueDate ? 'border-red-500' : ''}`}
                    value={formData.dueDate}
                    onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                  />
                  {validationErrors.dueDate && <p className="text-xs text-red-500 mt-1">{validationErrors.dueDate}</p>}
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
                  <button type="button" onClick={() => { setShowModal(false); setEditingInvoice(null); }} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary">
                    {editingInvoice ? 'Update Invoice' : 'Create Invoice'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showModal && modalType === 'payment' && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setSelectedInvoice(null); }}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Record Payment</h2>
              <p className="text-sm text-gray-500">Invoice: {selectedInvoice?.invoiceNumber}</p>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>
              )}
              <div>
                <label className="label">Amount</label>
                <input
                  type="number"
                  className={`input ${validationErrors.amount ? 'border-red-500' : ''}`}
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  placeholder={`Outstanding: $${selectedInvoice?.total}`}
                />
                {validationErrors.amount && <p className="text-xs text-red-500 mt-1">{validationErrors.amount}</p>}
              </div>
              <div>
                <label className="label">Payment Method</label>
                <select
                  className={`select ${validationErrors.method ? 'border-red-500' : ''}`}
                  value={formData.method}
                  onChange={(e) => setFormData({...formData, method: e.target.value})}
                >
                  {paymentMethods.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                {validationErrors.method && <p className="text-xs text-red-500 mt-1">{validationErrors.method}</p>}
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

      {/* View Invoice Detail Modal */}
      {selectedInvoice && !showModal && (
        <div className="modal-overlay" onClick={() => setSelectedInvoice(null)}>
          <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">{selectedInvoice.invoiceNumber}</h2>
                <span className={`badge ${getStatusBadge(selectedInvoice.status)}`}>{selectedInvoice.status.replace('_', ' ')}</span>
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
                      <span className="font-medium">${item.total?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex justify-between"><span>Subtotal</span><span>${selectedInvoice.subtotal?.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Tax ({selectedInvoice.taxRate}%)</span><span>${selectedInvoice.taxAmount?.toLocaleString()}</span></div>
                {selectedInvoice.gratuity > 0 && (
                  <div className="flex justify-between"><span>Gratuity</span><span>${selectedInvoice.gratuity?.toLocaleString()}</span></div>
                )}
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span><span>${selectedInvoice.total?.toLocaleString()}</span>
                </div>
              </div>

              {selectedInvoice.payments?.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Payments Received</p>
                  {selectedInvoice.payments.map((p) => (
                    <div key={p.id} className="flex justify-between p-2 bg-green-50 rounded mb-1">
                      <span>{format(new Date(p.receivedAt), 'MMM d')} - {p.method.replace('_', ' ')}</span>
                      <span className="font-medium text-green-600">${p.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  handleDelete('invoice', selectedInvoice.id);
                  setSelectedInvoice(null);
                }}
                className="btn btn-danger"
              >
                Delete
              </button>
              <button onClick={() => setSelectedInvoice(null)} className="btn btn-secondary">Close</button>
              <button
                onClick={() => {
                  const inv = selectedInvoice;
                  setSelectedInvoice(null);
                  openInvoiceModal(inv);
                }}
                className="btn btn-primary"
              >
                Edit Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Payment Detail Modal */}
      {selectedPayment && (
        <div className="modal-overlay" onClick={() => setSelectedPayment(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  handleDelete('payment', selectedPayment.id);
                  setSelectedPayment(null);
                }}
                className="btn btn-danger"
              >
                Delete
              </button>
              <button onClick={() => setSelectedPayment(null)} className="btn btn-secondary">Close</button>
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
