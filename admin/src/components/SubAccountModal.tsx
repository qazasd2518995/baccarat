import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { agentManagementApi } from '../services/api';

const PERMISSION_OPTIONS = [
  { key: 'agentManagement', label: '代理管理' },
  { key: 'memberManagement', label: '会员管理' },
  { key: 'shareSettings', label: '占成设定' },
  { key: 'betLimits', label: '限红设定' },
  { key: 'balanceOps', label: '存取款' },
  { key: 'viewReports', label: '报表查看' },
  { key: 'viewLogs', label: '日志查看' },
];

interface SubAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  subAccount?: {
    id: string;
    username: string;
    nickname: string;
    status: string;
    permissions?: Record<string, boolean>;
  } | null;
  onSuccess?: () => void;
}

export default function SubAccountModal({
  isOpen,
  onClose,
  subAccount,
  onSuccess
}: SubAccountModalProps) {
  const defaultPermissions = () =>
    Object.fromEntries(PERMISSION_OPTIONS.map(p => [p.key, false]));

  const [form, setForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    nickname: '',
    permissions: defaultPermissions() as Record<string, boolean>,
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
          nickname: subAccount.nickname || '',
          permissions: { ...defaultPermissions(), ...subAccount.permissions },
        });
      } else {
        setForm({
          username: '',
          password: '',
          confirmPassword: '',
          nickname: '',
          permissions: defaultPermissions(),
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
      setError('请输入账号');
      return false;
    }

    if (form.username.length < 6 || form.username.length > 12) {
      setError('账号格式为6-12位');
      return false;
    }

    if (!isEditing || form.password) {
      if (!form.password) {
        setError('请输入密码');
        return false;
      }

      if (form.password.length < 8 || form.password.length > 16) {
        setError('密码为8-16位字符');
        return false;
      }

      if (form.password !== form.confirmPassword) {
        setError('两次密码输入不一致');
        return false;
      }
    }

    if (!form.nickname) {
      setError('请输入代理名称');
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
        const updateData: any = { nickname: form.nickname, permissions: form.permissions };
        if (form.password) {
          updateData.password = form.password;
        }
        await agentManagementApi.updateSubAccount(subAccount!.id, updateData);
      } else {
        await agentManagementApi.createSubAccount({
          username: form.username,
          password: form.password,
          nickname: form.nickname,
          permissions: form.permissions,
        });
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Failed to save sub account:', err);
      setError(err.response?.data?.error || '操作失败，请稍后再试');
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
            {isEditing ? '编辑子账号' : '创建子账号'}
          </h2>
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
                onChange={(e) => setForm({ ...form, username: e.target.value.toUpperCase() })}
                disabled={isEditing}
                placeholder="请输入账号"
                className="flex-1 px-4 py-3 bg-[#252525] border border-[#333] rounded-lg text-white text-sm focus:outline-none focus:border-amber-500 disabled:text-gray-500"
              />
              {!isEditing && (
                <button
                  onClick={generateUsername}
                  className="px-4 py-3 bg-amber-500 hover:bg-amber-600 text-black text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
                >
                  <RefreshCw className="w-4 h-4" />
                  自动生成
                </button>
              )}
            </div>
            <p className="text-gray-500 text-xs mt-1">账号为英文加数字组成，格式为6-12位</p>
          </div>

          {/* 密码设置 */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">
              <span className="text-red-500">*</span> 密码设置
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={isEditing ? '不修改请留空' : '请输入密码'}
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
              <span className="text-red-500">*</span> 确认密码
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

          {/* 权限设置 */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">权限设置</label>
            <div className="grid grid-cols-2 gap-2">
              {PERMISSION_OPTIONS.map((perm) => (
                <label
                  key={perm.key}
                  className="flex items-center gap-2 p-2 bg-[#252525] rounded-lg cursor-pointer hover:bg-[#333] transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={form.permissions[perm.key] || false}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        permissions: { ...form.permissions, [perm.key]: e.target.checked },
                      })
                    }
                    className="w-4 h-4 text-amber-500 bg-[#333] border-[#444] rounded focus:ring-amber-500"
                  />
                  <span className="text-white text-sm">{perm.label}</span>
                </label>
              ))}
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
            {loading ? '处理中...' : '提 交'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
