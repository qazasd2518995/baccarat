import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';


const loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
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
