import { useEffect, useRef, useCallback } from 'react';
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  type TableUpdateEvent,
} from '../services/socket';
import { useAuthStore } from '../store/authStore';

interface TableUpdate {
  tableId: string;
  phase: 'betting' | 'sealed' | 'dealing' | 'result';
  timeRemaining: number;
  roundNumber: number;
  shoeNumber: number;
  lastResult?: 'player' | 'banker' | 'tie';
  roadmap: {
    banker: number;
    player: number;
    tie: number;
  };
}

export function useLobbySocket(onTableUpdate: (update: TableUpdate) => void) {
  const { token, isAuthenticated } = useAuthStore();
  const hasConnected = useRef(false);
  const callbackRef = useRef(onTableUpdate);

  // Keep callback ref up to date
  callbackRef.current = onTableUpdate;

  useEffect(() => {
    if (!isAuthenticated || !token) {
      return;
    }

    // Prevent double connection in React Strict Mode
    if (hasConnected.current) {
      return;
    }
    hasConnected.current = true;

    console.log('[useLobbySocket] Connecting...');
    const socket = connectSocket(token);

    // Connection events
    socket.on('connect', () => {
      console.log('[useLobbySocket] Connected');
    });

    socket.on('disconnect', () => {
      console.log('[useLobbySocket] Disconnected');
    });

    // Listen for table updates
    socket.on('lobby:tableUpdate', (data: TableUpdateEvent) => {
      console.log('[useLobbySocket] Table update:', data.tableId, data.phase, data.timeRemaining);
      callbackRef.current({
        tableId: data.tableId,
        phase: data.phase,
        timeRemaining: data.timeRemaining,
        roundNumber: data.roundNumber,
        shoeNumber: data.shoeNumber,
        lastResult: data.lastResult,
        roadmap: data.roadmap,
      });
    });

    return () => {
      console.log('[useLobbySocket] Cleanup');
      hasConnected.current = false;
      // Don't disconnect here - let the game page manage the connection
    };
  }, [isAuthenticated, token]);

  return null;
}
