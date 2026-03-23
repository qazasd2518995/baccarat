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
import winControlRoutes from './routes/winControl.js';
import manualDetectionRoutes from './routes/manualDetection.js';
import seedRoutes from './routes/seed.js';
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
app.use('/api/win-control', winControlRoutes);
app.use('/api/manual-detection', manualDetectionRoutes);
app.use('/api/seed', seedRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize Socket.io handlers
initializeSocket(io);

// Set socket instance for other modules to use
setSocketInstance(io);

// Start the server and all game loops
async function start() {
  // Rebuild materialized paths for agent hierarchy (fast, runs once on startup)
  const { rebuildAllPaths } = await import('./utils/materializedPath.js');
  await rebuildAllPaths().catch(err => console.error('[Start] Failed to rebuild paths:', err));

  // Backfill maxRebatePercent for existing agents (set to parent's rebatePercent, admin = 1.0%)
  const { MAX_REBATE_PERCENT } = await import('./utils/rebateCalculation.js');
  const agentsToFix = await prisma.user.findMany({
    where: { role: 'agent', maxRebatePercent: 0 },
    select: { id: true, parentAgentId: true },
  });
  for (const a of agentsToFix) {
    if (a.parentAgentId) {
      const parent = await prisma.user.findUnique({ where: { id: a.parentAgentId }, select: { rebatePercent: true, role: true } });
      const maxRebate = parent?.role === 'admin' ? MAX_REBATE_PERCENT : Number(parent?.rebatePercent || 0);
      await prisma.user.update({ where: { id: a.id }, data: { maxRebatePercent: maxRebate } });
    } else {
      await prisma.user.update({ where: { id: a.id }, data: { maxRebatePercent: MAX_REBATE_PERCENT } });
    }
  }
  if (agentsToFix.length > 0) console.log(`[Start] Backfilled maxRebatePercent for ${agentsToFix.length} agents`);

  // Start the multi-table baccarat system (each table has independent game loop)
  startMultiTableGameLoop(io);

  // Start the multi-table dragon tiger system (each table has independent game loop)
  startMultiTableDragonTiger(io);

  // Start the multi-table bull bull system (each table has independent game loop)
  // [PAUSED] 暫停牛牛遊戲 — 減少資料庫寫入
  // startMultiTableBullBull(io);

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
