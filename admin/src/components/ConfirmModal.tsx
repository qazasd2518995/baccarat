import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  type?: 'warning' | 'danger' | 'info';
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = '確定執行此操作？',
  message,
  confirmText = '確 定',
  cancelText = '取 消',
  loading = false,
  type = 'warning'
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const iconColors = {
    warning: 'bg-amber-500/20 text-amber-400',
    danger: 'bg-red-500/20 text-red-400',
    info: 'bg-blue-500/20 text-blue-400'
  };

  const confirmButtonColors = {
    warning: 'bg-amber-500 hover:bg-amber-600',
    danger: 'bg-red-500 hover:bg-red-600',
    info: 'bg-blue-500 hover:bg-blue-600'
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#1a1a1a] border border-[#333] rounded-xl w-full max-w-sm overflow-hidden"
      >
        <div className="p-6">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${iconColors[type]}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>

          {/* Title */}
          <h3 className="text-white text-lg font-bold text-center mb-2">{title}</h3>

          {/* Message */}
          <p className="text-gray-400 text-sm text-center">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-4 p-4 border-t border-[#333]">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2 bg-[#333] text-white rounded-lg hover:bg-[#444] transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-6 py-2 text-white font-medium rounded-lg transition-colors disabled:opacity-50 ${confirmButtonColors[type]}`}
          >
            {loading ? '處理中...' : confirmText}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
