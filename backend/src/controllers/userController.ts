import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { canManageUser } from '../middleware/auth.js';


const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
  nickname: z.string().optional(),
  role: z.enum(['agent', 'member']),
});

const updateUserSchema = z.object({
  nickname: z.string().optional(),
  status: z.enum(['active', 'suspended', 'banned']).optional(),
});

// Get all users (admin sees all, agent sees their sub-users)
export async function getUsers(req: Request, res: Response) {
  try {
    const { role, status, search, page = '1', limit = '20' } = req.query;
    const currentUser = req.user!;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    // Role-based filtering
    if (currentUser.role === 'agent') {
      where.parentAgentId = currentUser.userId;
    }

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { username: { contains: search as string, mode: 'insensitive' } },
        { nickname: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          nickname: true,
          role: true,
          balance: true,
          status: true,
          createdAt: true,
          parentAgent: {
            select: { id: true, username: true, nickname: true },
          },
          _count: {
            select: { subUsers: true },
          },
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get single user
export async function getUser(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const currentUser = req.user!;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        nickname: true,
        role: true,
        balance: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        parentAgent: {
          select: { id: true, username: true, nickname: true },
        },
        _count: {
          select: { subUsers: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check permission
    if (currentUser.role !== 'admin') {
      const canManage = await canManageUser(currentUser.userId, id);
      if (!canManage && currentUser.userId !== id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Create user
export async function createUser(req: Request, res: Response) {
  try {
    const data = createUserSchema.parse(req.body);
    const currentUser = req.user!;

    // Check permission
    if (currentUser.role === 'member') {
      return res.status(403).json({ error: 'Members cannot create users' });
    }

    // Agents can only create members
    if (currentUser.role === 'agent' && data.role !== 'member') {
      return res.status(403).json({ error: 'Agents can only create members' });
    }

    // Check if username exists
    const existingUser = await prisma.user.findUnique({
      where: { username: data.username },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        username: data.username,
        passwordHash,
        nickname: data.nickname,
        role: data.role as UserRole,
        parentAgentId: currentUser.role === 'agent' ? currentUser.userId : null,
      },
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

    res.status(201).json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Update user
export async function updateUser(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const data = updateUserSchema.parse(req.body);
    const currentUser = req.user!;

    // Check permission
    const canManage = await canManageUser(currentUser.userId, id);
    if (!canManage) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        nickname: true,
        role: true,
        balance: true,
        status: true,
        updatedAt: true,
      },
    });

    res.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Reset user password
export async function resetPassword(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const { newPassword } = z.object({ newPassword: z.string().min(6) }).parse(req.body);
    const currentUser = req.user!;

    // Check permission
    const canManage = await canManageUser(currentUser.userId, id);
    if (!canManage) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get user's sub-users (for agents)
export async function getSubUsers(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const currentUser = req.user!;

    // Only admin or the user themselves can see sub-users
    if (currentUser.role !== 'admin' && currentUser.userId !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const subUsers = await prisma.user.findMany({
      where: { parentAgentId: id },
      select: {
        id: true,
        username: true,
        nickname: true,
        role: true,
        balance: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(subUsers);
  } catch (error) {
    console.error('Get sub-users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
