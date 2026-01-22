import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { User, Globe, Save, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { userApi } from '../services/api';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { user, setAuth } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [profileData, setProfileData] = useState({
    nickname: user?.nickname || '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { data } = await userApi.updateUser(user.id, {
        nickname: profileData.nickname,
      });
      setAuth(data, localStorage.getItem('admin_token') || '');
      setMessage('保存成功');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('保存失败');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage('两次输入的密码不一致');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    setSaving(true);
    try {
      // Note: This would need a backend endpoint for password change
      setMessage('密码修改功能即将推出');
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setMessage('修改失败');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const tabs = [
    { id: 'profile', label: '个人资料', icon: User },
    { id: 'language', label: '语言设置', icon: Globe },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{t('settings')}</h1>
      </div>

      {/* Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl ${
            message.includes('成功') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}
        >
          {message}
        </motion.div>
      )}

      <div className="grid grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="col-span-1">
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                  activeTab === tab.id
                    ? 'bg-amber-500/20 text-amber-400 border-l-2 border-amber-500'
                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="col-span-3">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-white mb-4">个人资料</h2>

                {/* User Info */}
                <div className="p-4 bg-slate-700/50 rounded-xl">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">用户名：</span>
                      <span className="text-white ml-2">{user?.username}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">角色：</span>
                      <span className="text-amber-400 ml-2">{t(user?.role || '')}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">余额：</span>
                      <span className="text-white ml-2">{Number(user?.balance || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Nickname */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">昵称</label>
                  <input
                    type="text"
                    value={profileData.nickname}
                    onChange={(e) => setProfileData({ ...profileData, nickname: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Password Change */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">密码</label>
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
                  >
                    修改密码
                  </button>
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-medium rounded-xl transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            )}

            {activeTab === 'language' && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-white mb-4">语言设置</h2>

                <div className="space-y-3">
                  {[
                    { code: 'zh', label: '简体中文' },
                    { code: 'en', label: 'English' },
                  ].map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => i18n.changeLanguage(lang.code)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                        i18n.language === lang.code
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                          : 'bg-slate-700 text-white hover:bg-slate-600'
                      }`}
                    >
                      <span>{lang.label}</span>
                      {i18n.language === lang.code && (
                        <span className="text-sm">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">修改密码</h2>
              <button onClick={() => setShowPasswordModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">当前密码</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">新密码</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">确认新密码</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <button
                onClick={handleChangePassword}
                disabled={saving}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-medium rounded-xl transition-colors"
              >
                {saving ? '修改中...' : '确认修改'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
