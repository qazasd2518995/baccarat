import { useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useBullBullStore } from '../store/bullBullStore';
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
    console.log('[BB Socket] Connected:', socket?.id);
    // Don't auto-join here - let the hook handle it after joining the correct table
  });

  socket.on('connect_error', (error) => {
    console.error('[BB Socket] Connection error:', error.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('[BB Socket] Disconnected:', reason);
  });

  return socket;
}

function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('[BB Socket] Disconnected manually');
  }
}

export function useBullBullSocket(tableId?: string) {
  const { token, isAuthenticated, updateUser } = useAuthStore();

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
    setBanker,
    setPlayer,
    setLastSettlement,
    setRoadmapData,
    setShoeInfo,
    resetForNewRound,
    resetAll,
    saveLastBets,
    revealPosition,
    clearRevealed,
    addDealingCard,
    pendingBets,
    phase,
  } = useBullBullStore();

  useEffect(() => {
    if (!isAuthenticated || !token) {
      return;
    }

    console.log('[useBullBullSocket] Setting up socket connection...');
    const socket = connectSocket(token);

    // Helper function to initialize game state
    const initializeGame = () => {
      console.log('[useBullBullSocket] Initializing game state...');
      setConnected(true);

      // Join specific bull bull table (defaults to table 1 if not specified)
      const targetTable = tableId || '1';
      socket.emit('join:table', { gameType: 'bullbull', tableId: targetTable });
      console.log(`[useBullBullSocket] Joined bull bull table ${targetTable}`);

      // Request current game state for this table
      socket.emit('bb:requestState', { tableId: targetTable });
    };

    // Handler functions
    const handleConnect = () => {
      console.log('[useBullBullSocket] Connected');
      initializeGame();
    };

    const handleDisconnect = () => {
      console.log('[useBullBullSocket] Disconnected');
      setConnected(false);
    };

    const handleState = (data: any) => {
      console.log('[useBullBullSocket] Received bb:state', data);
      setPhase(data.phase);
      setTimeRemaining(data.timeRemaining);
      setRoundId(data.roundId);
      setRoundNumber(data.roundNumber || 0);
      setShoeInfo(data.shoeNumber || 1, 416);

      if (data.banker) {
        setBanker(data.banker);
      }
      if (data.player1) {
        setPlayer(1, data.player1, data.player1Result);
      }
      if (data.player2) {
        setPlayer(2, data.player2, data.player2Result);
      }
      if (data.player3) {
        setPlayer(3, data.player3, data.player3Result);
      }

      if (data.myBets && data.myBets.length > 0) {
        setConfirmedBets(data.myBets);
      }
    };

    const handlePhase = (data: any) => {
      console.log('[useBullBullSocket] Phase changed:', data.phase);
      setPhase(data.phase);
      setTimeRemaining(data.timeRemaining);
      setRoundId(data.roundId);

      if (data.phase === 'betting') {
        resetForNewRound();
        clearRevealed();
      }
    };

    const handleTimer = (data: any) => {
      setTimeRemaining(data.timeRemaining);
    };

    const handleCard = (data: any) => {
      console.log('[useBullBullSocket] Card dealt:', data.target, data.cardIndex);
      addDealingCard(data.target, data.cardIndex);
    };

    const handleReveal = (data: any) => {
      console.log('[useBullBullSocket] Hand revealed:', data.target, data.rankName);
      revealPosition(data.target);

      const hand = {
        cards: data.cards,
        rank: data.rank,
        rankName: data.rankName,
      };

      if (data.target === 'banker') {
        setBanker(hand);
      }
      // Player results will come with final result event
    };

    const handleResult = (data: any) => {
      console.log('[useBullBullSocket] Round result');
      setRoundNumber(data.roundNumber);

      setBanker({
        cards: data.banker.cards,
        rank: data.banker.rank,
        rankName: data.banker.rankName,
      });

      setPlayer(1, {
        cards: data.player1.cards,
        rank: data.player1.rank,
        rankName: data.player1.rankName,
      }, data.player1.result);

      setPlayer(2, {
        cards: data.player2.cards,
        rank: data.player2.rank,
        rankName: data.player2.rankName,
      }, data.player2.result);

      setPlayer(3, {
        cards: data.player3.cards,
        rank: data.player3.rank,
        rankName: data.player3.rankName,
      }, data.player3.result);
    };

    const handleBetConfirmed = (data: any) => {
      console.log('[useBullBullSocket] Bet confirmed:', data);
      setConfirmedBets(data.bets);
      if (data.bets.length > 0) {
        saveLastBets();
      }
    };

    const handleSettlement = (data: any) => {
      console.log('[useBullBullSocket] Settlement:', data);
      setLastSettlement({
        bets: data.bets.map((b: any) => ({
          type: b.type,
          amount: b.amount,
          won: b.won,
          payout: b.payout,
          multiplier: b.multiplier,
        })),
        totalPayout: data.totalPayout,
        netResult: data.netResult,
      });
      setBalance(data.newBalance);
      // Also update authStore for cross-page balance sync
      updateUser({ balance: data.newBalance });
    };

    const handleBalance = (data: any) => {
      console.log('[useBullBullSocket] Balance updated:', data.balance, data.reason);
      setBalance(data.balance);
      // Also update authStore for cross-page balance sync
      updateUser({ balance: data.balance });
    };

    const handleRoadmap = (data: any) => {
      console.log('[useBullBullSocket] Roadmap updated:', data.recentRounds.length, 'rounds');
      setRoadmapData(data.recentRounds);
    };

    const handleError = (data: any) => {
      console.error('[useBullBullSocket] Error:', data.code, data.message);
    };

    // Remove any existing listeners first to prevent duplicates
    socket.off('connect', handleConnect);
    socket.off('disconnect', handleDisconnect);
    socket.off('bb:state', handleState);
    socket.off('bb:phase', handlePhase);
    socket.off('bb:timer', handleTimer);
    socket.off('bb:card', handleCard);
    socket.off('bb:reveal', handleReveal);
    socket.off('bb:result', handleResult);
    socket.off('bb:bet:confirmed', handleBetConfirmed);
    socket.off('bb:settlement', handleSettlement);
    socket.off('user:balance', handleBalance);
    socket.off('bb:roadmap', handleRoadmap);
    socket.off('error', handleError);

    // Add listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('bb:state', handleState);
    socket.on('bb:phase', handlePhase);
    socket.on('bb:timer', handleTimer);
    socket.on('bb:card', handleCard);
    socket.on('bb:reveal', handleReveal);
    socket.on('bb:result', handleResult);
    socket.on('bb:bet:confirmed', handleBetConfirmed);
    socket.on('bb:settlement', handleSettlement);
    socket.on('user:balance', handleBalance);
    socket.on('bb:roadmap', handleRoadmap);
    socket.on('error', handleError);

    // If socket is already connected, initialize immediately
    if (socket.connected) {
      console.log('[useBullBullSocket] Socket already connected, initializing...');
      initializeGame();
    }

    return () => {
      console.log('[useBullBullSocket] Cleanup - removing listeners');
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('bb:state', handleState);
      socket.off('bb:phase', handlePhase);
      socket.off('bb:timer', handleTimer);
      socket.off('bb:card', handleCard);
      socket.off('bb:reveal', handleReveal);
      socket.off('bb:result', handleResult);
      socket.off('bb:bet:confirmed', handleBetConfirmed);
      socket.off('bb:settlement', handleSettlement);
      socket.off('user:balance', handleBalance);
      socket.off('bb:roadmap', handleRoadmap);
      socket.off('error', handleError);
      disconnectSocket();
      resetAll();
    };
  }, [isAuthenticated, token, tableId]);

  // Submit pending bets to server
  const submitBets = useCallback(() => {
    if (pendingBets.length === 0) {
      return;
    }

    if (phase !== 'betting') {
      console.warn('[useBullBullSocket] Cannot submit bets: not in betting phase');
      return;
    }

    const s = getSocket();
    if (!s?.connected) {
      console.error('[useBullBullSocket] Cannot submit bets: not connected');
      return;
    }

    console.log('[useBullBullSocket] Submitting bets:', pendingBets);
    s.emit('bb:bet:place', { bets: pendingBets });
  }, [pendingBets, phase]);

  // Cancel all bets
  const cancelBets = useCallback(() => {
    if (phase !== 'betting') {
      console.warn('[useBullBullSocket] Cannot cancel bets: not in betting phase');
      return;
    }

    const s = getSocket();
    if (!s?.connected) {
      console.error('[useBullBullSocket] Cannot cancel bets: not connected');
      return;
    }

    console.log('[useBullBullSocket] Canceling bets');
    s.emit('bb:bet:clear');
    clearPendingBets();
    clearConfirmedBets();
  }, [phase, clearPendingBets, clearConfirmedBets]);

  return {
    submitBets,
    cancelBets,
  };
}
