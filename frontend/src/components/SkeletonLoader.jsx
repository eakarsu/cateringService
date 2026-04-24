export function SkeletonCard() {
  return (
    <div className="card animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="h-5 bg-gray-200 rounded-full w-20"></div>
        <div className="flex gap-1">
          <div className="w-6 h-6 bg-gray-200 rounded"></div>
          <div className="w-6 h-6 bg-gray-200 rounded"></div>
        </div>
      </div>
      <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-8"></div></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
    </tr>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div className="animate-pulse">
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              {Array(cols).fill(0).map((_, i) => (
                <th key={i}><div className="h-3 bg-gray-200 rounded w-20"></div></th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {Array(rows).fill(0).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array(count).fill(0).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

export default function SkeletonLoader({ type = 'grid', count = 6, rows = 5, cols = 5 }) {
  if (type === 'table') return <SkeletonTable rows={rows} cols={cols} />;
  return <SkeletonGrid count={count} />;
}
