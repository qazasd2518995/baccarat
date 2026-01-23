import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import type { AuthenticatedSocket, TypedServer } from './index.js';
import { getGameState, placeBet, clearBets, getUserBets, getRecentRounds } from '../services/gameState.js';

const prisma = new PrismaClient();

// Validation schema for bet placement
const placeBetSchema = z.object({
  bets: z.array(
    z.object({
      type: z.enum(['player', 'banker', 'tie', 'player_pair', 'banker_pair', 'super_six', 'player_bonus', 'banker_bonus']),
      amount: z.number().positive(),
    })
  ).min(1),
  isNoCommission: z.boolean().optional(), // 免佣模式
});

export function handleGameEvents(io: TypedServer, socket: AuthenticatedSocket): void {
  const userId = socket.user.userId;
  const username = socket.user.username;

  // Handle bet placement
  socket.on('bet:place', async (data) => {
    try {
      const validatedData = placeBetSchema.parse(data);
      const { bets, isNoCommission = false } = validatedData;

      console.log(`[Socket] ${username} placing bets:`, bets, isNoCommission ? '(免佣)' : '');

      const result = await placeBet(userId, bets, isNoCommission);

      if (result.success) {
        socket.emit('bet:confirmed', {
          roundId: result.roundId || '',
          bets: result.bets || [],
          totalBet: result.totalBet || 0,
        });

        // Update balance
        socket.emit('user:balance', {
          balance: result.newBalance || 0,
          reason: 'bet_placed',
        });

        console.log(
          `[Socket] ${username} bet confirmed: total=${result.totalBet}, balance=${result.newBalance}`
        );
      } else {
        socket.emit('error', {
          code: result.errorCode || 'UNKNOWN_ERROR',
          message: result.errorMessage || 'Failed to place bet',
        });

        console.log(`[Socket] ${username} bet rejected: ${result.errorCode}`);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        socket.emit('error', {
          code: 'INVALID_BET_FORMAT',
          message: 'Invalid bet format: ' + error.errors.map((e) => e.message).join(', '),
        });
      } else {
        console.error(`[Socket] Error processing bet for ${username}:`, error);
        socket.emit('error', {
          code: 'BET_ERROR',
          message: 'Failed to process bet',
        });
      }
    }
  });

  // Handle bet clearing
  socket.on('bet:clear', async () => {
    try {
      console.log(`[Socket] ${username} clearing bets`);

      const result = await clearBets(userId);

      if (result.success) {
        // Emit cleared bets (empty array)
        socket.emit('bet:confirmed', {
          roundId: '',
          bets: [],
          totalBet: 0,
        });

        if (result.newBalance !== undefined) {
          socket.emit('user:balance', {
            balance: result.newBalance,
            reason: 'bet_cleared',
          });
        }

        console.log(`[Socket] ${username} bets cleared, balance=${result.newBalance}`);
      } else {
        socket.emit('error', {
          code: result.errorCode || 'UNKNOWN_ERROR',
          message: result.errorMessage || 'Failed to clear bets',
        });
      }
    } catch (error) {
      console.error(`[Socket] Error clearing bets for ${username}:`, error);
      socket.emit('error', {
        code: 'CLEAR_BET_ERROR',
        message: 'Failed to clear bets',
      });
    }
  });

  // Handle state request (for reconnection or initial load)
  socket.on('game:requestState', async () => {
    try {
      const state = getGameState(userId);
      const recentRounds = await getRecentRounds(100);

      // Fetch user balance
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { balance: true },
      });

      // Send current game state
      socket.emit('game:state', {
        phase: state.phase,
        roundId: state.roundId,
        roundNumber: state.roundNumber,
        shoeNumber: state.shoeNumber,
        timeRemaining: state.timeRemaining,
        cardsRemaining: 416, // Approximate, would need to track actual count
        playerCards: state.playerCards,
        bankerCards: state.bankerCards,
        playerPoints: state.playerPoints,
        bankerPoints: state.bankerPoints,
        result: state.result || undefined,
        playerPair: state.playerPair,
        bankerPair: state.bankerPair,
        myBets: state.myBets,
      });

      // Send balance update
      socket.emit('user:balance', {
        balance: Number(user?.balance || 0),
        reason: 'deposit', // Using 'deposit' as a generic initial load reason
      });

      // Send roadmap data
      socket.emit('game:roadmap', {
        recentRounds,
      });

      console.log(
        `[Socket] ${username} requested state: phase=${state.phase}, round=${state.roundNumber}, balance=${user?.balance}`
      );
    } catch (error) {
      console.error(`[Socket] Error getting state for ${username}:`, error);
      socket.emit('error', {
        code: 'STATE_ERROR',
        message: 'Failed to get game state',
      });
    }
  });
}
