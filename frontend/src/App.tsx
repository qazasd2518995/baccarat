import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import './i18n';
import Login from './pages/Login';
import Lobby from './pages/Lobby';
import Game from './pages/Game';
import AdminLayout from './components/admin/layout/AdminLayout';
import {
  Dashboard,
  Agents,
  Members,
  Transactions,
  Reports,
  BettingRecords,
  GameRounds,
  GameControl,
  Notices,
  OperationLogs,
  Settings,
} from './pages/admin';

// Protected Route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Admin Route component - requires admin or agent role
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin' && user?.role !== 'agent') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected lobby route */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Lobby />
            </ProtectedRoute>
          }
        />

        {/* Protected game route */}
        <Route
          path="/game"
          element={
            <ProtectedRoute>
              <Game />
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="agents" element={<Agents />} />
          <Route path="members" element={<Members />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="reports" element={<Reports />} />
          <Route path="betting-records" element={<BettingRecords />} />
          <Route path="game-rounds" element={<GameRounds />} />
          <Route path="game-control" element={<GameControl />} />
          <Route path="notices" element={<Notices />} />
          <Route path="logs" element={<OperationLogs />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
