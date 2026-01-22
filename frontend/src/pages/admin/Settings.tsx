import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Lock, Bell, Save, Eye, EyeOff } from 'lucide-react';
import { Button, Input } from '../../components/admin/common/Modal';
import { useAuthStore } from '../../store/authStore';
import api, { userApi } from '../../services/api';

export default function Settings() {
  const { t } = useTranslation();
  const { user, token, updateUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'notifications'>('profile');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile form
  const [nickname, setNickname] = useState(user?.nickname || '');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    settlementNotifications: true,
    balanceAlerts: true,
    systemAnnouncements: true,
    soundEffects: false,
  });
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  // Load notification settings when tab changes to notifications
  useEffect(() => {
    if (activeTab === 'notifications' && user?.id) {
      setNotificationsLoading(true);
      userApi.getNotificationSettings(user.id)
        .then((res) => {
          setNotificationSettings({
            settlementNotifications: res.data.settlementNotifications ?? true,
            balanceAlerts: res.data.balanceAlerts ?? true,
            systemAnnouncements: res.data.systemAnnouncements ?? true,
            soundEffects: res.data.soundEffects ?? false,
          });
        })
        .catch((err) => {
          console.error('[Settings] Failed to load notification settings:', err);
        })
        .finally(() => {
          setNotificationsLoading(false);
        });
    }
  }, [activeTab, user?.id]);

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.patch(
        `/users/${user?.id}`,
        { nickname },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      updateUser({ nickname });
      setMessage({ type: 'success', text: t('operationSuccess') });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || t('operationFailed') });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: t('passwordMismatch') || '密码不匹配' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: t('passwordTooShort') || '密码至少需要6个字符' });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      await api.post(
        '/auth/change-password',
        {
          currentPassword,
          newPassword,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage({ type: 'success', text: t('passwordChanged') });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.error || t('operationFailed') });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotificationSettings = async () => {
    if (!user?.id) return;
    setSaving(true);
    setMessage(null);
    try {
      await userApi.updateNotificationSettings(user.id, notificationSettings);
      setMessage({ type: 'success', text: t('operationSuccess') });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.error || t('operationFailed') });
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { key: 'profile', label: t('profile'), icon: <User size={18} /> },
    { key: 'password', label: t('password'), icon: <Lock size={18} /> },
    { key: 'notifications', label: t('notifications'), icon: <Bell size={18} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">{t('settingsTitle')}</h1>
        <p className="text-slate-400 mt-1">{t('settingsSubtitle')}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {tab.icon}
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            {/* Success/Error Message */}
            {message && (
              <div
                className={`mb-6 p-4 rounded-lg ${
                  message.type === 'success'
                    ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                    : 'bg-red-500/20 border border-red-500/30 text-red-400'
                }`}
              >
                {message.text}
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-white">{t('profileInfo')}</h2>

                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <span className="text-3xl font-bold text-white">
                      {(user?.nickname || user?.username || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-medium">{user?.username}</p>
                    <p className="text-sm text-slate-400">{user?.role.toUpperCase()}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      {t('username')}
                    </label>
                    <input
                      type="text"
                      value={user?.username || ''}
                      disabled
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-400 cursor-not-allowed"
                    />
                  </div>

                  <Input
                    label={t('nickname')}
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder={t('nickname')}
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveProfile} loading={saving}>
                    <Save size={18} /> {t('saveChanges')}
                  </Button>
                </div>
              </div>
            )}

            {/* Password Tab */}
            {activeTab === 'password' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-white">{t('changePassword')}</h2>

                <div className="space-y-4">
                  <div className="relative">
                    <Input
                      label={t('currentPassword')}
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder={t('currentPassword')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-8 text-slate-400 hover:text-white"
                    >
                      {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  <div className="relative">
                    <Input
                      label={t('newPassword')}
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t('newPassword')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-8 text-slate-400 hover:text-white"
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  <Input
                    label={t('confirmPassword')}
                    type={showNewPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('confirmPassword')}
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleChangePassword} loading={saving}>
                    <Lock size={18} /> {t('changePassword')}
                  </Button>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-white">{t('notifications')}</h2>

                {notificationsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <label className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg cursor-pointer">
                      <div>
                        <p className="text-white font-medium">{t('settlementNotifications')}</p>
                        <p className="text-sm text-slate-400">{t('settlementNotificationsDesc')}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.settlementNotifications}
                        onChange={(e) => setNotificationSettings(prev => ({
                          ...prev,
                          settlementNotifications: e.target.checked
                        }))}
                        className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-blue-600 focus:ring-blue-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg cursor-pointer">
                      <div>
                        <p className="text-white font-medium">{t('balanceAlerts')}</p>
                        <p className="text-sm text-slate-400">{t('balanceAlertsDesc')}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.balanceAlerts}
                        onChange={(e) => setNotificationSettings(prev => ({
                          ...prev,
                          balanceAlerts: e.target.checked
                        }))}
                        className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-blue-600 focus:ring-blue-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg cursor-pointer">
                      <div>
                        <p className="text-white font-medium">{t('systemAnnouncements')}</p>
                        <p className="text-sm text-slate-400">{t('systemAnnouncementsDesc')}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.systemAnnouncements}
                        onChange={(e) => setNotificationSettings(prev => ({
                          ...prev,
                          systemAnnouncements: e.target.checked
                        }))}
                        className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-blue-600 focus:ring-blue-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg cursor-pointer">
                      <div>
                        <p className="text-white font-medium">{t('soundEffects')}</p>
                        <p className="text-sm text-slate-400">{t('soundEffectsDesc')}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.soundEffects}
                        onChange={(e) => setNotificationSettings(prev => ({
                          ...prev,
                          soundEffects: e.target.checked
                        }))}
                        className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button onClick={handleSaveNotificationSettings} loading={saving}>
                    <Save size={18} /> {t('saveSettings')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
