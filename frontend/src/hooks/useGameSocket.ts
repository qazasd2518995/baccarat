import { useEffect, useCallback, useRef } from 'react';
import {
  connectSocket,
  disconnectSocket,
  placeBet as socketPlaceBet,
  clearBets as socketClearBets,
  type GameStateEvent,
  type PhaseChangeEvent,
  type TimerEvent,
  type CardDealtEvent,
  type RoundResultEvent,
  type BetConfirmedEvent,
  type BetSettlementEvent,
  type BalanceUpdateEvent,
  type RoadmapUpdateEvent,
  type ErrorEvent,
} from '../services/socket';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import { gameApi } from '../services/api';

export function useGameSocket() {
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
    addPlayerCard,
    addBankerCard,
    setCards,
    setLastResult,
    setLastSettlement,
    setRoadmapData,
    setShoeInfo,
    resetForNewRound,
    resetAll,
    saveLastBets,
    setBettingLimits,
    pendingBets,
    phase,
  } = useGameStore();

  useEffect(() => {
    if (!isAuthenticated || !token) {
      return;
    }

    // Prevent double connection in React Strict Mode
    if (hasConnected.current) {
      return;
    }
    hasConnected.current = true;

    console.log('[useGameSocket] Connecting...');
    const socket = connectSocket(token);

    // Connection events
    socket.on('connect', () => {
      console.log('[useGameSocket] Connected');
      setConnected(true);

      // Fetch betting limits on connection
      gameApi.getMyLimits().then((res) => {
        console.log('[useGameSocket] Loaded betting limits:', res.data);
        setBettingLimits(res.data.limits);
      }).catch((err) => {
        console.error('[useGameSocket] Failed to load betting limits:', err);
      });
    });

    socket.on('disconnect', () => {
      console.log('[useGameSocket] Disconnected');
      setConnected(false);
    });

    // Game state (for reconnection/initial load)
    socket.on('game:state', (data: GameStateEvent) => {
      console.log('[useGameSocket] Received game:state', data);
      setPhase(data.phase);
      setTimeRemaining(data.timeRemaining);
      setRoundId(data.roundId);
      setRoundNumber(data.roundNumber || 0);
      setShoeInfo(data.shoeNumber || 1, data.cardsRemaining || 416);

      if (data.playerCards && data.bankerCards) {
        setCards(
          data.playerCards,
          data.bankerCards,
          data.playerPoints || 0,
          data.bankerPoints || 0
        );
      }

      if (data.result) {
        setLastResult(data.result);
      }

      if (data.myBets && data.myBets.length > 0) {
        setConfirmedBets(data.myBets);
      }
    });

    // Phase change events
    socket.on('game:phase', (data: PhaseChangeEvent) => {
      console.log('[useGameSocket] Phase changed:', data.phase);
      setPhase(data.phase);
      setTimeRemaining(data.timeRemaining);
      setRoundId(data.roundId);

      // Reset state when entering betting phase
      if (data.phase === 'betting') {
        resetForNewRound();
      }
    });

    // Timer tick
    socket.on('game:timer', (data: TimerEvent) => {
      setTimeRemaining(data.timeRemaining);
    });

    // Card dealing
    socket.on('game:card', (data: CardDealtEvent) => {
      console.log('[useGameSocket] Card dealt:', data.target, data.cardIndex);
      if (data.target === 'player') {
        addPlayerCard(data.card, data.currentPoints);
      } else {
        addBankerCard(data.card, data.currentPoints);
      }
    });

    // Round result
    socket.on('game:result', (data: RoundResultEvent) => {
      console.log('[useGameSocket] Round result:', data.result);
      setLastResult(data.result);
      setRoundNumber(data.roundNumber);
    });

    // Bet confirmation
    socket.on('bet:confirmed', (data: BetConfirmedEvent) => {
      console.log('[useGameSocket] Bet confirmed:', data);
      setConfirmedBets(data.bets);
      // Save confirmed bets for repeat functionality
      if (data.bets.length > 0) {
        saveLastBets();
      }
    });

    // Settlement
    socket.on('bet:settlement', (data: BetSettlementEvent) => {
      console.log('[useGameSocket] Settlement:', data);
      setLastSettlement({
        bets: data.bets.map((b) => ({
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
    socket.on('user:balance', (data: BalanceUpdateEvent) => {
      console.log('[useGameSocket] Balance updated:', data.balance, data.reason);
      setBalance(data.balance);
    });

    // Roadmap updates
    socket.on('game:roadmap', (data: RoadmapUpdateEvent) => {
      console.log('[useGameSocket] Roadmap updated:', data.recentRounds.length, 'rounds');
      setRoadmapData(data.recentRounds);
    });

    // Error handling
    socket.on('error', (data: ErrorEvent) => {
      console.error('[useGameSocket] Error:', data.code, data.message);
      // Could show toast notification here
    });

    return () => {
      console.log('[useGameSocket] Cleanup');
      hasConnected.current = false;
      disconnectSocket();
      resetAll();
    };
  }, [isAuthenticated, token]);

  // Submit pending bets to server
  const submitBets = useCallback((isNoCommission: boolean = false) => {
    if (pendingBets.length === 0) {
      return;
    }

    if (phase !== 'betting') {
      console.warn('[useGameSocket] Cannot submit bets: not in betting phase');
      return;
    }

    console.log('[useGameSocket] Submitting bets:', pendingBets, isNoCommission ? '(免佣)' : '');
    socketPlaceBet(pendingBets, isNoCommission);
  }, [pendingBets, phase]);

  // Cancel all bets (pending and confirmed)
  const cancelBets = useCallback(() => {
    if (phase !== 'betting') {
      console.warn('[useGameSocket] Cannot cancel bets: not in betting phase');
      return;
    }

    console.log('[useGameSocket] Canceling bets');
    socketClearBets();
    clearPendingBets();
    clearConfirmedBets();
  }, [phase, clearPendingBets, clearConfirmedBets]);

  return {
    submitBets,
    cancelBets,
  };
}
