import { useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useDragonTigerStore, type DragonTigerBetType, type DTBet } from '../store/dragonTigerStore';
import { useAuthStore } from '../store/authStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

let socket: Socket | null = null;

function getSocket(): Socket | null {
  return socket;
}

function connectSocket(token: string): Socket {
  if (socket?.connected) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    console.log('[DT Socket] Connected:', socket?.id);
    // Join dragon tiger table
    socket?.emit('join:table', { gameType: 'dragontiger' });
    // Request current game state
    socket?.emit('dt:requestState');
  });

  socket.on('connect_error', (error) => {
    console.error('[DT Socket] Connection error:', error.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('[DT Socket] Disconnected:', reason);
  });

  return socket;
}

function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('[DT Socket] Disconnected manually');
  }
}

export function useDragonTigerSocket() {
  const { token, isAuthenticated } = useAuthStore();
  const hasConnected = useRef(false);

  const {
    setConnected,
    setPhase,
    setTimeRemaining,
    setRoundId,
    setRoundNumber,
    setBalance,
    setConfirmedBets,
    clearConfirmedBets,
    clearPendingBets,
    setDragonCard,
    setTigerCard,
    setLastResult,
    setLastSettlement,
    setRoadmapData,
    setShoeInfo,
    resetForNewRound,
    resetAll,
    saveLastBets,
    pendingBets,
    phase,
  } = useDragonTigerStore();

  useEffect(() => {
    if (!isAuthenticated || !token) {
      return;
    }

    if (hasConnected.current) {
      return;
    }
    hasConnected.current = true;

    console.log('[useDragonTigerSocket] Connecting...');
    const socket = connectSocket(token);

    socket.on('connect', () => {
      console.log('[useDragonTigerSocket] Connected');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('[useDragonTigerSocket] Disconnected');
      setConnected(false);
    });

    // Game state (for reconnection/initial load)
    socket.on('dt:state', (data: any) => {
      console.log('[useDragonTigerSocket] Received dt:state', data);
      setPhase(data.phase);
      setTimeRemaining(data.timeRemaining);
      setRoundId(data.roundId);
      setRoundNumber(data.roundNumber || 0);
      setShoeInfo(data.shoeNumber || 1, 416);

      if (data.dragonCard) {
        setDragonCard(data.dragonCard, data.dragonValue);
      }
      if (data.tigerCard) {
        setTigerCard(data.tigerCard, data.tigerValue);
      }

      if (data.result) {
        setLastResult(data.result, data.isSuitedTie);
      }

      if (data.myBets && data.myBets.length > 0) {
        setConfirmedBets(data.myBets);
      }
    });

    // Phase change events
    socket.on('dt:phase', (data: any) => {
      console.log('[useDragonTigerSocket] Phase changed:', data.phase);
      setPhase(data.phase);
      setTimeRemaining(data.timeRemaining);
      setRoundId(data.roundId);

      if (data.phase === 'betting') {
        resetForNewRound();
      }
    });

    // Timer tick
    socket.on('dt:timer', (data: any) => {
      setTimeRemaining(data.timeRemaining);
    });

    // Card dealing
    socket.on('dt:card', (data: any) => {
      console.log('[useDragonTigerSocket] Card dealt:', data.target);
      if (data.target === 'dragon') {
        setDragonCard(data.card, data.value);
      } else {
        setTigerCard(data.card, data.value);
      }
    });

    // Round result
    socket.on('dt:result', (data: any) => {
      console.log('[useDragonTigerSocket] Round result:', data.result);
      setLastResult(data.result, data.isSuitedTie);
      setRoundNumber(data.roundNumber);
    });

    // Bet confirmation
    socket.on('dt:bet:confirmed', (data: any) => {
      console.log('[useDragonTigerSocket] Bet confirmed:', data);
      setConfirmedBets(data.bets);
      if (data.bets.length > 0) {
        saveLastBets();
      }
    });

    // Settlement
    socket.on('dt:settlement', (data: any) => {
      console.log('[useDragonTigerSocket] Settlement:', data);
      setLastSettlement({
        bets: data.bets.map((b: any) => ({
          type: b.type,
          amount: b.amount,
          won: b.won,
          payout: b.payout,
        })),
        totalPayout: data.totalPayout,
        netResult: data.netResult,
      });
      setBalance(data.newBalance);
    });

    // Balance updates
    socket.on('user:balance', (data: any) => {
      console.log('[useDragonTigerSocket] Balance updated:', data.balance, data.reason);
      setBalance(data.balance);
    });

    // Roadmap updates
    socket.on('dt:roadmap', (data: any) => {
      console.log('[useDragonTigerSocket] Roadmap updated:', data.recentRounds.length, 'rounds');
      setRoadmapData(data.recentRounds);
    });

    // Error handling
    socket.on('error', (data: any) => {
      console.error('[useDragonTigerSocket] Error:', data.code, data.message);
    });

    return () => {
      console.log('[useDragonTigerSocket] Cleanup');
      hasConnected.current = false;
      disconnectSocket();
      resetAll();
    };
  }, [isAuthenticated, token]);

  // Submit pending bets to server
  const submitBets = useCallback(() => {
    if (pendingBets.length === 0) {
      return;
    }

    if (phase !== 'betting') {
      console.warn('[useDragonTigerSocket] Cannot submit bets: not in betting phase');
      return;
    }

    const s = getSocket();
    if (!s?.connected) {
      console.error('[useDragonTigerSocket] Cannot submit bets: not connected');
      return;
    }

    console.log('[useDragonTigerSocket] Submitting bets:', pendingBets);
    s.emit('dt:bet:place', { bets: pendingBets });
  }, [pendingBets, phase]);

  // Cancel all bets
  const cancelBets = useCallback(() => {
    if (phase !== 'betting') {
      console.warn('[useDragonTigerSocket] Cannot cancel bets: not in betting phase');
      return;
    }

    const s = getSocket();
    if (!s?.connected) {
      console.error('[useDragonTigerSocket] Cannot cancel bets: not connected');
      return;
    }

    console.log('[useDragonTigerSocket] Canceling bets');
    s.emit('dt:bet:clear');
    clearPendingBets();
    clearConfirmedBets();
  }, [phase, clearPendingBets, clearConfirmedBets]);

  return {
    submitBets,
    cancelBets,
  };
}
