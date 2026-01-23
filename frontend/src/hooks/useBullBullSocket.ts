import { useEffect, useCallback, useRef } from 'react';
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
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    console.log('[BB Socket] Connected:', socket?.id);
    // Join bull bull table
    socket?.emit('join:table', { gameType: 'bullbull' });
    // Request current game state
    socket?.emit('bb:requestState');
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

export function useBullBullSocket() {
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
    pendingBets,
    phase,
  } = useBullBullStore();

  useEffect(() => {
    if (!isAuthenticated || !token) {
      return;
    }

    if (hasConnected.current) {
      return;
    }
    hasConnected.current = true;

    console.log('[useBullBullSocket] Connecting...');
    const socket = connectSocket(token);

    socket.on('connect', () => {
      console.log('[useBullBullSocket] Connected');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('[useBullBullSocket] Disconnected');
      setConnected(false);
    });

    // Game state (for reconnection/initial load)
    socket.on('bb:state', (data: any) => {
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
    });

    // Phase change events
    socket.on('bb:phase', (data: any) => {
      console.log('[useBullBullSocket] Phase changed:', data.phase);
      setPhase(data.phase);
      setTimeRemaining(data.timeRemaining);
      setRoundId(data.roundId);

      if (data.phase === 'betting') {
        resetForNewRound();
        clearRevealed();
      }
    });

    // Timer tick
    socket.on('bb:timer', (data: any) => {
      setTimeRemaining(data.timeRemaining);
    });

    // Card dealing (face down initially)
    socket.on('bb:card', (data: any) => {
      console.log('[useBullBullSocket] Card dealt:', data.target, data.cardIndex);
      // Cards are dealt face down initially, we track positions later
    });

    // Hand reveal
    socket.on('bb:reveal', (data: any) => {
      console.log('[useBullBullSocket] Hand revealed:', data.target, data.rankName);
      revealPosition(data.target);

      const hand = {
        cards: data.cards,
        rank: data.rank,
        rankName: data.rankName,
      };

      if (data.target === 'banker') {
        setBanker(hand);
      } else if (data.target === 'player1') {
        // Result will come with final result event
      } else if (data.target === 'player2') {
        // Result will come with final result event
      } else if (data.target === 'player3') {
        // Result will come with final result event
      }
    });

    // Round result
    socket.on('bb:result', (data: any) => {
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
    });

    // Bet confirmation
    socket.on('bb:bet:confirmed', (data: any) => {
      console.log('[useBullBullSocket] Bet confirmed:', data);
      setConfirmedBets(data.bets);
      if (data.bets.length > 0) {
        saveLastBets();
      }
    });

    // Settlement
    socket.on('bb:settlement', (data: any) => {
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
    });

    // Balance updates
    socket.on('user:balance', (data: any) => {
      console.log('[useBullBullSocket] Balance updated:', data.balance, data.reason);
      setBalance(data.balance);
    });

    // Roadmap updates
    socket.on('bb:roadmap', (data: any) => {
      console.log('[useBullBullSocket] Roadmap updated:', data.recentRounds.length, 'rounds');
      setRoadmapData(data.recentRounds);
    });

    // Error handling
    socket.on('error', (data: any) => {
      console.error('[useBullBullSocket] Error:', data.code, data.message);
    });

    return () => {
      console.log('[useBullBullSocket] Cleanup');
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
