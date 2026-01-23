import { z } from 'zod';
import type { AuthenticatedSocket, TypedServer } from './index.js';
import { getGameState, placeBet, clearBets, getUserBets, getRecentRounds } from '../services/dragonTigerState.js';

// Validation schema for Dragon Tiger bet placement
const placeBetSchema = z.object({
  bets: z.array(
    z.object({
      type: z.enum([
        'dragon', 'tiger', 'dt_tie', 'dt_suited_tie',
        'dragon_big', 'dragon_small', 'tiger_big', 'tiger_small'
      ]),
      amount: z.number().positive(),
    })
  ).min(1),
});

export function handleDragonTigerEvents(io: TypedServer, socket: AuthenticatedSocket): void {
  const userId = socket.user.userId;
  const username = socket.user.username;

  // Handle bet placement
  socket.on('dt:bet:place' as any, async (data: any) => {
    try {
      const validatedData = placeBetSchema.parse(data);
      const { bets } = validatedData;

      console.log(`[DT Socket] ${username} placing bets:`, bets);

      const result = await placeBet(userId, bets);

      if (result.success) {
        socket.emit('dt:bet:confirmed' as any, {
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
          `[DT Socket] ${username} bet confirmed: total=${result.totalBet}, balance=${result.newBalance}`
        );
      } else {
        socket.emit('error', {
          code: result.errorCode || 'UNKNOWN_ERROR',
          message: result.errorMessage || 'Failed to place bet',
        });

        console.log(`[DT Socket] ${username} bet rejected: ${result.errorCode}`);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        socket.emit('error', {
          code: 'INVALID_BET_FORMAT',
          message: 'Invalid bet format: ' + error.errors.map((e) => e.message).join(', '),
        });
      } else {
        console.error(`[DT Socket] Error processing bet for ${username}:`, error);
        socket.emit('error', {
          code: 'BET_ERROR',
          message: 'Failed to process bet',
        });
      }
    }
  });

  // Handle bet clearing
  socket.on('dt:bet:clear' as any, async () => {
    try {
      console.log(`[DT Socket] ${username} clearing bets`);

      const result = await clearBets(userId);

      if (result.success) {
        socket.emit('dt:bet:confirmed' as any, {
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

        console.log(`[DT Socket] ${username} bets cleared, balance=${result.newBalance}`);
      } else {
        socket.emit('error', {
          code: result.errorCode || 'UNKNOWN_ERROR',
          message: result.errorMessage || 'Failed to clear bets',
        });
      }
    } catch (error) {
      console.error(`[DT Socket] Error clearing bets for ${username}:`, error);
      socket.emit('error', {
        code: 'CLEAR_BET_ERROR',
        message: 'Failed to clear bets',
      });
    }
  });

  // Handle state request (for reconnection or initial load)
  socket.on('dt:requestState' as any, async () => {
    try {
      const state = getGameState(userId);
      const recentRounds = await getRecentRounds(100);

      // Send current game state
      socket.emit('dt:state' as any, {
        phase: state.phase,
        roundId: state.roundId,
        roundNumber: state.roundNumber,
        shoeNumber: state.shoeNumber,
        timeRemaining: state.timeRemaining,
        dragonCard: state.dragonCard,
        tigerCard: state.tigerCard,
        dragonValue: state.dragonValue,
        tigerValue: state.tigerValue,
        result: state.result || undefined,
        isSuitedTie: state.isSuitedTie,
        myBets: state.myBets,
      });

      // Send roadmap data
      socket.emit('dt:roadmap' as any, {
        recentRounds,
      });

      console.log(
        `[DT Socket] ${username} requested state: phase=${state.phase}, round=${state.roundNumber}`
      );
    } catch (error) {
      console.error(`[DT Socket] Error getting state for ${username}:`, error);
      socket.emit('error', {
        code: 'STATE_ERROR',
        message: 'Failed to get game state',
      });
    }
  });
}
