import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../../store/authStore';
import { useBalanceSocket } from '../../../hooks/useBalanceSocket';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AdminLayout() {
  const { t } = useTranslation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Connect to WebSocket for real-time balance updates
  useBalanceSocket();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Check if user has admin/agent role
  if (!user || (user.role !== 'admin' && user.role !== 'agent')) {
    return (
      <div className="min-h-screen bg-[#1a1f2e] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">{t('accessDenied')}</h1>
          <p className="text-gray-400 mb-6">{t('noPermission')}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            {t('returnToGame')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1f2e] flex">
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        currentPath={location.pathname}
        userRole={user.role}
      />

      {/* Main Content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        {/* Header */}
        <Header
          user={user}
          onLogout={handleLogout}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto bg-[#1a1f2e]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
