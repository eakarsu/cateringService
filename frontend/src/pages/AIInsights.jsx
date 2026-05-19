import { useState } from 'react';
import { Sparkles, UtensilsCrossed, FileSignature, Truck } from 'lucide-react';
import api from '../utils/api';

const tabs = [
  { value: 'menu', label: 'Menu Optimize', icon: UtensilsCrossed, endpoint: '/ai/menu-optimize' },
  { value: 'proposal', label: 'Proposal Optimize', icon: FileSignature, endpoint: '/ai/proposal-optimize' },
  { value: 'route', label: 'Delivery Route', icon: Truck, endpoint: '/ai/delivery-route' },
];

function formatResult(data) {
  if (!data) return '';
  if (typeof data === 'string') return data;
  return JSON.stringify(data, null, 2);
}

export default function AIInsights() {
  const [tab, setTab] = useState('menu');

  // Menu state
  const [menuPackageId, setMenuPackageId] = useState('');
  const [eventType, setEventType] = useState('');
  const [guestCount, setGuestCount] = useState('');
  const [dietary, setDietary] = useState('');
  const [budget, setBudget] = useState('');
  const [season, setSeason] = useState('');

  // Proposal state
  const [proposalId, setProposalId] = useState('');
  const [competitiveContext, setCompetitiveContext] = useState('');
  const [clientProfile, setClientProfile] = useState('');

  // Route state
  const [stops, setStops] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [startAddress, setStartAddress] = useState('');
  const [eventStart, setEventStart] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const activeTab = tabs.find((t) => t.value === tab);

  const reset = () => {
    setError('');
    setResult(null);
  };

  const switchTab = (value) => {
    setTab(value);
    reset();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    reset();

    let payload = {};
    if (tab === 'menu') {
      if (!menuPackageId.trim()) {
        setError('Menu package ID is required.');
        return;
      }
      payload = {
        menu_package_id: menuPackageId.trim(),
        event_type: eventType.trim() || undefined,
        guest_count: guestCount ? Number(guestCount) : undefined,
        dietary: dietary.trim() || undefined,
        budget: budget ? Number(budget) : undefined,
        season: season.trim() || undefined,
      };
    } else if (tab === 'proposal') {
      if (!proposalId.trim()) {
        setError('Proposal ID is required.');
        return;
      }
      payload = {
        proposal_id: proposalId.trim(),
        competitive_context: competitiveContext.trim() || undefined,
        client_profile: clientProfile.trim() || undefined,
      };
    } else if (tab === 'route') {
      if (!stops.trim()) {
        setError('At least one stop is required.');
        return;
      }
      let parsedStops = [];
      try {
        const trimmed = stops.trim();
        if (trimmed.startsWith('[')) {
          parsedStops = JSON.parse(trimmed);
        } else {
          parsedStops = trimmed.split('\n').map((line) => line.trim()).filter(Boolean).map((address) => ({ address }));
        }
      } catch {
        setError('Could not parse stops. Use one address per line, or a JSON array.');
        return;
      }
      payload = {
        stops: parsedStops,
        vehicle: vehicle.trim() || undefined,
        start_address: startAddress.trim() || undefined,
        event_start: eventStart.trim() || undefined,
      };
    }

    setLoading(true);
    try {
      const res = await api.post(activeTab.endpoint, payload);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Insights</h1>
          <p className="text-sm text-gray-500">Optimize menus, proposals, and delivery routes.</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-white text-sm">
          <Sparkles className="h-4 w-4" />
          <span>Powered by AI</span>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = t.value === tab;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => switchTab(t.value)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                active ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          {tab === 'menu' && (
            <>
              <Field label="Menu Package ID" value={menuPackageId} onChange={setMenuPackageId} required disabled={loading} />
              <Field label="Event type" value={eventType} onChange={setEventType} disabled={loading} placeholder="e.g. wedding" />
              <Field label="Guest count" value={guestCount} onChange={setGuestCount} disabled={loading} placeholder="e.g. 120" type="number" />
              <Field label="Dietary requirements" value={dietary} onChange={setDietary} disabled={loading} placeholder="e.g. 10 vegan, 4 gluten-free" />
              <Field label="Budget" value={budget} onChange={setBudget} disabled={loading} placeholder="e.g. 5000" type="number" />
              <Field label="Season" value={season} onChange={setSeason} disabled={loading} placeholder="e.g. summer" />
            </>
          )}

          {tab === 'proposal' && (
            <>
              <Field label="Proposal ID" value={proposalId} onChange={setProposalId} required disabled={loading} />
              <TextArea label="Competitive context" value={competitiveContext} onChange={setCompetitiveContext} disabled={loading} />
              <TextArea label="Client profile" value={clientProfile} onChange={setClientProfile} disabled={loading} />
            </>
          )}

          {tab === 'route' && (
            <>
              <TextArea
                label="Stops"
                value={stops}
                onChange={setStops}
                required
                disabled={loading}
                placeholder={'One address per line, or a JSON array of {address, ...}'}
                rows={6}
              />
              <Field label="Vehicle" value={vehicle} onChange={setVehicle} disabled={loading} placeholder="e.g. van-1" />
              <Field label="Start address" value={startAddress} onChange={setStartAddress} disabled={loading} />
              <Field label="Event start (ISO)" value={eventStart} onChange={setEventStart} disabled={loading} placeholder="2026-05-10T11:00:00Z" />
            </>
          )}

          {error && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Working...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Run {activeTab?.label}
              </>
            )}
          </button>
        </form>

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm min-h-[200px]">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Result</h2>
          {!loading && !result && !error && (
            <p className="text-sm text-gray-400">Submit the form to see AI-generated recommendations.</p>
          )}
          {result && (
            <pre className="whitespace-pre-wrap text-xs text-gray-800 bg-gray-50 rounded p-3 max-h-[600px] overflow-y-auto">
              {formatResult(result)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, disabled, placeholder, type = 'text', required }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
    </div>
  );
}

function TextArea({ label, value, onChange, disabled, placeholder, rows = 4, required }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
    </div>
  );
}
