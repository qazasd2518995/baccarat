import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, AlertTriangle, Info, X, ChevronDown, ChevronUp, Bell } from 'lucide-react';
import { noticeApi } from '../services/api';

interface Notice {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'urgent';
  isPinned: boolean;
  createdAt: string;
}

export default function DashboardNotices() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      const { data } = await noticeApi.getPublicNotices('agent_dashboard');
      setNotices(data || []);
    } catch (error) {
      console.error('Failed to fetch notices:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const dismissNotice = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'urgent':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      default:
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getTypeBorder = (type: string) => {
    switch (type) {
      case 'urgent':
        return 'border-l-red-500 bg-red-500/5';
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-500/5';
      default:
        return 'border-l-blue-500 bg-blue-500/5';
    }
  };

  const visibleNotices = notices.filter((n) => !dismissedIds.has(n.id));

  if (loading) {
    return null;
  }

  if (visibleNotices.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <div className="flex items-center gap-2 mb-3">
        <Bell className="w-5 h-5 text-amber-400" />
        <h2 className="text-lg font-semibold text-white">系統公告</h2>
        <span className="text-sm text-gray-500">({visibleNotices.length})</span>
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {visibleNotices.map((notice) => {
            const isExpanded = expandedIds.has(notice.id);
            const shouldTruncate = notice.content.length > 100;

            return (
              <motion.div
                key={notice.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`rounded-lg border-l-4 ${getTypeBorder(notice.type)} border border-[#333] overflow-hidden`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {getTypeIcon(notice.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-white truncate">{notice.title}</h3>
                          {notice.isPinned && (
                            <span className="px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-400 rounded">
                              置頂
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 whitespace-pre-wrap">
                          {shouldTruncate && !isExpanded
                            ? `${notice.content.slice(0, 100)}...`
                            : notice.content}
                        </p>
                        {shouldTruncate && (
                          <button
                            onClick={() => toggleExpand(notice.id)}
                            className="flex items-center gap-1 mt-2 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-3 h-3" />
                                收起
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3 h-3" />
                                展開
                              </>
                            )}
                          </button>
                        )}
                        <div className="text-xs text-gray-500 mt-2">
                          {new Date(notice.createdAt).toLocaleString('zh-CN')}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => dismissNotice(notice.id)}
                      className="p-1 text-gray-500 hover:text-white hover:bg-[#333] rounded transition-colors shrink-0"
                      title="關閉"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
