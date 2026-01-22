import { useEffect, useRef } from 'react';
import { connectSocket, disconnectSocket, type BalanceUpdateEvent } from '../services/socket';
import { useAuthStore } from '../store/authStore';

/**
 * Hook for listening to real-time balance updates via WebSocket
 * Used in admin panel to receive instant balance updates when transactions occur
 */
export function useBalanceSocket(onBalanceUpdate?: (data: BalanceUpdateEvent) => void) {
  const { token, isAuthenticated, updateUser } = useAuthStore();
  const hasConnected = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      return;
    }

    // Prevent double connection in React Strict Mode
    if (hasConnected.current) {
      return;
    }
    hasConnected.current = true;

    console.log('[useBalanceSocket] Connecting...');
    const socket = connectSocket(token);

    socket.on('connect', () => {
      console.log('[useBalanceSocket] Connected');
    });

    socket.on('disconnect', () => {
      console.log('[useBalanceSocket] Disconnected');
    });

    // Listen for balance updates
    socket.on('user:balance', (data: BalanceUpdateEvent) => {
      console.log('[useBalanceSocket] Balance updated:', data.balance, data.reason);

      // Update authStore balance
      updateUser({ balance: data.balance });

      // Call custom callback if provided
      if (onBalanceUpdate) {
        onBalanceUpdate(data);
      }
    });

    return () => {
      console.log('[useBalanceSocket] Cleanup');
      hasConnected.current = false;
      disconnectSocket();
    };
  }, [isAuthenticated, token, updateUser, onBalanceUpdate]);
}
