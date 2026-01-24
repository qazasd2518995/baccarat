import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { agentManagementApi } from '../services/api';

interface ShareHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
  agentName: string;
}

interface HistoryRecord {
  id: string;
  operatorUsername: string;
  operatorNickname: string;
  targetUsername: string;
  targetNickname: string;
  changeType: string;
  oldValue: number;
  newValue: number;
  gameCategory: string;
  platform: string;
  createdAt: string;
}

export default function ShareHistoryModal({
  isOpen,
  onClose,
  agentId,
  agentName
}: ShareHistoryModalProps) {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  useEffect(() => {
    if (isOpen && agentId) {
      fetchHistory();
    }
  }, [isOpen, agentId, page]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await agentManagementApi.getShareHistory(agentId, { page, limit });
      setHistory(res.data.logs || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch share history:', err);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getChangeTypeText = (type: string) => {
    switch (type) {
      case 'share':
        return '占成';
      case 'rebate':
        return '退水';
      default:
        return type;
    }
  };

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case 'share':
        return 'text-blue-400';
      case 'rebate':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#1a1a1a] border border-[#333] rounded-xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#333]">
          <h2 className="text-white text-lg font-bold">占成/退水历史 - {agentName}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-400">加载中...</div>
            </div>
          ) : history.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-400">暂无历史记录</div>
            </div>
          ) : (
            <div className="bg-[#252525] rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#1a1a1a]">
                    <th className="px-4 py-3 text-left text-gray-400 text-sm font-medium">操作时间</th>
                    <th className="px-4 py-3 text-left text-gray-400 text-sm font-medium">操作人</th>
                    <th className="px-4 py-3 text-left text-gray-400 text-sm font-medium">变动类型</th>
                    <th className="px-4 py-3 text-left text-gray-400 text-sm font-medium">游戏分类</th>
                    <th className="px-4 py-3 text-left text-gray-400 text-sm font-medium">平台</th>
                    <th className="px-4 py-3 text-center text-gray-400 text-sm font-medium">原值</th>
                    <th className="px-4 py-3 text-center text-gray-400 text-sm font-medium">新值</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((record, index) => (
                    <tr
                      key={record.id}
                      className={`border-t border-[#333] ${index % 2 === 0 ? 'bg-[#252525]' : 'bg-[#2a2a2a]'}`}
                    >
                      <td className="px-4 py-3 text-gray-300 text-sm">
                        {formatDate(record.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-white text-sm">
                        {record.operatorNickname || record.operatorUsername}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium ${getChangeTypeColor(record.changeType)}`}>
                          {getChangeTypeText(record.changeType)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-sm">
                        {record.gameCategory || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-sm">
                        {record.platform || '-'}
                      </td>
                      <td className="px-4 py-3 text-center text-red-400 text-sm">
                        {record.oldValue}%
                      </td>
                      <td className="px-4 py-3 text-center text-green-400 text-sm">
                        {record.newValue}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer with Pagination */}
        <div className="flex items-center justify-between p-4 border-t border-[#333]">
          <div className="text-gray-400 text-sm">
            第 {page} 页，共 {totalPages} 页
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="p-2 bg-[#333] text-white rounded-lg hover:bg-[#444] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 bg-[#333] text-white rounded-lg text-sm">
              {page}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="p-2 bg-[#333] text-white rounded-lg hover:bg-[#444] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#333] text-white rounded-lg hover:bg-[#444] transition-colors"
          >
            关 闭
          </button>
        </div>
      </motion.div>
    </div>
  );
}
