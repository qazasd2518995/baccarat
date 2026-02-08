import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import type { AuthenticatedSocket, TypedServer } from './index.js';
import {
  getDTTableGameState,
  placeDTTableBet,
  clearDTTableBets,
  getDTTableRoom,
} from '../services/dragonTigerTableManager.js';


// Validation schema for Dragon Tiger bet placement
const placeBetSchema = z.object({
  tableId: z.string().optional(), // Optional tableId, defaults from socket room
  bets: z.array(
    z.object({
      type: z.enum([
        'dragon', 'tiger', 'dt_tie',
        'dragon_odd', 'dragon_even',    // 龍單/龍雙
        'tiger_odd', 'tiger_even',      // 虎單/虎雙
        'dragon_red', 'dragon_black',   // 龍紅/龍黑
        'tiger_red', 'tiger_black'      // 虎紅/虎黑
      ]),
      amount: z.number().positive(),
    })
  ).min(1),
});

// Helper to get tableId from socket rooms
function getTableIdFromSocket(socket: AuthenticatedSocket): string {
  for (const room of socket.rooms) {
    if (room.startsWith('table:dragontiger:')) {
      return room.replace('table:dragontiger:', '');
    }
  }
  return '1'; // Default to table 1
}

export function handleDragonTigerEvents(io: TypedServer, socket: AuthenticatedSocket): void {
  const userId = socket.user.userId;
  const username = socket.user.username;

  // Handle bet placement
  socket.on('dt:bet:place' as any, async (data: any) => {
    try {
      const validatedData = placeBetSchema.parse(data);
      const { bets } = validatedData;

      // Get tableId from data or from socket rooms
      const tableId = validatedData.tableId || getTableIdFromSocket(socket);

      console.log(`[DT Socket] ${username} placing bets on table ${tableId}:`, bets);

      const result = await placeDTTableBet(tableId, userId, bets);

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
          `[DT Socket] ${username} bet confirmed on table ${tableId}: total=${result.totalBet}, balance=${result.newBalance}`
        );
      } else {
        socket.emit('error', {
          code: result.errorCode || 'UNKNOWN_ERROR',
          message: result.errorMessage || 'Failed to place bet',
        });

        console.log(`[DT Socket] ${username} bet rejected on table ${tableId}: ${result.errorCode}`);
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
      const tableId = getTableIdFromSocket(socket);
      console.log(`[DT Socket] ${username} clearing bets on table ${tableId}`);

      const result = await clearDTTableBets(tableId, userId);

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

        console.log(`[DT Socket] ${username} bets cleared on table ${tableId}, balance=${result.newBalance}`);
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
  socket.on('dt:requestState' as any, async (data?: { tableId?: string }) => {
    try {
      // Get tableId from data or from socket rooms
      const tableId = data?.tableId || getTableIdFromSocket(socket);
      const state = getDTTableGameState(tableId, userId);

      // Fetch user balance and recent rounds in parallel
      const [user, recentRounds] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { balance: true },
        }),
        prisma.dragonTigerRound.findMany({
          where: { tableId },
          orderBy: { createdAt: 'desc' },
          take: 100,
          select: {
            roundNumber: true,
            result: true,
            isSuitedTie: true,
            dragonValue: true,
            tigerValue: true,
          },
        }),
      ]);

      const formattedRounds = recentRounds.reverse().map(round => ({
        roundNumber: round.roundNumber,
        result: round.result,
        isSuitedTie: round.isSuitedTie,
        dragonValue: round.dragonValue,
        tigerValue: round.tigerValue,
      }));

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

      // Send balance update
      socket.emit('user:balance', {
        balance: Number(user?.balance || 0),
        reason: 'deposit',
      });

      // Send roadmap data
      socket.emit('dt:roadmap' as any, {
        recentRounds: formattedRounds,
      });

      console.log(
        `[DT Socket] ${username} requested state for table ${tableId}: phase=${state.phase}, round=${state.roundNumber}, balance=${user?.balance}`
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
