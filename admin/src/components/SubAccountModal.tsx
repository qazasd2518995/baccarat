import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { agentManagementApi } from '../services/api';

interface SubAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  subAccount?: {
    id: string;
    username: string;
    nickname: string;
    status: string;
  } | null;
  onSuccess?: () => void;
}

export default function SubAccountModal({
  isOpen,
  onClose,
  subAccount,
  onSuccess
}: SubAccountModalProps) {
  const [form, setForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    nickname: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!subAccount;

  useEffect(() => {
    if (isOpen) {
      if (subAccount) {
        setForm({
          username: subAccount.username,
          password: '',
          confirmPassword: '',
          nickname: subAccount.nickname || ''
        });
      } else {
        setForm({
          username: '',
          password: '',
          confirmPassword: '',
          nickname: ''
        });
      }
      setError('');
    }
  }, [isOpen, subAccount]);

  const generateUsername = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm({ ...form, username: result });
  };

  const validateForm = () => {
    if (!form.username) {
      setError('請輸入帳號');
      return false;
    }

    if (form.username.length < 6 || form.username.length > 12) {
      setError('帳號格式為6-12位');
      return false;
    }

    if (!isEditing || form.password) {
      if (!form.password) {
        setError('請輸入密碼');
        return false;
      }

      if (form.password.length < 8 || form.password.length > 16) {
        setError('密碼為8-16位字符');
        return false;
      }

      if (form.password !== form.confirmPassword) {
        setError('兩次密碼輸入不一致');
        return false;
      }
    }

    if (!form.nickname) {
      setError('請輸入代理名稱');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError('');

      if (isEditing) {
        const updateData: any = { nickname: form.nickname };
        if (form.password) {
          updateData.password = form.password;
        }
        await agentManagementApi.updateSubAccount(subAccount!.id, updateData);
      } else {
        await agentManagementApi.createSubAccount({
          username: form.username,
          password: form.password,
          nickname: form.nickname
        });
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Failed to save sub account:', err);
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
          <h2 className="text-white text-lg font-bold">
            {isEditing ? '編輯子帳號' : '創建子帳號'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* 帳號設置 */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">
              <span className="text-red-500">*</span> 帳號設置
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value.toUpperCase() })}
                disabled={isEditing}
                placeholder="請輸入帳號"
                className="flex-1 px-4 py-3 bg-[#252525] border border-[#333] rounded-lg text-white text-sm focus:outline-none focus:border-amber-500 disabled:text-gray-500"
              />
              {!isEditing && (
                <button
                  onClick={generateUsername}
                  className="px-4 py-3 bg-amber-500 hover:bg-amber-600 text-black text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
                >
                  <RefreshCw className="w-4 h-4" />
                  自動生成
                </button>
              )}
            </div>
            <p className="text-gray-500 text-xs mt-1">帳號為英文加數字組成，格式為6-12位</p>
          </div>

          {/* 密碼設置 */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">
              <span className="text-red-500">*</span> 密碼設置
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={isEditing ? '不修改請留空' : '請輸入密碼'}
                className="w-full px-4 py-3 pr-10 bg-[#252525] border border-[#333] rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-gray-500 text-xs mt-1">8-16位字符</p>
          </div>

          {/* 確認密碼 */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">
              <span className="text-red-500">*</span> 確認密碼
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="再次確認密碼"
                className="w-full px-4 py-3 pr-10 bg-[#252525] border border-[#333] rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 代理名稱 */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">
              <span className="text-red-500">*</span> 代理名稱
            </label>
            <div className="relative">
              <input
                type="text"
                value={form.nickname}
                onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                placeholder="請輸入代理名稱"
                className="w-full px-4 py-3 pr-10 bg-[#252525] border border-[#333] rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
              />
              {form.nickname && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, nickname: '' })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* 錯誤訊息 */}
          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
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
            {loading ? '處理中...' : '提 交'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
