import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Eye, EyeOff } from 'lucide-react';
import { agentManagementApi } from '../services/api';

interface EditAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: {
    id: string;
    username: string;
    nickname: string;
  } | null;
  onSuccess?: () => void;
}

export default function EditAgentModal({
  isOpen,
  onClose,
  agent,
  onSuccess
}: EditAgentModalProps) {
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

  useEffect(() => {
    if (isOpen && agent) {
      setForm({
        username: agent.username,
        password: '',
        confirmPassword: '',
        nickname: agent.nickname || ''
      });
      setError('');
    }
  }, [isOpen, agent]);

  const validateForm = () => {
    if (!form.nickname) {
      setError('请输入代理名称');
      return false;
    }

    // 密码是可选的，但如果填了就要验证
    if (form.password) {
      if (form.password.length < 8 || form.password.length > 16) {
        setError('密码为8-16位字符');
        return false;
      }

      if (form.password !== form.confirmPassword) {
        setError('两次密码输入不一致');
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm() || !agent) return;

    try {
      setLoading(true);
      setError('');

      const updateData: any = { nickname: form.nickname };
      if (form.password) {
        updateData.password = form.password;
      }

      await agentManagementApi.updateAgent(agent.id, updateData);

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Failed to update agent:', err);
      setError(err.response?.data?.error || '操作失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !agent) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#1a1a1a] border border-[#333] rounded-xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#333]">
          <h2 className="text-white text-lg font-bold">编辑代理</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* 账号设置 */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">
              <span className="text-red-500">*</span> 账号设置
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.username}
                disabled
                className="flex-1 px-4 py-3 bg-[#252525] border border-[#333] rounded-lg text-gray-500 text-sm"
              />
              <button
                disabled
                className="px-4 py-3 bg-[#333] text-gray-500 text-sm font-medium rounded-lg cursor-not-allowed"
              >
                自动生成
              </button>
            </div>
            <p className="text-gray-500 text-xs mt-1">账号为英文加数字组成，格式为6-12位</p>
          </div>

          {/* 密码设置 */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">
              密码设置
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="不修改请留空"
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

          {/* 确认密码 */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">
              确认密码
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="再次确认密码"
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

          {/* 代理名称 */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">
              <span className="text-red-500">*</span> 代理名称
            </label>
            <div className="relative">
              <input
                type="text"
                value={form.nickname}
                onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                placeholder="请输入代理名称"
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

          {/* 错误信息 */}
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
            {loading ? '保存中...' : '保 存'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
