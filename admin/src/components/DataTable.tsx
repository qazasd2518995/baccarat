import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown, ChevronUp } from 'lucide-react';

export interface Column {
  key: string;
  header: string;
  render?: (item: any) => React.ReactNode;
  className?: string;
  primary?: boolean;
  hideOnMobile?: boolean;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  keyField: string;
  loading?: boolean;
  emptyMessage?: string;
  mobileCardMode?: boolean;
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
    onPageChange: (page: number) => void;
  };
}

function MobileCard({ item, columns, keyField, expandedId, onToggle }: {
  item: any;
  columns: Column[];
  keyField: string;
  expandedId: string | null;
  onToggle: (id: string) => void;
}) {
  const itemId = String(item[keyField]);
  const isExpanded = expandedId === itemId;
  const primaryCols = columns.filter(c => c.primary);
  const secondaryCols = columns.filter(c => !c.primary && !c.hideOnMobile);

  return (
    <div className="bg-[#252525]/30 rounded-lg p-3 border border-[#333]">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => onToggle(itemId)}
      >
        <div className="flex-1 min-w-0">
          {primaryCols.length > 0 ? (
            <div className="space-y-1">
              {primaryCols.map((col) => (
                <div key={col.key} className="text-sm">
                  <span className="text-gray-400 text-xs">{col.header}: </span>
                  <span className="text-white">
                    {col.render ? col.render(item) : String(item[col.key] ?? '-')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-white">
              {columns[0]?.render ? columns[0].render(item) : String(item[columns[0]?.key] ?? '-')}
            </div>
          )}
        </div>
        <button className="p-1.5 text-gray-400 hover:text-white transition-colors ml-2 flex-shrink-0">
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {isExpanded && secondaryCols.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#333] grid grid-cols-2 gap-2">
          {secondaryCols.map((col) => (
            <div key={col.key} className="text-sm">
              <div className="text-gray-400 text-xs mb-0.5">{col.header}</div>
              <div className="text-gray-300">
                {col.render ? col.render(item) : String(item[col.key] ?? '-')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DataTable({
  columns,
  data,
  keyField,
  loading = false,
  emptyMessage = 'No data found',
  mobileCardMode = false,
  pagination,
}: DataTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleToggle = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading) {
    return (
      <div className="bg-[#1e1e1e] border border-[#333] rounded-xl overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-[#252525]/50 border-b border-[#333]" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 border-b border-[#333] flex items-center px-4">
              <div className="h-4 bg-[#252525] rounded w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const renderPagination = () => {
    if (!pagination || pagination.totalPages <= 1) return null;

    return (
      <div className="px-3 sm:px-4 py-3 border-t border-[#333] flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-xs sm:text-sm text-gray-400 text-center sm:text-left">
          第 {pagination.page} / {pagination.totalPages} 頁 (共 {pagination.total} 條)
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => pagination.onPageChange(1)}
            disabled={pagination.page === 1}
            className="p-2 sm:p-1.5 rounded hover:bg-[#252525] text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronsLeft size={18} />
          </button>
          <button
            onClick={() => pagination.onPageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="p-2 sm:p-1.5 rounded hover:bg-[#252525] text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="px-3 py-1 text-sm text-white">{pagination.page}</span>
          <button
            onClick={() => pagination.onPageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
            className="p-2 sm:p-1.5 rounded hover:bg-[#252525] text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={18} />
          </button>
          <button
            onClick={() => pagination.onPageChange(pagination.totalPages)}
            disabled={pagination.page === pagination.totalPages}
            className="p-2 sm:p-1.5 rounded hover:bg-[#252525] text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronsRight size={18} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#1e1e1e] border border-[#333] rounded-xl overflow-hidden">
      {mobileCardMode ? (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden p-3 space-y-2">
            {data.length === 0 ? (
              <div className="py-12 text-center text-gray-400">{emptyMessage}</div>
            ) : (
              data.map((item) => (
                <MobileCard
                  key={String(item[keyField])}
                  item={item}
                  columns={columns}
                  keyField={keyField}
                  expandedId={expandedId}
                  onToggle={handleToggle}
                />
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#252525]/50">
                  {columns.filter(c => !c.hideOnMobile).map((col) => (
                    <th
                      key={col.key}
                      className={`px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider ${col.className || ''}`}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333]">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400">
                      {emptyMessage}
                    </td>
                  </tr>
                ) : (
                  data.map((item) => (
                    <tr
                      key={String(item[keyField])}
                      className="hover:bg-[#252525]/30 transition-colors"
                    >
                      {columns.filter(c => !c.hideOnMobile).map((col) => (
                        <td
                          key={col.key}
                          className={`px-4 py-3 text-sm text-gray-300 ${col.className || ''}`}
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
        </>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#252525]/50">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider ${col.className || ''}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#333]">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr
                    key={String(item[keyField])}
                    className="hover:bg-[#252525]/30 transition-colors"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 text-sm text-gray-300 ${col.className || ''}`}
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
      )}

      {renderPagination()}
    </div>
  );
}
