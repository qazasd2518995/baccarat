import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';


const loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
});

const bgLaunchSchema = z.object({
  launchToken: z.string().min(20),
});

const bgLaunchPayloadSchema = z.object({
  aud: z.literal('baccarat-launch'),
  userId: z.string().min(1),
  username: z.string().min(1),
  displayName: z.string().nullable().optional(),
  balance: z.string().optional(),
  role: z.literal('member'),
  gameId: z.enum(['baccarat', 'baccarat-nova', 'baccarat-imperial']).default('baccarat'),
  provider: z.string().min(1).max(80).default('Royal Crown Studios'),
  skin: z.enum(['royal', 'nova', 'imperial']).default('royal'),
});

export async function login(req: Request, res: Response) {
  try {
    const { username, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return res.status(401).json({ error: '账户不存在' });
    }

    if (user.status === 'banned') {
      return res.status(403).json({ error: '账户已被封禁' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ error: '账户已被停用' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: '账户状态异常' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      // Log failed login attempt
      const clientIp = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
      await prisma.loginLog.create({
        data: {
          userId: user.id,
          ipAddress: clientIp,
          userAgent: req.headers['user-agent'] || 'unknown',
          success: false
        }
      });
      return res.status(401).json({ error: '密码错误' });
    }

    // Log successful login and update user's last login info
    const clientIp = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
    await Promise.all([
      prisma.loginLog.create({
        data: {
          userId: user.id,
          ipAddress: clientIp,
          userAgent: req.headers['user-agent'] || 'unknown',
          success: true
        }
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginIp: clientIp,
          lastLoginAt: new Date()
        }
      })
    ]);

    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        role: user.role,
        balance: user.balance,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '输入格式不正确', details: error.errors });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
}

export async function me(req: Request, res: Response) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        username: true,
        nickname: true,
        role: true,
        balance: true,
        status: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json(user);
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
}

export async function bgLaunch(req: Request, res: Response) {
  try {
    const { launchToken } = bgLaunchSchema.parse(req.body);
    const bgLaunchSecret = process.env.BG_INTEGRATION_SECRET || process.env.JWT_SECRET;
    if (!bgLaunchSecret) {
      throw new Error('BG_INTEGRATION_SECRET is not configured');
    }
    const decoded = jwt.verify(launchToken, bgLaunchSecret) as unknown;
    const payload = bgLaunchPayloadSchema.parse(decoded);

    const [existingByBgUserId, existingByUsername] = await Promise.all([
      prisma.user.findUnique({
        where: { bgUserId: payload.userId },
        select: { id: true, username: true, bgUserId: true },
      }),
      prisma.user.findUnique({
        where: { username: payload.username },
        select: { id: true, username: true, bgUserId: true },
      }),
    ]);

    if (existingByBgUserId && existingByUsername && existingByBgUserId.id !== existingByUsername.id) {
      console.warn('[BG launch] account mapping conflict', {
        username: payload.username,
        bgUserId: payload.userId,
        existingUserId: existingByUsername.id,
        mappedUserId: existingByBgUserId.id,
      });
      return res.status(409).json({
        code: 'BG_ACCOUNT_MAPPING_CONFLICT',
        error: 'BG 账号映射冲突，请先处理同名旧账号',
      });
    }

    if (existingByUsername?.bgUserId && existingByUsername.bgUserId !== payload.userId) {
      console.warn('[BG launch] account mapping conflict', {
        username: payload.username,
        bgUserId: payload.userId,
        existingUserId: existingByUsername.id,
        existingBgUserId: existingByUsername.bgUserId,
      });
      return res.status(409).json({
        code: 'BG_ACCOUNT_MAPPING_CONFLICT',
        error: 'BG 账号映射冲突，请先处理同名旧账号',
      });
    }

    const userIdToUpdate = existingByBgUserId?.id ?? existingByUsername?.id;
    const user = userIdToUpdate
      ? await prisma.user.update({
          where: { id: userIdToUpdate },
          data: {
            username: payload.username,
            bgUserId: payload.userId,
            nickname: payload.displayName ?? payload.username,
            role: 'member',
            status: 'active',
            balance: payload.balance ? new Prisma.Decimal(payload.balance) : undefined,
          },
        })
      : await prisma.user.create({
          data: {
            id: payload.userId,
            username: payload.username,
            bgUserId: payload.userId,
            passwordHash: '__bg_launch_only__',
            nickname: payload.displayName ?? payload.username,
            role: 'member',
            status: 'active',
            balance: payload.balance ? new Prisma.Decimal(payload.balance) : new Prisma.Decimal(0),
          },
        });

    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        bgUserId: payload.userId,
        gameId: payload.gameId,
        provider: payload.provider,
        skin: payload.skin,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        role: user.role,
        balance: user.balance,
        gameId: payload.gameId,
        provider: payload.provider,
        skin: payload.skin,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'BG 启动凭证格式错误', details: error.errors });
    }
    console.error('BG launch error:', error);
    return res.status(401).json({ error: 'BG 启动凭证无效' });
  }
}

export async function changePassword(req: Request, res: Response) {
  try {
    const schema = z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(6),
    });

    const { currentPassword, newPassword } = schema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({ error: '当前密码错误' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    res.json({ message: '密码修改成功' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '输入格式不正确', details: error.errors });
    }
    console.error('Change password error:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
}
