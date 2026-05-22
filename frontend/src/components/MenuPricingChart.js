import { useEffect, useState } from 'react';
import api from '../utils/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList
} from 'recharts';

export default function MenuPricingChart() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get('/custom-views/menu-pricing')
      .then((res) => { if (!cancelled) setData(res.data); })
      .catch((e) => { if (!cancelled) setError(e?.response?.data?.error || e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="bg-white rounded-lg shadow p-4" data-testid="menu-pricing-chart">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-xl font-bold">Menu Pricing by Category</h2>
        <span className="text-sm text-gray-500">
          {loading
            ? 'Loading...'
            : `${data?.totalItems ?? 0} items across ${data?.totalCategories ?? 0} categories`}
        </span>
      </div>

      {error && (
        <div className="text-red-600 text-sm mb-3">Error: {error}</div>
      )}

      {data?.categories?.length ? (
        <div style={{ width: '100%', height: 380 }}>
          <ResponsiveContainer>
            <BarChart
              data={data.categories}
              margin={{ top: 20, right: 20, left: 0, bottom: 50 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="category"
                angle={-30}
                textAnchor="end"
                interval={0}
                height={70}
                tick={{ fontSize: 12 }}
              />
              <YAxis tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} />
              <Legend />
              <Bar dataKey="avgPrice" name="Avg Price" fill="#6366f1">
                <LabelList dataKey="avgPrice" position="top" formatter={(v) => `$${v}`} />
              </Bar>
              <Bar dataKey="avgCost" name="Avg Cost" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        !loading && (
          <div className="text-sm text-gray-500">No menu items available.</div>
        )
      )}

      {data?.categories?.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b">
              <tr>
                <th className="py-1">Category</th>
                <th className="py-1">Items</th>
                <th className="py-1">Avg Price</th>
                <th className="py-1">Avg Cost</th>
                <th className="py-1">Margin</th>
                <th className="py-1">Min</th>
                <th className="py-1">Max</th>
              </tr>
            </thead>
            <tbody>
              {data.categories.map((c) => (
                <tr key={c.category} className="border-b last:border-0">
                  <td className="py-1 font-medium">{c.category}</td>
                  <td className="py-1">{c.count}</td>
                  <td className="py-1">${c.avgPrice.toFixed(2)}</td>
                  <td className="py-1">${c.avgCost.toFixed(2)}</td>
                  <td className="py-1 text-green-700">${c.margin.toFixed(2)}</td>
                  <td className="py-1">${c.minPrice.toFixed(2)}</td>
                  <td className="py-1">${c.maxPrice.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
