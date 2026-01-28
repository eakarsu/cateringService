import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Calculator, DollarSign, Users, ChefHat, Package, TrendingUp, Download, RefreshCw, Save, History, Trash2, FileText, X } from 'lucide-react';
import { format } from 'date-fns';

export default function CostEstimator() {
  const [events, setEvents] = useState([]);
  const [packages, setPackages] = useState([]);
  const [savedEstimates, setSavedEstimates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [estimate, setEstimate] = useState(null);
  const [quickEstimate, setQuickEstimate] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [estimateName, setEstimateName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);

  const [formData, setFormData] = useState({
    eventId: '',
    guestCount: 100,
    packageId: '',
    profitMarginPercent: 25,
    laborCostPerHour: 25,
    overheadPercent: 15,
    taxRate: 8,
    staffHours: [
      { role: 'Executive Chef', hours: 8, hourlyRate: 45 },
      { role: 'Server', hours: 6, hourlyRate: 22 }
    ],
    additionalCosts: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [eventsRes, packagesRes, estimatesRes] = await Promise.all([
        api.get('/events'),
        api.get('/menus/packages'),
        api.get('/costing/estimates')
      ]);
      setEvents(eventsRes.data);
      setPackages(packagesRes.data);
      setSavedEstimates(estimatesRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateEstimate = async () => {
    setCalculating(true);
    try {
      const res = await api.post('/costing/estimate', formData);
      setEstimate(res.data);
    } catch (error) {
      console.error('Failed to calculate estimate:', error);
    } finally {
      setCalculating(false);
    }
  };

  const saveEstimate = async () => {
    if (!estimate) return;

    setSaving(true);
    try {
      const event = events.find(e => e.id === formData.eventId);
      const defaultName = event
        ? `${event.name} - ${format(new Date(), 'MMM d, yyyy')}`
        : `Estimate - ${format(new Date(), 'MMM d, yyyy HH:mm')}`;

      const saveData = {
        name: estimateName || defaultName,
        eventId: formData.eventId || null,
        guestCount: formData.guestCount,
        packageId: formData.packageId || null,
        profitMarginPercent: formData.profitMarginPercent,
        overheadPercent: formData.overheadPercent,
        taxRate: formData.taxRate,
        laborCostPerHour: formData.laborCostPerHour,
        foodCost: estimate.breakdown.foodCost,
        laborCost: estimate.breakdown.laborCost,
        equipmentCost: estimate.breakdown.equipmentCost,
        additionalCost: estimate.breakdown.additionalCosts,
        overheadAmount: estimate.breakdown.overhead.amount,
        subtotal: estimate.breakdown.subtotal,
        profitAmount: estimate.breakdown.profit.amount,
        taxAmount: estimate.breakdown.tax.amount,
        totalAmount: estimate.breakdown.total,
        pricePerPerson: estimate.summary.pricePerPerson,
        staffDetails: formData.staffHours,
        additionalDetails: formData.additionalCosts,
        status: 'DRAFT'
      };

      await api.post('/costing/estimates', saveData);
      await loadData();
      setShowSaveModal(false);
      setEstimateName('');
      alert('Estimate saved successfully!');
    } catch (error) {
      console.error('Failed to save estimate:', error);
      alert('Failed to save estimate');
    } finally {
      setSaving(false);
    }
  };

  const deleteEstimate = async (id) => {
    if (!confirm('Are you sure you want to delete this estimate?')) return;
    try {
      await api.delete(`/costing/estimates/${id}`);
      await loadData();
    } catch (error) {
      console.error('Failed to delete estimate:', error);
    }
  };

  const loadSavedEstimate = (saved) => {
    setFormData({
      eventId: saved.eventId || '',
      guestCount: saved.guestCount,
      packageId: saved.packageId || '',
      profitMarginPercent: saved.profitMarginPercent,
      laborCostPerHour: saved.laborCostPerHour,
      overheadPercent: saved.overheadPercent,
      taxRate: saved.taxRate,
      staffHours: saved.staffDetails || [{ role: '', hours: 0, hourlyRate: 20 }],
      additionalCosts: saved.additionalDetails || []
    });

    // Reconstruct the estimate display
    setEstimate({
      summary: {
        guestCount: saved.guestCount,
        pricePerPerson: saved.pricePerPerson,
        total: saved.totalAmount
      },
      breakdown: {
        foodCost: saved.foodCost,
        laborCost: saved.laborCost,
        equipmentCost: saved.equipmentCost,
        additionalCosts: saved.additionalCost,
        overhead: { percent: saved.overheadPercent, amount: saved.overheadAmount },
        subtotal: saved.subtotal,
        profit: { percent: saved.profitMarginPercent, amount: saved.profitAmount },
        tax: { rate: saved.taxRate, amount: saved.taxAmount },
        total: saved.totalAmount
      },
      details: {
        labor: saved.staffDetails || []
      }
    });

    setShowHistory(false);
  };

  const loadQuickEstimate = async (eventId) => {
    try {
      const res = await api.get(`/costing/quick-estimate/${eventId}`);
      setQuickEstimate(res.data);
    } catch (error) {
      console.error('Failed to load quick estimate:', error);
    }
  };

  const handleEventChange = (eventId) => {
    setFormData({ ...formData, eventId });
    if (eventId) {
      const event = events.find(e => e.id === eventId);
      if (event) {
        setFormData(prev => ({ ...prev, eventId, guestCount: event.guestCount }));
        loadQuickEstimate(eventId);
      }
    } else {
      setQuickEstimate(null);
    }
  };

  const staffRoles = [
    { value: 'Executive Chef', rate: 45 },
    { value: 'Sous Chef', rate: 35 },
    { value: 'Line Cook', rate: 25 },
    { value: 'Prep Cook', rate: 20 },
    { value: 'Pastry Chef', rate: 35 },
    { value: 'Head Server', rate: 28 },
    { value: 'Server', rate: 22 },
    { value: 'Bartender', rate: 25 },
    { value: 'Busser', rate: 18 },
    { value: 'Event Manager', rate: 40 },
    { value: 'Event Coordinator', rate: 30 },
    { value: 'Setup Crew', rate: 20 },
    { value: 'Dishwasher', rate: 18 },
    { value: 'Driver', rate: 22 },
  ];

  const addStaffRole = () => {
    setFormData({
      ...formData,
      staffHours: [...formData.staffHours, { role: '', hours: 0, hourlyRate: 20 }]
    });
  };

  const removeStaffRole = (index) => {
    setFormData({
      ...formData,
      staffHours: formData.staffHours.filter((_, i) => i !== index)
    });
  };

  const updateStaffRole = (index, field, value) => {
    const staffHours = [...formData.staffHours];
    if (field === 'role') {
      staffHours[index].role = value;
      const roleInfo = staffRoles.find(r => r.value === value);
      if (roleInfo) {
        staffHours[index].hourlyRate = roleInfo.rate;
      }
    } else {
      staffHours[index][field] = parseFloat(value) || 0;
    }
    setFormData({ ...formData, staffHours });
  };

  const addAdditionalCost = () => {
    setFormData({
      ...formData,
      additionalCosts: [...formData.additionalCosts, { description: '', amount: 0 }]
    });
  };

  const removeAdditionalCost = (index) => {
    setFormData({
      ...formData,
      additionalCosts: formData.additionalCosts.filter((_, i) => i !== index)
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      DRAFT: 'badge-gray',
      FINAL: 'badge-success',
      CONVERTED_TO_PROPOSAL: 'badge-info',
      ARCHIVED: 'badge-warning'
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
          <h1 className="text-2xl font-bold text-gray-900">Cost Estimator</h1>
          <p className="text-gray-500">Calculate event costs and profit margins</p>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`btn ${showHistory ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2`}
        >
          <History size={20} />
          Saved Estimates ({savedEstimates.length})
        </button>
      </div>

      {/* Saved Estimates History */}
      {showHistory && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <History size={20} className="text-indigo-600" />
            Saved Estimates
          </h3>
          {savedEstimates.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No saved estimates yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guests</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Per Person</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {savedEstimates.map((est) => (
                    <tr
                      key={est.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => loadSavedEstimate(est)}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{est.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{est.guestCount}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">${est.totalAmount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">${est.pricePerPerson.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${getStatusBadge(est.status)}`}>{est.status}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {format(new Date(est.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => deleteEstimate(est.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calculator size={20} className="text-indigo-600" />
              Event Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Select Event (Optional)</label>
                <select
                  className="select"
                  value={formData.eventId}
                  onChange={(e) => handleEventChange(e.target.value)}
                >
                  <option value="">-- Custom Estimate --</option>
                  {events.map(event => (
                    <option key={event.id} value={event.id}>{event.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Guest Count</label>
                <input
                  type="number"
                  className="input"
                  value={formData.guestCount}
                  onChange={(e) => setFormData({ ...formData, guestCount: parseInt(e.target.value) || 0 })}
                  min="1"
                />
              </div>
              <div>
                <label className="label">Menu Package</label>
                <select
                  className="select"
                  value={formData.packageId}
                  onChange={(e) => setFormData({ ...formData, packageId: e.target.value })}
                >
                  <option value="">-- Select Package --</option>
                  {packages.map(pkg => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} (${pkg.pricePerPerson}/person)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Profit Margin %</label>
                <input
                  type="number"
                  className="input"
                  value={formData.profitMarginPercent}
                  onChange={(e) => setFormData({ ...formData, profitMarginPercent: parseFloat(e.target.value) || 0 })}
                  min="0"
                  max="100"
                />
              </div>
            </div>
          </div>

          {/* Staff Costs */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <ChefHat size={20} className="text-indigo-600" />
                Labor Costs
              </h3>
              <button onClick={addStaffRole} className="text-indigo-600 text-sm hover:text-indigo-800">
                + Add Role
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex gap-3 items-center text-xs text-gray-500 font-medium px-1">
                <span className="flex-1">Role</span>
                <span style={{ width: '96px' }}>Hours</span>
                <span style={{ width: '96px' }}>$/Hour</span>
                <span style={{ width: '80px' }}>Subtotal</span>
                <span style={{ width: '24px' }}></span>
              </div>
              {formData.staffHours.map((staff, index) => (
                <div key={index} className="flex gap-3 items-center">
                  <select
                    className="select flex-1"
                    value={staff.role}
                    onChange={(e) => updateStaffRole(index, 'role', e.target.value)}
                  >
                    <option value="">-- Select Role --</option>
                    {staffRoles.map(role => (
                      <option key={role.value} value={role.value}>
                        {role.value} (${role.rate}/hr)
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="input"
                    style={{ width: '96px' }}
                    placeholder="Hours"
                    value={staff.hours}
                    onChange={(e) => updateStaffRole(index, 'hours', e.target.value)}
                    min="0"
                  />
                  <input
                    type="number"
                    className="input"
                    style={{ width: '96px' }}
                    placeholder="$/hr"
                    value={staff.hourlyRate}
                    onChange={(e) => updateStaffRole(index, 'hourlyRate', e.target.value)}
                    min="0"
                  />
                  <span className="text-gray-700 font-medium" style={{ width: '80px' }}>
                    ${(staff.hours * staff.hourlyRate).toFixed(0)}
                  </span>
                  <button
                    onClick={() => removeStaffRole(index)}
                    className="text-red-500 hover:text-red-700"
                    style={{ width: '24px' }}
                    disabled={formData.staffHours.length === 1}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Costs */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Package size={20} className="text-indigo-600" />
                Additional Costs
              </h3>
              <button onClick={addAdditionalCost} className="text-indigo-600 text-sm hover:text-indigo-800">
                + Add Cost
              </button>
            </div>
            {formData.additionalCosts.length === 0 ? (
              <p className="text-gray-500 text-sm">No additional costs added</p>
            ) : (
              <div className="space-y-3">
                {formData.additionalCosts.map((cost, index) => (
                  <div key={index} className="flex gap-3 items-center">
                    <input
                      type="text"
                      className="input flex-1"
                      placeholder="Description"
                      value={cost.description}
                      onChange={(e) => {
                        const costs = [...formData.additionalCosts];
                        costs[index].description = e.target.value;
                        setFormData({ ...formData, additionalCosts: costs });
                      }}
                    />
                    <div className="w-32">
                      <input
                        type="number"
                        className="input"
                        placeholder="Amount"
                        value={cost.amount}
                        onChange={(e) => {
                          const costs = [...formData.additionalCosts];
                          costs[index].amount = parseFloat(e.target.value) || 0;
                          setFormData({ ...formData, additionalCosts: costs });
                        }}
                      />
                    </div>
                    <button
                      onClick={() => removeAdditionalCost(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Cost Settings</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Overhead %</label>
                <input
                  type="number"
                  className="input"
                  value={formData.overheadPercent}
                  onChange={(e) => setFormData({ ...formData, overheadPercent: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="label">Tax Rate %</label>
                <input
                  type="number"
                  className="input"
                  value={formData.taxRate}
                  onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="label">Default Labor $/hr</label>
                <input
                  type="number"
                  className="input"
                  value={formData.laborCostPerHour}
                  onChange={(e) => setFormData({ ...formData, laborCostPerHour: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>

          <button
            onClick={calculateEstimate}
            disabled={calculating}
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            {calculating ? (
              <>
                <RefreshCw className="animate-spin" size={20} />
                Calculating...
              </>
            ) : (
              <>
                <Calculator size={20} />
                Calculate Estimate
              </>
            )}
          </button>
        </div>

        {/* Results */}
        <div className="space-y-6">
          {/* Quick Estimate */}
          {quickEstimate && (
            <div className="card bg-indigo-50">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <TrendingUp size={20} className="text-indigo-600" />
                Quick Estimate
              </h3>
              <p className="text-sm text-gray-600 mb-3">{quickEstimate.eventName}</p>
              <div className="text-3xl font-bold text-indigo-600">
                ${quickEstimate.suggestedPrice?.toLocaleString()}
              </div>
              <p className="text-sm text-gray-500">
                ${quickEstimate.pricePerPerson?.toFixed(2)}/person
              </p>
              <div className="mt-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Food</span>
                  <span>${quickEstimate.breakdown?.food?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Labor</span>
                  <span>${quickEstimate.breakdown?.labor?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Equipment</span>
                  <span>${quickEstimate.breakdown?.equipment?.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Detailed Estimate */}
          {estimate && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign size={20} className="text-green-600" />
                Cost Breakdown
              </h3>

              <div className="space-y-4">
                {/* Summary */}
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Quote</span>
                    <span className="text-2xl font-bold text-green-600">
                      ${estimate.breakdown?.total?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1 text-sm text-gray-600">
                    <span>{estimate.summary?.guestCount} guests</span>
                    <span>${estimate.summary?.pricePerPerson?.toFixed(2)}/person</span>
                  </div>
                </div>

                {/* Cost Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Food Cost</span>
                    <span className="font-medium">${estimate.breakdown?.foodCost?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Labor Cost</span>
                    <span className="font-medium">${estimate.breakdown?.laborCost?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Equipment</span>
                    <span className="font-medium">${estimate.breakdown?.equipmentCost?.toLocaleString()}</span>
                  </div>
                  {estimate.breakdown?.additionalCosts > 0 && (
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">Additional</span>
                      <span className="font-medium">${estimate.breakdown?.additionalCosts?.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Overhead ({estimate.breakdown?.overhead?.percent}%)</span>
                    <span className="font-medium">${estimate.breakdown?.overhead?.amount?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 bg-gray-50 px-2 rounded">
                    <span className="font-medium">Subtotal</span>
                    <span className="font-medium">${estimate.breakdown?.subtotal?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 text-green-600">
                    <span>Profit ({estimate.breakdown?.profit?.percent}%)</span>
                    <span className="font-medium">${estimate.breakdown?.profit?.amount?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Tax ({estimate.breakdown?.tax?.rate}%)</span>
                    <span className="font-medium">${estimate.breakdown?.tax?.amount?.toLocaleString()}</span>
                  </div>
                </div>

                {/* Labor Details */}
                {estimate.details?.labor?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Labor Details</p>
                    <div className="text-xs space-y-1">
                      {estimate.details.labor.map((l, i) => (
                        <div key={i} className="flex justify-between text-gray-600">
                          <span>{l.role}: {l.hours}h @ ${l.rate}/hr</span>
                          <span>${l.cost}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Save Button */}
                <button
                  onClick={() => setShowSaveModal(true)}
                  className="btn btn-success w-full flex items-center justify-center gap-2 mt-4"
                >
                  <Save size={20} />
                  Save Estimate
                </button>
              </div>
            </div>
          )}

          {!estimate && !quickEstimate && (
            <div className="card text-center py-12">
              <Calculator className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No estimate yet</h3>
              <p className="mt-1 text-sm text-gray-500">Fill in the details and click calculate</p>
            </div>
          )}
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Save Estimate</h2>
              <button onClick={() => setShowSaveModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Estimate Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder={`Estimate - ${format(new Date(), 'MMM d, yyyy')}`}
                  value={estimateName}
                  onChange={(e) => setEstimateName(e.target.value)}
                />
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total</span>
                  <span className="font-bold text-green-600">${estimate?.breakdown?.total?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-600">Guests</span>
                  <span>{estimate?.summary?.guestCount}</span>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowSaveModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={saveEstimate} disabled={saving} className="btn btn-primary flex items-center gap-2">
                {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
