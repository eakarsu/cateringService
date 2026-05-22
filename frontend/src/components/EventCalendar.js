import { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function EventCalendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [monthIdx, setMonthIdx] = useState(today.getMonth());
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const monthParam = useMemo(
    () => `${year}-${String(monthIdx + 1).padStart(2, '0')}`,
    [year, monthIdx]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get('/custom-views/event-calendar', { params: { month: monthParam } })
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.response?.data?.error || e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [monthParam]);

  const prevMonth = () => {
    if (monthIdx === 0) {
      setYear((y) => y - 1);
      setMonthIdx(11);
    } else {
      setMonthIdx((m) => m - 1);
    }
  };
  const nextMonth = () => {
    if (monthIdx === 11) {
      setYear((y) => y + 1);
      setMonthIdx(0);
    } else {
      setMonthIdx((m) => m + 1);
    }
  };

  const eventsByDay = useMemo(() => {
    const map = new Map();
    if (!data?.events) return map;
    for (const ev of data.events) {
      const arr = map.get(ev.day) || [];
      arr.push(ev);
      map.set(ev.day, arr);
    }
    return map;
  }, [data]);

  const cells = useMemo(() => {
    if (!data) return [];
    const out = [];
    for (let i = 0; i < data.firstDayOfWeek; i++) out.push(null);
    for (let d = 1; d <= data.daysInMonth; d++) out.push(d);
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [data]);

  return (
    <div className="bg-white rounded-lg shadow p-4" data-testid="event-calendar">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">Event Calendar</h2>
          <p className="text-sm text-gray-500">
            {loading ? 'Loading...' : `${data?.total ?? 0} events this month`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="px-3 py-1 border rounded hover:bg-gray-50"
          >
            &lt;
          </button>
          <span className="font-medium min-w-[160px] text-center">
            {MONTHS[monthIdx]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="px-3 py-1 border rounded hover:bg-gray-50"
          >
            &gt;
          </button>
        </div>
      </div>

      {error && (
        <div className="text-red-600 text-sm mb-3">Error: {error}</div>
      )}

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="text-xs font-semibold text-gray-500 text-center py-1"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => (
          <div
            key={i}
            className={`min-h-[80px] border rounded p-1 text-xs ${
              day ? 'bg-white' : 'bg-gray-50'
            }`}
          >
            {day && (
              <>
                <div className="font-semibold text-gray-700">{day}</div>
                <div className="space-y-0.5 mt-1">
                  {(eventsByDay.get(day) || []).slice(0, 3).map((ev) => (
                    <div
                      key={ev.id}
                      className="text-white truncate rounded px-1"
                      style={{ backgroundColor: ev.color }}
                      title={`${ev.name} - ${ev.status}`}
                    >
                      {ev.name}
                    </div>
                  ))}
                  {(eventsByDay.get(day) || []).length > 3 && (
                    <div className="text-gray-500 text-[10px]">
                      +{(eventsByDay.get(day) || []).length - 3} more
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {data?.legend && (
        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          {Object.entries(data.legend).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1">
              <span
                className="inline-block w-3 h-3 rounded"
                style={{ backgroundColor: color }}
              />
              <span className="text-gray-700">{status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
