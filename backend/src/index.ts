import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import gameRoutes from './routes/game.js';
import transactionRoutes from './routes/transactions.js';
import reportRoutes from './routes/reports.js';
import noticeRoutes from './routes/notices.js';
import operationLogRoutes from './routes/operationLogs.js';
import bettingLimitRoutes from './routes/bettingLimits.js';
import gameControlRoutes from './routes/gameControl.js';
import leaderboardRoutes from './routes/leaderboard.js';
import chatRoutes from './routes/chat.js';
import tablesRoutes from './routes/tables.js';
import giftsRoutes from './routes/gifts.js';
import dealersRoutes from './routes/dealers.js';
import agentManagementRoutes from './routes/agentManagement.js';
import agentReportRoutes from './routes/agentReport.js';
import logsRoutes from './routes/logs.js';
import { initializeSocket } from './socket/index.js';
import { setSocketInstance } from './socket/socketManager.js';
import { startMultiTableGameLoop } from './services/multiTableGameLoop.js';
import { startMultiTableDragonTiger } from './services/multiTableDragonTiger.js';
import { startMultiTableBullBull } from './services/multiTableBullBull.js';
import type { ServerToClientEvents, ClientToServerEvents } from './socket/types.js';
import { prisma } from './lib/prisma.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// CORS origins
const corsOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://localhost:5174'];

// Initialize Socket.io with CORS
const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: corsOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/operation-logs', operationLogRoutes);
app.use('/api/betting-limits', bettingLimitRoutes);
app.use('/api/game-control', gameControlRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/tables', tablesRoutes);
app.use('/api/gifts', giftsRoutes);
app.use('/api/dealers', dealersRoutes);
app.use('/api/agent-management', agentManagementRoutes);
app.use('/api/agent-report', agentReportRoutes);
app.use('/api/logs', logsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize Socket.io handlers
initializeSocket(io);

// Set socket instance for other modules to use
setSocketInstance(io);

// Clean up old DB records to prevent disk space exhaustion
async function cleanupOldRecords() {
  const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
  console.log(`[Cleanup] Deleting records older than ${cutoff.toISOString()}...`);
  try {
    // Delete bets first (FK references rounds)
    const bets = await prisma.bet.deleteMany({ where: { createdAt: { lt: cutoff } } });
    const rounds = await prisma.gameRound.deleteMany({ where: { createdAt: { lt: cutoff } } });
    const dtRounds = await prisma.dragonTigerRound.deleteMany({ where: { createdAt: { lt: cutoff } } });
    const bbRounds = await prisma.bullBullRound.deleteMany({ where: { createdAt: { lt: cutoff } } });
    const txns = await prisma.transaction.deleteMany({ where: { createdAt: { lt: cutoff } } });
    const chats = await prisma.chatMessage.deleteMany({ where: { createdAt: { lt: cutoff } } });
    const logs = await prisma.operationLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
    console.log(`[Cleanup] Deleted: ${bets.count} bets, ${rounds.count} rounds, ${dtRounds.count} DT rounds, ${bbRounds.count} BB rounds, ${txns.count} transactions, ${chats.count} chats, ${logs.count} logs`);
  } catch (error) {
    console.error('[Cleanup] Failed:', error);
  }
}

// Start the server and all game loops
async function start() {
  // Clean up old records before starting game loops
  await cleanupOldRecords();
  // Start the multi-table baccarat system (each table has independent game loop)
  startMultiTableGameLoop(io);

  // Start the multi-table dragon tiger system (each table has independent game loop)
  startMultiTableDragonTiger(io);

  // Start the multi-table bull bull system (each table has independent game loop)
  startMultiTableBullBull(io);

  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`WebSocket server ready`);
    console.log('Game loops started: Baccarat (multi-table), Dragon Tiger (multi-table), Bull Bull (multi-table)');
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
