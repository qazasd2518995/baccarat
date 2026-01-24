import { useEffect, useCallback } from 'react';
import {
  connectSocket,
  disconnectSocket,
  placeBet as socketPlaceBet,
  clearBets as socketClearBets,
  joinTable as socketJoinTable,
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

export function useGameSocket(tableId?: string) {
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

    console.log('[useGameSocket] Setting up socket connection...');
    const socket = connectSocket(token);

    // Helper function to initialize game state
    const initializeGame = () => {
      console.log('[useGameSocket] Initializing game state...');
      setConnected(true);

      // Join specific baccarat table (defaults to table 1 if not specified)
      const targetTable = tableId || '1';
      socketJoinTable('baccarat', targetTable);
      console.log(`[useGameSocket] Joined baccarat table ${targetTable}`);

      // Request current game state for this table (this also sends balance)
      // Small delay to ensure join is processed first
      setTimeout(() => {
        socket.emit('game:requestState', { tableId: targetTable });
      }, 100);

      // Fetch betting limits
      gameApi.getMyLimits().then((res) => {
        console.log('[useGameSocket] Loaded betting limits:', res.data);
        setBettingLimits(res.data.limits);
      }).catch((err) => {
        console.error('[useGameSocket] Failed to load betting limits:', err);
      });

      // Fetch current balance from API as backup
      gameApi.getGameState().then((res) => {
        console.log('[useGameSocket] Loaded initial balance:', res.data.balance);
        setBalance(res.data.balance);
      }).catch((err) => {
        console.error('[useGameSocket] Failed to load initial balance:', err);
      });
    };

    // Handler functions
    const handleConnect = () => {
      console.log('[useGameSocket] Connected');
      initializeGame();
    };

    const handleDisconnect = () => {
      console.log('[useGameSocket] Disconnected');
      setConnected(false);
    };

    const handleGameState = (data: GameStateEvent) => {
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
    };

    const handlePhaseChange = (data: PhaseChangeEvent) => {
      console.log('[useGameSocket] Phase changed:', data.phase);
      setPhase(data.phase);
      setTimeRemaining(data.timeRemaining);
      setRoundId(data.roundId);

      // Reset state when entering betting phase
      if (data.phase === 'betting') {
        resetForNewRound();
      }
    };

    const handleTimer = (data: TimerEvent) => {
      setTimeRemaining(data.timeRemaining);
    };

    const handleCard = (data: CardDealtEvent) => {
      console.log('[useGameSocket] Card dealt:', data.target, data.cardIndex);
      if (data.target === 'player') {
        addPlayerCard(data.card, data.currentPoints);
      } else {
        addBankerCard(data.card, data.currentPoints);
      }
    };

    const handleResult = (data: RoundResultEvent) => {
      console.log('[useGameSocket] Round result:', data.result);
      setLastResult(data.result);
      setRoundNumber(data.roundNumber);
    };

    const handleBetConfirmed = (data: BetConfirmedEvent) => {
      console.log('[useGameSocket] Bet confirmed:', data);
      setConfirmedBets(data.bets);
      // Save confirmed bets for repeat functionality
      if (data.bets.length > 0) {
        saveLastBets();
      }
    };

    const handleSettlement = (data: BetSettlementEvent) => {
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
      // Also update authStore for cross-page balance sync
      updateUser({ balance: data.newBalance });
    };

    const handleBalance = (data: BalanceUpdateEvent) => {
      console.log('[useGameSocket] Balance updated:', data.balance, data.reason);
      setBalance(data.balance);
      // Also update authStore for cross-page balance sync
      updateUser({ balance: data.balance });
    };

    const handleRoadmap = (data: RoadmapUpdateEvent) => {
      console.log('[useGameSocket] Roadmap updated:', data.recentRounds.length, 'rounds');
      setRoadmapData(data.recentRounds);
    };

    const handleError = (data: ErrorEvent) => {
      console.error('[useGameSocket] Error:', data.code, data.message);
    };

    // Remove any existing listeners first to prevent duplicates
    socket.off('connect', handleConnect);
    socket.off('disconnect', handleDisconnect);
    socket.off('game:state', handleGameState);
    socket.off('game:phase', handlePhaseChange);
    socket.off('game:timer', handleTimer);
    socket.off('game:card', handleCard);
    socket.off('game:result', handleResult);
    socket.off('bet:confirmed', handleBetConfirmed);
    socket.off('bet:settlement', handleSettlement);
    socket.off('user:balance', handleBalance);
    socket.off('game:roadmap', handleRoadmap);
    socket.off('error', handleError);

    // Add listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('game:state', handleGameState);
    socket.on('game:phase', handlePhaseChange);
    socket.on('game:timer', handleTimer);
    socket.on('game:card', handleCard);
    socket.on('game:result', handleResult);
    socket.on('bet:confirmed', handleBetConfirmed);
    socket.on('bet:settlement', handleSettlement);
    socket.on('user:balance', handleBalance);
    socket.on('game:roadmap', handleRoadmap);
    socket.on('error', handleError);

    // If socket is already connected, initialize immediately
    if (socket.connected) {
      console.log('[useGameSocket] Socket already connected, initializing...');
      initializeGame();
    }

    return () => {
      console.log('[useGameSocket] Cleanup - removing listeners');
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('game:state', handleGameState);
      socket.off('game:phase', handlePhaseChange);
      socket.off('game:timer', handleTimer);
      socket.off('game:card', handleCard);
      socket.off('game:result', handleResult);
      socket.off('bet:confirmed', handleBetConfirmed);
      socket.off('bet:settlement', handleSettlement);
      socket.off('user:balance', handleBalance);
      socket.off('game:roadmap', handleRoadmap);
      socket.off('error', handleError);
      disconnectSocket();
      resetAll();
    };
  }, [isAuthenticated, token, tableId]);

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
