import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import './i18n';
import Login from './pages/Login';
import Layout from './pages/Layout';
import Dashboard from './pages/Dashboard';
import Agents from './pages/Agents';
import Members from './pages/Members';
import Transactions from './pages/Transactions';
import BettingRecords from './pages/BettingRecords';
import GameControl from './pages/GameControl';
import GameRounds from './pages/GameRounds';
import OperationLogs from './pages/OperationLogs';
import Reports from './pages/Reports';
import Notices from './pages/Notices';
import Settings from './pages/Settings';

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
          <Route path="agents" element={<Agents />} />
          <Route path="members" element={<Members />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="betting-records" element={<BettingRecords />} />
          <Route path="game-control" element={<GameControl />} />
          <Route path="game-rounds" element={<GameRounds />} />
          <Route path="operation-logs" element={<OperationLogs />} />
          <Route path="reports" element={<Reports />} />
          <Route path="notices" element={<Notices />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
