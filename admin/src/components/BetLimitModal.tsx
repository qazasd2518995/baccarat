import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { agentManagementApi } from '../services/api';

interface BetLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
  agentName: string;
  onSuccess?: () => void;
}

// 限紅選項配置
const BET_LIMIT_OPTIONS = [
  '100-1000',
  '100-3000',
  '100-5000',
  '100-10000',
  '500-5000',
  '500-10000',
  '500-30000',
  '1000-10000',
  '1000-30000',
  '1000-50000',
];

export default function BetLimitModal({
  isOpen,
  onClose,
  agentId,
  agentName,
  onSuccess
}: BetLimitModalProps) {
  const [selectedLimits, setSelectedLimits] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && agentId) {
      fetchBetLimits();
    }
  }, [isOpen, agentId]);

  const fetchBetLimits = async () => {
    try {
      const res = await agentManagementApi.getBetLimits(agentId);
      const enabledLimits = res.data.limits
        ?.filter((l: { enabled: boolean }) => l.enabled)
        .map((l: { limitRange: string }) => l.limitRange) || [];
      setSelectedLimits(enabledLimits);
    } catch (err) {
      console.error('Failed to fetch bet limits:', err);
    }
  };

  const handleSelectAll = () => {
    setSelectedLimits([...BET_LIMIT_OPTIONS]);
  };

  const handleSelectInverse = () => {
    setSelectedLimits(
      BET_LIMIT_OPTIONS.filter(limit => !selectedLimits.includes(limit))
    );
  };

  const handleToggleLimit = (limit: string) => {
    if (selectedLimits.includes(limit)) {
      setSelectedLimits(selectedLimits.filter(l => l !== limit));
    } else {
      setSelectedLimits([...selectedLimits, limit]);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      const limits = BET_LIMIT_OPTIONS.map(limit => ({
        limitRange: limit,
        enabled: selectedLimits.includes(limit)
      }));

      await agentManagementApi.updateBetLimits(agentId, { limits });

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Failed to save bet limits:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#1a1a1a] border border-[#333] rounded-xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#333]">
          <h2 className="text-white text-lg font-bold">編輯代理 - {agentName}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* 快速操作 */}
          <div className="flex items-center justify-end gap-2 mb-4">
            <button
              onClick={handleSelectAll}
              className="px-3 py-1.5 bg-[#333] text-white text-sm rounded hover:bg-[#444] transition-colors"
            >
              全選
            </button>
            <button
              onClick={handleSelectInverse}
              className="px-3 py-1.5 bg-[#333] text-white text-sm rounded hover:bg-[#444] transition-colors"
            >
              反選
            </button>
          </div>

          {/* 限紅選項 */}
          <div className="grid grid-cols-2 gap-3">
            {BET_LIMIT_OPTIONS.map(limit => (
              <label
                key={limit}
                className="flex items-center gap-3 p-3 bg-[#252525] rounded-lg cursor-pointer hover:bg-[#2a2a2a] transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedLimits.includes(limit)}
                  onChange={() => handleToggleLimit(limit)}
                  className="w-5 h-5 text-amber-500 bg-[#1a1a1a] border-[#444] rounded focus:ring-amber-500 focus:ring-offset-0"
                />
                <span className="text-white text-sm font-medium">{limit}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-4 p-4 border-t border-[#333]">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#333] text-white rounded-lg hover:bg-[#444] transition-colors"
          >
            取 消
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? '保存中...' : '保 存'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
