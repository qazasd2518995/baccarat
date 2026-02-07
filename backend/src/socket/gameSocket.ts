import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import type { AuthenticatedSocket, TypedServer } from './index.js';
import {
  getTableGameState,
  placeTableBet,
  clearTableBets,
  getTableRoom,
} from '../services/tableManager.js';


// Validation schema for bet placement
const placeBetSchema = z.object({
  tableId: z.string().optional(), // Optional tableId, defaults to '1'
  bets: z.array(
    z.object({
      type: z.enum(['player', 'banker', 'tie', 'player_pair', 'banker_pair', 'super_six', 'player_bonus', 'banker_bonus']),
      amount: z.number().positive(),
    })
  ).min(1),
  isNoCommission: z.boolean().optional(), // 免佣模式
});

// Helper to get tableId from socket rooms
function getTableIdFromSocket(socket: AuthenticatedSocket): string {
  for (const room of socket.rooms) {
    if (room.startsWith('table:baccarat:')) {
      return room.replace('table:baccarat:', '');
    }
  }
  return '1'; // Default to table 1
}

export function handleGameEvents(io: TypedServer, socket: AuthenticatedSocket): void {
  const userId = socket.user.userId;
  const username = socket.user.username;

  // Handle bet placement
  socket.on('bet:place', async (data) => {
    try {
      const validatedData = placeBetSchema.parse(data);
      const { bets, isNoCommission = false } = validatedData;

      // Get tableId from data or from socket rooms
      const tableId = validatedData.tableId || getTableIdFromSocket(socket);

      console.log(`[Socket] ${username} placing bets on table ${tableId}:`, bets, isNoCommission ? '(免佣)' : '');

      const result = await placeTableBet(tableId, userId, bets, isNoCommission);

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
          `[Socket] ${username} bet confirmed on table ${tableId}: total=${result.totalBet}, balance=${result.newBalance}`
        );
      } else {
        socket.emit('error', {
          code: result.errorCode || 'UNKNOWN_ERROR',
          message: result.errorMessage || 'Failed to place bet',
        });

        console.log(`[Socket] ${username} bet rejected on table ${tableId}: ${result.errorCode}`);
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
      const tableId = getTableIdFromSocket(socket);
      console.log(`[Socket] ${username} clearing bets on table ${tableId}`);

      const result = await clearTableBets(tableId, userId);

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

        console.log(`[Socket] ${username} bets cleared on table ${tableId}, balance=${result.newBalance}`);
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
  socket.on('game:requestState', async (data?: { tableId?: string }) => {
    try {
      // Get tableId from data or from socket rooms
      const tableId = data?.tableId || getTableIdFromSocket(socket);
      const state = getTableGameState(tableId, userId);

      // Fetch user balance
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { balance: true },
      });

      // Fetch recent rounds for this table
      const recentRounds = await prisma.gameRound.findMany({
        where: {
          result: { in: ['player', 'banker', 'tie'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          roundNumber: true,
          result: true,
          playerPair: true,
          bankerPair: true,
          playerPoints: true,
          bankerPoints: true,
          playerCards: true,
          bankerCards: true,
        },
      });

      const formattedRounds = recentRounds.reverse().map(round => ({
        roundNumber: round.roundNumber,
        result: round.result as 'player' | 'banker' | 'tie',
        playerPair: round.playerPair,
        bankerPair: round.bankerPair,
        playerPoints: round.playerPoints,
        bankerPoints: round.bankerPoints,
        totalCards: (round.playerCards as any[])?.length + (round.bankerCards as any[])?.length || 0,
      }));

      // Send current game state
      socket.emit('game:state', {
        phase: state.phase,
        roundId: state.roundId,
        roundNumber: state.roundNumber,
        shoeNumber: state.shoeNumber,
        timeRemaining: state.timeRemaining,
        cardsRemaining: state.cardsRemaining,
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
        reason: 'deposit',
      });

      // Send roadmap data
      socket.emit('game:roadmap', {
        recentRounds: formattedRounds,
      });

      console.log(
        `[Socket] ${username} requested state for table ${tableId}: phase=${state.phase}, timeRemaining=${state.timeRemaining}, round=${state.roundNumber}, balance=${user?.balance}`
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
