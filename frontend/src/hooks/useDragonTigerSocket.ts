import { useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useDragonTigerStore } from '../store/dragonTigerStore';
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
    reconnectionAttempts: 15,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 60000, // 60 seconds timeout for Render cold start
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

    console.log('[useDragonTigerSocket] Setting up socket connection...');
    const socket = connectSocket(token);

    // Helper function to initialize game state
    const initializeGame = () => {
      console.log('[useDragonTigerSocket] Initializing game state...');
      setConnected(true);
      // Join dragon tiger table
      socket.emit('join:table', { gameType: 'dragontiger' });
      // Request current game state
      socket.emit('dt:requestState');
    };

    // Handler functions
    const handleConnect = () => {
      console.log('[useDragonTigerSocket] Connected');
      initializeGame();
    };

    const handleDisconnect = () => {
      console.log('[useDragonTigerSocket] Disconnected');
      setConnected(false);
    };

    const handleState = (data: any) => {
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
    };

    const handlePhase = (data: any) => {
      console.log('[useDragonTigerSocket] Phase changed:', data.phase);
      setPhase(data.phase);
      setTimeRemaining(data.timeRemaining);
      setRoundId(data.roundId);

      if (data.phase === 'betting') {
        resetForNewRound();
      }
    };

    const handleTimer = (data: any) => {
      setTimeRemaining(data.timeRemaining);
    };

    const handleCard = (data: any) => {
      console.log('[useDragonTigerSocket] Card dealt:', data.target);
      if (data.target === 'dragon') {
        setDragonCard(data.card, data.value);
      } else {
        setTigerCard(data.card, data.value);
      }
    };

    const handleResult = (data: any) => {
      console.log('[useDragonTigerSocket] Round result:', data.result);
      setLastResult(data.result, data.isSuitedTie);
      setRoundNumber(data.roundNumber);
    };

    const handleBetConfirmed = (data: any) => {
      console.log('[useDragonTigerSocket] Bet confirmed:', data);
      setConfirmedBets(data.bets);
      if (data.bets.length > 0) {
        saveLastBets();
      }
    };

    const handleSettlement = (data: any) => {
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
    };

    const handleBalance = (data: any) => {
      console.log('[useDragonTigerSocket] Balance updated:', data.balance, data.reason);
      setBalance(data.balance);
    };

    const handleRoadmap = (data: any) => {
      console.log('[useDragonTigerSocket] Roadmap updated:', data.recentRounds.length, 'rounds');
      setRoadmapData(data.recentRounds);
    };

    const handleError = (data: any) => {
      console.error('[useDragonTigerSocket] Error:', data.code, data.message);
    };

    // Remove any existing listeners first to prevent duplicates
    socket.off('connect', handleConnect);
    socket.off('disconnect', handleDisconnect);
    socket.off('dt:state', handleState);
    socket.off('dt:phase', handlePhase);
    socket.off('dt:timer', handleTimer);
    socket.off('dt:card', handleCard);
    socket.off('dt:result', handleResult);
    socket.off('dt:bet:confirmed', handleBetConfirmed);
    socket.off('dt:settlement', handleSettlement);
    socket.off('user:balance', handleBalance);
    socket.off('dt:roadmap', handleRoadmap);
    socket.off('error', handleError);

    // Add listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('dt:state', handleState);
    socket.on('dt:phase', handlePhase);
    socket.on('dt:timer', handleTimer);
    socket.on('dt:card', handleCard);
    socket.on('dt:result', handleResult);
    socket.on('dt:bet:confirmed', handleBetConfirmed);
    socket.on('dt:settlement', handleSettlement);
    socket.on('user:balance', handleBalance);
    socket.on('dt:roadmap', handleRoadmap);
    socket.on('error', handleError);

    // If socket is already connected, initialize immediately
    if (socket.connected) {
      console.log('[useDragonTigerSocket] Socket already connected, initializing...');
      initializeGame();
    }

    return () => {
      console.log('[useDragonTigerSocket] Cleanup - removing listeners');
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('dt:state', handleState);
      socket.off('dt:phase', handlePhase);
      socket.off('dt:timer', handleTimer);
      socket.off('dt:card', handleCard);
      socket.off('dt:result', handleResult);
      socket.off('dt:bet:confirmed', handleBetConfirmed);
      socket.off('dt:settlement', handleSettlement);
      socket.off('user:balance', handleBalance);
      socket.off('dt:roadmap', handleRoadmap);
      socket.off('error', handleError);
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
