import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { agentManagementApi } from '../services/api';

interface BalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
  agentName: string;
  currentBalance: number;
  myBalance: number;
  onSuccess?: () => void;
}

type OperationType = 'deposit' | 'withdraw';

export default function BalanceModal({
  isOpen,
  onClose,
  agentId,
  agentName,
  currentBalance,
  myBalance,
  onSuccess
}: BalanceModalProps) {
  const [operationType, setOperationType] = useState<OperationType>('deposit');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setError('');
      setOperationType('deposit');
    }
  }, [isOpen]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleSave = async () => {
    const amountNum = parseFloat(amount);

    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      setError('請輸入有效的金額');
      return;
    }

    if (operationType === 'deposit' && amountNum > myBalance) {
      setError('存入金額不能超過自身額度餘額');
      return;
    }

    if (operationType === 'withdraw' && amountNum > currentBalance) {
      setError('提取金額不能超過代理當前餘額');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await agentManagementApi.adjustBalance(agentId, {
        type: operationType,
        amount: amountNum
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Failed to adjust balance:', err);
      setError(err.response?.data?.error || '操作失敗，請稍後再試');
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
          {/* 我的剩餘額度 */}
          <div className="bg-[#252525] border border-[#333] rounded-lg p-4 mb-6">
            <p className="text-gray-400 text-sm mb-2">代理剩餘額度</p>
            <p className="text-white text-3xl font-bold">{formatCurrency(myBalance)}</p>
          </div>

          {/* 代理當前餘額 */}
          <div className="mb-4">
            <label className="block text-gray-400 text-sm mb-2">代理餘額</label>
            <input
              type="text"
              value={formatCurrency(currentBalance)}
              disabled
              className="w-full px-4 py-3 bg-[#252525] border border-[#333] rounded-lg text-gray-400 text-sm"
            />
          </div>

          {/* 操作類型 */}
          <div className="mb-4">
            <label className="block text-gray-400 text-sm mb-2">
              <span className="text-red-500">*</span> 操作類型
            </label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="operationType"
                  checked={operationType === 'deposit'}
                  onChange={() => setOperationType('deposit')}
                  className="w-4 h-4 text-amber-500 bg-[#333] border-[#444] focus:ring-amber-500"
                />
                <span className="text-white text-sm">存入</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="operationType"
                  checked={operationType === 'withdraw'}
                  onChange={() => setOperationType('withdraw')}
                  className="w-4 h-4 text-amber-500 bg-[#333] border-[#444] focus:ring-amber-500"
                />
                <span className="text-white text-sm">提取</span>
              </label>
            </div>
          </div>

          {/* 修改餘額 */}
          <div className="mb-2">
            <label className="block text-gray-400 text-sm mb-2">
              <span className="text-red-500">*</span> 修改餘額
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError('');
              }}
              placeholder="請輸入修改餘額"
              className="w-full px-4 py-3 bg-[#252525] border border-[#333] rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* 提示 */}
          <p className="text-gray-500 text-xs mb-4">
            {operationType === 'deposit'
              ? '給代理的額度不能超過自身額度餘額'
              : '提取金額不能超過代理當前餘額'}
          </p>

          {/* 錯誤訊息 */}
          {error && (
            <p className="text-red-400 text-sm text-center mb-4">{error}</p>
          )}
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
