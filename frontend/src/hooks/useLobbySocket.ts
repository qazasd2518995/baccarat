import { useEffect, useRef } from 'react';
import {
  connectSocket,
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
  const callbackRef = useRef(onTableUpdate);

  // Keep callback ref up to date
  callbackRef.current = onTableUpdate;

  useEffect(() => {
    if (!isAuthenticated || !token) {
      return;
    }

    console.log('[useLobbySocket] Setting up socket connection...');
    const socket = connectSocket(token);

    // Handler function for table updates
    const handleTableUpdate = (data: TableUpdateEvent) => {
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
    };

    // Handler for connection
    const handleConnect = () => {
      console.log('[useLobbySocket] Connected');
    };

    const handleDisconnect = () => {
      console.log('[useLobbySocket] Disconnected');
    };

    // Remove any existing listeners first to prevent duplicates
    socket.off('lobby:tableUpdate', handleTableUpdate);
    socket.off('connect', handleConnect);
    socket.off('disconnect', handleDisconnect);

    // Add listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('lobby:tableUpdate', handleTableUpdate);

    return () => {
      console.log('[useLobbySocket] Cleanup - removing listeners');
      socket.off('lobby:tableUpdate', handleTableUpdate);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [isAuthenticated, token]);

  return null;
}
