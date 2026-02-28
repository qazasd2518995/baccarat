import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import './i18n';
import Login from './pages/Login';
import Layout from './pages/Layout';
import Dashboard from './pages/Dashboard';
import AgentReport from './pages/AgentReport';
import AgentManagement from './pages/AgentManagement';
import GameRounds from './pages/GameRounds';
import Settings from './pages/Settings';
import Notices from './pages/Notices';
import WinControl from './pages/WinControl';
import ManualDetection from './pages/ManualDetection';
import ToastContainer from './components/Toast';

// Protected Route component (requires admin or agent role)
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Only admin and agent can access admin panel
  if (user?.role === 'member') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected admin routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="report/agent" element={<AgentReport />} />
          <Route path="member/index" element={<AgentManagement />} />
          <Route path="game/rounds" element={<GameRounds />} />
          <Route path="game/win-control" element={<WinControl />} />
          <Route path="game/manual-detection" element={<ManualDetection />} />
          <Route path="settings" element={<Settings />} />
          <Route path="notices" element={<Notices />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
