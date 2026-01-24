import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import type { AuthenticatedSocket, TypedServer } from './index.js';
import {
  getBBTableGameState,
  placeBBTableBet,
  clearBBTableBets,
  getBBTableRoom,
} from '../services/bullBullTableManager.js';

const prisma = new PrismaClient();

// Validation schema for Bull Bull bet placement
const placeBetSchema = z.object({
  tableId: z.string().optional(), // Optional tableId, defaults from socket room
  bets: z.array(
    z.object({
      type: z.enum(['bb_banker', 'bb_player1', 'bb_player2', 'bb_player3']),
      amount: z.number().positive(),
    })
  ).min(1),
});

// Helper to get tableId from socket rooms
function getTableIdFromSocket(socket: AuthenticatedSocket): string {
  for (const room of socket.rooms) {
    if (room.startsWith('table:bullbull:')) {
      return room.replace('table:bullbull:', '');
    }
  }
  return '1'; // Default to table 1
}

export function handleBullBullEvents(io: TypedServer, socket: AuthenticatedSocket): void {
  const userId = socket.user.userId;
  const username = socket.user.username;

  // Handle bet placement
  socket.on('bb:bet:place' as any, async (data: any) => {
    try {
      const validatedData = placeBetSchema.parse(data);
      const { bets } = validatedData;

      // Get tableId from data or from socket rooms
      const tableId = validatedData.tableId || getTableIdFromSocket(socket);

      console.log(`[BB Socket] ${username} placing bets on table ${tableId}:`, bets);

      const result = await placeBBTableBet(tableId, userId, bets);

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
          `[BB Socket] ${username} bet confirmed on table ${tableId}: total=${result.totalBet}, balance=${result.newBalance}`
        );
      } else {
        socket.emit('error', {
          code: result.errorCode || 'UNKNOWN_ERROR',
          message: result.errorMessage || 'Failed to place bet',
        });

        console.log(`[BB Socket] ${username} bet rejected on table ${tableId}: ${result.errorCode}`);
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
      const tableId = getTableIdFromSocket(socket);
      console.log(`[BB Socket] ${username} clearing bets on table ${tableId}`);

      const result = await clearBBTableBets(tableId, userId);

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

        console.log(`[BB Socket] ${username} bets cleared on table ${tableId}, balance=${result.newBalance}`);
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
  socket.on('bb:requestState' as any, async (data?: { tableId?: string }) => {
    try {
      // Get tableId from data or from socket rooms
      const tableId = data?.tableId || getTableIdFromSocket(socket);
      const state = getBBTableGameState(tableId, userId);

      // Fetch user balance
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { balance: true },
      });

      // Fetch recent rounds for roadmap
      const recentRounds = await prisma.bullBullRound.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          roundNumber: true,
          bankerRank: true,
          player1Rank: true,
          player2Rank: true,
          player3Rank: true,
          player1Result: true,
          player2Result: true,
          player3Result: true,
        },
      });

      const formattedRounds = recentRounds.reverse().map(round => ({
        roundNumber: round.roundNumber,
        bankerRank: round.bankerRank,
        player1Rank: round.player1Rank,
        player2Rank: round.player2Rank,
        player3Rank: round.player3Rank,
        player1Result: round.player1Result,
        player2Result: round.player2Result,
        player3Result: round.player3Result,
      }));

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
        reason: 'deposit',
      });

      // Send roadmap data
      socket.emit('bb:roadmap' as any, {
        recentRounds: formattedRounds,
      });

      console.log(
        `[BB Socket] ${username} requested state for table ${tableId}: phase=${state.phase}, round=${state.roundNumber}, balance=${user?.balance}`
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
