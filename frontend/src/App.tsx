import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import './i18n';
import Login from './pages/Login';
import Lobby from './pages/Lobby';
import Game from './pages/Game';
import DragonTigerGame from './pages/DragonTigerGame';
import BullBullGame from './pages/BullBullGame';

// Protected Route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
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

        {/* Protected lobby route */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Lobby />
            </ProtectedRoute>
          }
        />

        {/* Protected game route - Baccarat */}
        <Route
          path="/game"
          element={
            <ProtectedRoute>
              <Game />
            </ProtectedRoute>
          }
        />

        {/* Protected Dragon Tiger game route */}
        <Route
          path="/game/dragontiger"
          element={
            <ProtectedRoute>
              <DragonTigerGame />
            </ProtectedRoute>
          }
        />

        {/* Protected Bull Bull game route */}
        <Route
          path="/game/bullbull"
          element={
            <ProtectedRoute>
              <BullBullGame />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
