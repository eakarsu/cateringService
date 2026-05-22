import { useEffect, useState } from 'react';
import api from '../utils/api';

export default function StaffRosterWizard() {
  const [step, setStep] = useState(1);
  const [opts, setOpts] = useState({ events: [], roles: [] });
  const [eventId, setEventId] = useState('');
  const [requirements, setRequirements] = useState([
    { role: '', count: 1 }
  ]);
  const [suggestions, setSuggestions] = useState(null);
  const [selectedByRole, setSelectedByRole] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [confirmed, setConfirmed] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get('/custom-views/staff-roster/options')
      .then((res) => {
        if (cancelled) return;
        setOpts(res.data);
        if (res.data.events?.[0]) setEventId(res.data.events[0].id);
        if (res.data.roles?.[0]) {
          setRequirements([{ role: res.data.roles[0], count: 2 }]);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e?.response?.data?.error || e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const updateReq = (idx, field, value) => {
    setRequirements((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r))
    );
  };
  const addReq = () =>
    setRequirements((prev) => [...prev, { role: opts.roles[0] || '', count: 1 }]);
  const removeReq = (idx) =>
    setRequirements((prev) => prev.filter((_, i) => i !== idx));

  const runSuggest = async () => {
    setBusy(true);
    setError(null);
    try {
      const cleaned = requirements
        .filter((r) => r.role && Number(r.count) > 0)
        .map((r) => ({ role: r.role, count: Number(r.count) }));
      const res = await api.post('/custom-views/staff-roster/suggest', {
        eventId,
        requiredRoles: cleaned
      });
      setSuggestions(res.data);
      const map = {};
      res.data.suggestions.forEach((s) => {
        map[s.role] = new Set(s.suggested.map((c) => c.staffId));
      });
      setSelectedByRole(map);
      setStep(2);
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleStaff = (role, staffId) => {
    setSelectedByRole((prev) => {
      const next = { ...prev };
      const cur = new Set(next[role] || []);
      if (cur.has(staffId)) cur.delete(staffId);
      else cur.add(staffId);
      next[role] = cur;
      return next;
    });
  };

  const confirmAll = async () => {
    setBusy(true);
    setError(null);
    try {
      const assignments = [];
      Object.entries(selectedByRole).forEach(([role, set]) => {
        set.forEach((staffId) => assignments.push({ staffId, role }));
      });
      const res = await api.post('/custom-views/staff-roster/confirm', {
        eventId,
        assignments
      });
      setConfirmed(res.data);
      setStep(3);
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4" data-testid="staff-roster-wizard">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-xl font-bold">Staff Roster Wizard</h2>
        <span className="text-sm text-gray-500">Step {step} of 3</span>
      </div>

      {error && <div className="text-red-600 text-sm mb-3">Error: {error}</div>}

      {loading ? (
        <div className="text-sm text-gray-500">Loading...</div>
      ) : step === 1 ? (
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="text-gray-700">Event</span>
            <select
              className="mt-1 w-full border rounded p-1.5"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
            >
              <option value="">-- select --</option>
              {opts.events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({new Date(ev.date).toLocaleDateString()}) — {ev.guestCount} guests
                </option>
              ))}
            </select>
          </label>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-gray-700">Required Roles</span>
              <button
                onClick={addReq}
                className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
              >
                + Add role
              </button>
            </div>
            <div className="space-y-2">
              {requirements.map((r, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <select
                    className="col-span-7 border rounded p-1.5 text-sm"
                    value={r.role}
                    onChange={(e) => updateReq(idx, 'role', e.target.value)}
                  >
                    <option value="">-- select role --</option>
                    {opts.roles.map((rl) => (
                      <option key={rl} value={rl}>{rl}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    className="col-span-3 border rounded p-1.5 text-sm"
                    value={r.count}
                    onChange={(e) => updateReq(idx, 'count', e.target.value)}
                  />
                  <button
                    onClick={() => removeReq(idx)}
                    className="col-span-2 text-red-600 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={runSuggest}
            disabled={busy || !eventId}
            className="px-4 py-2 bg-indigo-600 text-white rounded disabled:bg-gray-300"
          >
            {busy ? 'Finding...' : 'Suggest Staff'}
          </button>
        </div>
      ) : step === 2 ? (
        <div className="space-y-3">
          <div className="text-sm text-gray-600">
            Event: <strong>{suggestions?.event?.name}</strong> · existing assignments: {suggestions?.existingAssignments ?? 0}
          </div>
          {suggestions?.suggestions?.map((s) => (
            <div key={s.role} className="border rounded p-3">
              <div className="font-semibold mb-2">
                {s.role} <span className="text-gray-500 text-sm">(need {s.required})</span>
              </div>
              {s.suggested.length === 0 && (
                <div className="text-sm text-gray-500">No available staff matched.</div>
              )}
              {s.suggested.map((c) => (
                <label key={c.staffId} className="flex items-center gap-2 text-sm py-1">
                  <input
                    type="checkbox"
                    checked={selectedByRole[s.role]?.has(c.staffId) || false}
                    onChange={() => toggleStaff(s.role, c.staffId)}
                  />
                  <span className="flex-1">
                    {c.name} — {c.position} (${c.hourlyRate?.toFixed(2)}/hr)
                  </span>
                  <span className="text-xs text-gray-400">score {c.score}</span>
                </label>
              ))}
            </div>
          ))}
          <div className="flex gap-2">
            <button
              onClick={() => setStep(1)}
              className="px-3 py-2 border rounded"
            >
              Back
            </button>
            <button
              onClick={confirmAll}
              disabled={busy}
              className="px-4 py-2 bg-indigo-600 text-white rounded disabled:bg-gray-300"
            >
              {busy ? 'Saving...' : 'Confirm Assignments'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-green-700 font-semibold">
            Created {confirmed?.created ?? 0} assignments.
          </div>
          <ul className="text-sm list-disc pl-5">
            {(confirmed?.assignments || []).map((a) => (
              <li key={a.id}>
                {a.role} — staff {a.staffId.slice(0, 8)}
              </li>
            ))}
          </ul>
          <button
            onClick={() => { setStep(1); setSuggestions(null); setConfirmed(null); }}
            className="px-3 py-2 border rounded"
          >
            Start Over
          </button>
        </div>
      )}
    </div>
  );
}
