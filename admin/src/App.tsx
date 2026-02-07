import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import './i18n';
import Login from './pages/Login';
import Layout from './pages/Layout';
import Dashboard from './pages/Dashboard';
import AgentReport from './pages/AgentReport';
import BettingRecords from './pages/BettingRecords';
import AgentManagement from './pages/AgentManagement';
import Logs from './pages/Logs';
import GameRounds from './pages/GameRounds';
import Settings from './pages/Settings';
import Notices from './pages/Notices';
import Reports from './pages/Reports';
import GameControl from './pages/GameControl';
import OperationLogs from './pages/OperationLogs';

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
          <Route path="bet/index" element={<BettingRecords />} />
          <Route path="member/index" element={<AgentManagement />} />
          <Route path="log/index" element={<Logs />} />
          <Route path="game/rounds" element={<GameRounds />} />
          <Route path="game/control" element={<GameControl />} />
          <Route path="settings" element={<Settings />} />
          <Route path="notices" element={<Notices />} />
          <Route path="reports" element={<Reports />} />
          <Route path="operation-logs" element={<OperationLogs />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
