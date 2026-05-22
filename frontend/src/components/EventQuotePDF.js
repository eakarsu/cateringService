import { useEffect, useState } from 'react';
import api from '../utils/api';

export default function EventQuotePDF() {
  const [options, setOptions] = useState({ clients: [], events: [], packages: [] });
  const [clientId, setClientId] = useState('');
  const [eventId, setEventId] = useState('');
  const [packageId, setPackageId] = useState('');
  const [taxRate, setTaxRate] = useState(0.08);
  const [addOns, setAddOns] = useState([
    { description: '', quantity: 1, unitPrice: 0 }
  ]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get('/custom-views/quote-options')
      .then((res) => {
        if (cancelled) return;
        setOptions(res.data);
        if (res.data.clients?.[0]) setClientId(res.data.clients[0].id);
        if (res.data.events?.[0]) setEventId(res.data.events[0].id);
        if (res.data.packages?.[0]) setPackageId(res.data.packages[0].id);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.response?.data?.error || e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const updateAddOn = (idx, field, value) => {
    setAddOns((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row))
    );
  };
  const addRow = () =>
    setAddOns((prev) => [...prev, { description: '', quantity: 1, unitPrice: 0 }]);
  const removeRow = (idx) =>
    setAddOns((prev) => prev.filter((_, i) => i !== idx));

  const selectedPackage = options.packages.find((p) => p.id === packageId);
  const selectedEvent = options.events.find((e) => e.id === eventId);

  const packageSubtotal =
    selectedPackage && selectedEvent
      ? selectedPackage.pricePerPerson * (selectedEvent.guestCount || 0)
      : 0;
  const addOnSubtotal = addOns.reduce(
    (s, r) => s + Number(r.quantity || 0) * Number(r.unitPrice || 0),
    0
  );
  const subtotal = packageSubtotal + addOnSubtotal;
  const tax = subtotal * Number(taxRate || 0);
  const total = subtotal + tax;

  const generate = async () => {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const cleaned = addOns.filter(
        (r) => r.description && Number(r.quantity) > 0
      );
      const res = await api.post(
        '/custom-views/event-quote-pdf',
        {
          clientId,
          eventId,
          packageId,
          taxRate: Number(taxRate),
          additionalItems: cleaned
        },
        { responseType: 'blob' }
      );
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `event-quote-${eventId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setStatus('PDF downloaded.');
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Failed to generate PDF');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4" data-testid="event-quote-pdf">
      <h2 className="text-xl font-bold mb-3">Event Quote PDF</h2>
      {loading ? (
        <div className="text-sm text-gray-500">Loading options...</div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="block text-sm">
              <span className="text-gray-700">Client</span>
              <select
                className="mt-1 w-full border rounded p-1.5"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                <option value="">-- select --</option>
                {options.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email})
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-gray-700">Event</span>
              <select
                className="mt-1 w-full border rounded p-1.5"
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
              >
                <option value="">-- select --</option>
                {options.events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name} ({new Date(ev.date).toLocaleDateString()}) — {ev.guestCount} guests
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-gray-700">Menu Package</span>
              <select
                className="mt-1 w-full border rounded p-1.5"
                value={packageId}
                onChange={(e) => setPackageId(e.target.value)}
              >
                <option value="">-- select --</option>
                {options.packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (${p.pricePerPerson}/pp)
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-sm">
            <span className="text-gray-700">Tax Rate (e.g. 0.08 = 8%)</span>
            <input
              type="number"
              min={0}
              step={0.01}
              className="mt-1 w-32 border rounded p-1.5"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
            />
          </label>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-gray-700">Additional Line Items</span>
              <button
                onClick={addRow}
                className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
              >
                + Add row
              </button>
            </div>
            <div className="space-y-2">
              {addOns.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    className="col-span-6 border rounded p-1.5 text-sm"
                    placeholder="Description"
                    value={row.description}
                    onChange={(e) => updateAddOn(idx, 'description', e.target.value)}
                  />
                  <input
                    type="number"
                    className="col-span-2 border rounded p-1.5 text-sm"
                    placeholder="Qty"
                    value={row.quantity}
                    onChange={(e) => updateAddOn(idx, 'quantity', e.target.value)}
                  />
                  <input
                    type="number"
                    className="col-span-3 border rounded p-1.5 text-sm"
                    placeholder="Unit price"
                    value={row.unitPrice}
                    onChange={(e) => updateAddOn(idx, 'unitPrice', e.target.value)}
                  />
                  <button
                    onClick={() => removeRow(idx)}
                    className="col-span-1 text-red-600 text-sm"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="text-sm bg-gray-50 rounded p-3 border">
            <div className="flex justify-between">
              <span>Package subtotal</span>
              <span>${packageSubtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Add-on subtotal</span>
              <span>${addOnSubtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold text-base mt-1 pt-1 border-t">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={generate}
            disabled={busy || !clientId || !eventId || !packageId}
            className="px-4 py-2 bg-indigo-600 text-white rounded disabled:bg-gray-300"
          >
            {busy ? 'Generating...' : 'Generate Quote PDF'}
          </button>
          {status && <div className="text-green-700 text-sm">{status}</div>}
          {error && <div className="text-red-600 text-sm">{error}</div>}
        </div>
      )}
    </div>
  );
}
