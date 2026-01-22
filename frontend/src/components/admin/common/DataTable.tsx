import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface Column {
  key: string;
  header: string;
  render?: (item: any) => React.ReactNode;
  className?: string;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  keyField: string;
  loading?: boolean;
  emptyMessage?: string;
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
    onPageChange: (page: number) => void;
  };
}

export default function DataTable({
  columns,
  data,
  keyField,
  loading = false,
  emptyMessage = 'No data found',
  pagination,
}: DataTableProps) {
  if (loading) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-slate-700/50 border-b border-slate-700" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 border-b border-slate-700 flex items-center px-4">
              <div className="h-4 bg-slate-700 rounded w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-700/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={String(item[keyField])}
                  className="hover:bg-slate-700/30 transition-colors"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-sm text-slate-300 ${col.className || ''}`}
                    >
                      {col.render
                        ? col.render(item)
                        : String(item[col.key] ?? '-')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="px-4 py-3 border-t border-slate-700 flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => pagination.onPageChange(1)}
              disabled={pagination.page === 1}
              className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronsLeft size={18} />
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="px-3 py-1 text-sm text-white">{pagination.page}</span>
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={18} />
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.totalPages)}
              disabled={pagination.page === pagination.totalPages}
              className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronsRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
