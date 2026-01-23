import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import type { AuthenticatedSocket, TypedServer } from './index.js';
import { getGameState, placeBet, clearBets, getUserBets, getRecentRounds } from '../services/bullBullState.js';

const prisma = new PrismaClient();

// Validation schema for Bull Bull bet placement
const placeBetSchema = z.object({
  bets: z.array(
    z.object({
      type: z.enum(['bb_banker', 'bb_player1', 'bb_player2', 'bb_player3']),
      amount: z.number().positive(),
    })
  ).min(1),
});

export function handleBullBullEvents(io: TypedServer, socket: AuthenticatedSocket): void {
  const userId = socket.user.userId;
  const username = socket.user.username;

  // Handle bet placement
  socket.on('bb:bet:place' as any, async (data: any) => {
    try {
      const validatedData = placeBetSchema.parse(data);
      const { bets } = validatedData;

      console.log(`[BB Socket] ${username} placing bets:`, bets);

      const result = await placeBet(userId, bets);

      if (result.success) {
        socket.emit('bb:bet:confirmed' as any, {
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
          `[BB Socket] ${username} bet confirmed: total=${result.totalBet}, balance=${result.newBalance}`
        );
      } else {
        socket.emit('error', {
          code: result.errorCode || 'UNKNOWN_ERROR',
          message: result.errorMessage || 'Failed to place bet',
        });

        console.log(`[BB Socket] ${username} bet rejected: ${result.errorCode}`);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        socket.emit('error', {
          code: 'INVALID_BET_FORMAT',
          message: 'Invalid bet format: ' + error.errors.map((e) => e.message).join(', '),
        });
      } else {
        console.error(`[BB Socket] Error processing bet for ${username}:`, error);
        socket.emit('error', {
          code: 'BET_ERROR',
          message: 'Failed to process bet',
        });
      }
    }
  });

  // Handle bet clearing
  socket.on('bb:bet:clear' as any, async () => {
    try {
      console.log(`[BB Socket] ${username} clearing bets`);

      const result = await clearBets(userId);

      if (result.success) {
        socket.emit('bb:bet:confirmed' as any, {
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

        console.log(`[BB Socket] ${username} bets cleared, balance=${result.newBalance}`);
      } else {
        socket.emit('error', {
          code: result.errorCode || 'UNKNOWN_ERROR',
          message: result.errorMessage || 'Failed to clear bets',
        });
      }
    } catch (error) {
      console.error(`[BB Socket] Error clearing bets for ${username}:`, error);
      socket.emit('error', {
        code: 'CLEAR_BET_ERROR',
        message: 'Failed to clear bets',
      });
    }
  });

  // Handle state request (for reconnection or initial load)
  socket.on('bb:requestState' as any, async () => {
    try {
      const state = getGameState(userId);
      const recentRounds = await getRecentRounds(100);

      // Fetch user balance
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { balance: true },
      });

      // Send current game state
      socket.emit('bb:state' as any, {
        phase: state.phase,
        roundId: state.roundId,
        roundNumber: state.roundNumber,
        shoeNumber: state.shoeNumber,
        timeRemaining: state.timeRemaining,
        banker: state.banker,
        player1: state.player1,
        player2: state.player2,
        player3: state.player3,
        player1Result: state.player1Result,
        player2Result: state.player2Result,
        player3Result: state.player3Result,
        myBets: state.myBets,
      });

      // Send balance update
      socket.emit('user:balance', {
        balance: Number(user?.balance || 0),
        reason: 'deposit', // Using 'deposit' as a generic initial load reason
      });

      // Send roadmap data
      socket.emit('bb:roadmap' as any, {
        recentRounds,
      });

      console.log(
        `[BB Socket] ${username} requested state: phase=${state.phase}, round=${state.roundNumber}, balance=${user?.balance}`
      );
    } catch (error) {
      console.error(`[BB Socket] Error getting state for ${username}:`, error);
      socket.emit('error', {
        code: 'STATE_ERROR',
        message: 'Failed to get game state',
      });
    }
  });
}
