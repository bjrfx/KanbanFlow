import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { generateToken, authenticateJWT, hashPassword, comparePasswords } from "./jwt-auth";
import { writeServiceWorkerFile } from "./service-worker";
import { setupWebPush, getVapidPublicKey, sendTaskAssignedNotification, sendBoardInviteNotification } from "./webpush";
import { z } from "zod";
import {
  insertUserSchema, 
  insertBoardSchema, 
  insertColumnSchema, 
  insertTaskSchema, 
  insertBoardMemberSchema,
  insertTaskAssigneeSchema
} from "@shared/schema";

declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      username: string;
      [key: string]: any;
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Setup cookie parser
  app.use(cookieParser());
  
  // Auth middleware using JWT
  const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    try {
      const decoded = jwt.verify(token, process.env.SESSION_SECRET || 'your-secret-key') as { 
        id: number; 
        email: string; 
        username: string; 
      };
      
      // Attach user to request
      req.user = decoded;
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  };
  
  // Setup web push
  const webpush = setupWebPush();
  
  // Generate service worker
  writeServiceWorkerFile();
  
  // API routes
  
  // Auth routes with JWT
  app.post('/api/auth/register', async (req, res) => {
    try {
      // Validate request body
      const userSchema = insertUserSchema.extend({
        password: z.string().min(8, 'Password must be at least 8 characters'),
        confirmPassword: z.string()
      }).refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
      });
      
      const validatedData = userSchema.parse(req.body);
      
      // Check if user exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }
      
      // Hash password
      const hashedPassword = await hashPassword(validatedData.password);
      
      // Create user
      const user = await storage.createUser({
        email: validatedData.email,
        username: validatedData.username,
        password: hashedPassword
      });
      
      // Create a default board for new users
      const defaultBoard = await storage.createBoard({
        name: 'My First Board',
        description: 'This is your first Kanban board',
        ownerId: user.id
      });
      
      // Generate JWT token
      const token = generateToken(user);
      
      // Set token in HTTP-only cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      });
      
      return res.status(201).json({ 
        token,
        user: { id: user.id, email: user.email, username: user.username },
        defaultBoardId: defaultBoard.id
      });
    } catch (error: any) {
      if (error.errors) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      return res.status(500).json({ message: 'Error creating user' });
    }
  });
  
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      
      if (!user || !user.password) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Verify password
      const isPasswordValid = await comparePasswords(password, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Generate JWT token
      const token = generateToken(user);
      
      // Set token in HTTP-only cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      });
      
      return res.json({
        token,
        user: { 
          id: user.id, 
          email: user.email, 
          username: user.username,
          avatar: user.avatar
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // We'll implement Google OAuth later with Firebase
  // For now, we'll use JWT-based authentication
  
  // Logout endpoint
  app.post('/api/auth/logout', (req, res) => {
    // Clear the token cookie
    res.clearCookie('token');
    res.status(200).json({ success: true });
  });
  
  // Maintain GET endpoint for backward compatibility
  app.get('/api/auth/logout', (req, res) => {
    // Clear the token cookie
    res.clearCookie('token');
    res.status(200).json({ success: true });
  });
  
  // Get current user
  app.get('/api/auth/user', authenticateJWT, (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    return res.json({ 
      user: { 
        id: req.user.id, 
        email: req.user.email, 
        username: req.user.username
      } 
    });
  });
  
  // Board routes
  app.get('/api/boards', isAuthenticated, async (req, res) => {
    try {
      const boards = await storage.getBoardsForUser(req.user.id);
      res.json(boards);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching boards' });
    }
  });
  
  app.get('/api/boards/:id', isAuthenticated, async (req, res) => {
    try {
      const boardId = parseInt(req.params.id);
      const board = await storage.getBoard(boardId);
      
      if (!board) {
        return res.status(404).json({ message: 'Board not found' });
      }
      
      // Check if user is owner or member
      const isMember = await isBoardMember(boardId, req.user.id);
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to access this board' });
      }
      
      // Get columns for this board
      const columns = await storage.getColumns(boardId);
      
      // Get all tasks for this board
      const tasks = await storage.getTasks(boardId);
      
      // Get board members
      const members = await storage.getBoardMembers(boardId);
      
      res.json({
        board,
        columns,
        tasks,
        members
      });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching board' });
    }
  });
  
  app.post('/api/boards', isAuthenticated, async (req, res) => {
    try {
      const boardData = insertBoardSchema.parse({
        ...req.body,
        ownerId: req.user.id
      });
      
      const board = await storage.createBoard(boardData);
      res.status(201).json(board);
    } catch (error: any) {
      if (error.errors) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Error creating board' });
    }
  });
  
  app.put('/api/boards/:id', isAuthenticated, async (req, res) => {
    try {
      const boardId = parseInt(req.params.id);
      const board = await storage.getBoard(boardId);
      
      if (!board) {
        return res.status(404).json({ message: 'Board not found' });
      }
      
      // Only owner can update board
      if (board.ownerId !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to update this board' });
      }
      
      const boardData = req.body;
      const updatedBoard = await storage.updateBoard(boardId, boardData);
      
      res.json(updatedBoard);
    } catch (error) {
      res.status(500).json({ message: 'Error updating board' });
    }
  });
  
  app.delete('/api/boards/:id', isAuthenticated, async (req, res) => {
    try {
      const boardId = parseInt(req.params.id);
      const board = await storage.getBoard(boardId);
      
      if (!board) {
        return res.status(404).json({ message: 'Board not found' });
      }
      
      // Only owner can delete board
      if (board.ownerId !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to delete this board' });
      }
      
      await storage.deleteBoard(boardId);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting board' });
    }
  });
  
  // Board members routes
  app.post('/api/boards/:id/members', isAuthenticated, async (req, res) => {
    try {
      const boardId = parseInt(req.params.id);
      const board = await storage.getBoard(boardId);
      
      if (!board) {
        return res.status(404).json({ message: 'Board not found' });
      }
      
      // Only owner can add members
      if (board.ownerId !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to add members' });
      }
      
      const { email } = req.body;
      
      // Find user by email
      const userToAdd = await storage.getUserByEmail(email);
      
      if (!userToAdd) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if user is already a member
      const members = await storage.getBoardMembers(boardId);
      const existingMember = members.find(m => m.user.id === userToAdd.id);
      
      if (existingMember) {
        return res.status(400).json({ message: 'User is already a member of this board' });
      }
      
      // Add member
      const boardMemberData = {
        boardId,
        userId: userToAdd.id,
        role: 'member'
      };
      
      const boardMember = await storage.addBoardMember(boardMemberData);
      
      // Create notification for invited user
      await storage.createNotification({
        userId: userToAdd.id,
        message: `You were invited to collaborate on "${board.name}" board`,
        type: 'board-invite',
        relatedId: boardId,
        relatedType: 'board'
      });
      
      // Send push notification if user has subscriptions
      sendBoardInviteNotification(board, req.user.username, userToAdd);
      
      res.status(201).json({
        success: true,
        member: {
          ...boardMember,
          user: {
            id: userToAdd.id,
            username: userToAdd.username,
            email: userToAdd.email,
            avatar: userToAdd.avatar
          }
        }
      });
    } catch (error) {
      res.status(500).json({ message: 'Error adding member' });
    }
  });
  
  app.delete('/api/boards/:boardId/members/:userId', isAuthenticated, async (req, res) => {
    try {
      const boardId = parseInt(req.params.boardId);
      const userIdToRemove = parseInt(req.params.userId);
      
      const board = await storage.getBoard(boardId);
      
      if (!board) {
        return res.status(404).json({ message: 'Board not found' });
      }
      
      // Owner can remove any member, members can only remove themselves
      if (board.ownerId !== req.user.id && userIdToRemove !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to remove this member' });
      }
      
      // Can't remove the owner
      if (userIdToRemove === board.ownerId) {
        return res.status(400).json({ message: 'Cannot remove the board owner' });
      }
      
      await storage.removeBoardMember(boardId, userIdToRemove);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Error removing member' });
    }
  });
  
  // Column routes
  app.post('/api/boards/:boardId/columns', isAuthenticated, async (req, res) => {
    try {
      const boardId = parseInt(req.params.boardId);
      
      // Check if user is board member
      const isMember = await isBoardMember(boardId, req.user.id);
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to add columns to this board' });
      }
      
      const columnData = insertColumnSchema.parse({
        ...req.body,
        boardId
      });
      
      const column = await storage.createColumn(columnData);
      res.status(201).json(column);
    } catch (error: any) {
      if (error.errors) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Error creating column' });
    }
  });
  
  app.put('/api/columns/:id', isAuthenticated, async (req, res) => {
    try {
      const columnId = parseInt(req.params.id);
      const column = await storage.getColumns(req.body.boardId)
        .then(columns => columns.find(c => c.id === columnId));
      
      if (!column) {
        return res.status(404).json({ message: 'Column not found' });
      }
      
      // Check if user is board member
      const isMember = await isBoardMember(column.boardId, req.user.id);
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to update this column' });
      }
      
      const updatedColumn = await storage.updateColumn(columnId, req.body);
      
      res.json(updatedColumn);
    } catch (error) {
      res.status(500).json({ message: 'Error updating column' });
    }
  });
  
  app.delete('/api/columns/:id', isAuthenticated, async (req, res) => {
    try {
      const columnId = parseInt(req.params.id);
      const boardId = parseInt(req.query.boardId as string);
      
      // Check if user is board member
      const isMember = await isBoardMember(boardId, req.user.id);
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to delete columns in this board' });
      }
      
      await storage.deleteColumn(columnId);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting column' });
    }
  });
  
  // Task routes
  app.post('/api/tasks', isAuthenticated, async (req, res) => {
    try {
      const taskData = insertTaskSchema.parse({
        ...req.body,
        createdBy: req.user.id
      });
      
      // Check if user is board member
      const isMember = await isBoardMember(taskData.boardId, req.user.id);
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to add tasks to this board' });
      }
      
      const task = await storage.createTask(taskData);
      res.status(201).json(task);
    } catch (error: any) {
      if (error.errors) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Error creating task' });
    }
  });
  
  app.put('/api/tasks/:id', isAuthenticated, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      // Check if user is board member
      const isMember = await isBoardMember(task.boardId, req.user.id);
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to update this task' });
      }
      
      const updatedTask = await storage.updateTask(taskId, req.body);
      
      res.json(updatedTask);
    } catch (error) {
      res.status(500).json({ message: 'Error updating task' });
    }
  });
  
  app.delete('/api/tasks/:id', isAuthenticated, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      // Check if user is board member
      const isMember = await isBoardMember(task.boardId, req.user.id);
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to delete this task' });
      }
      
      await storage.deleteTask(taskId);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting task' });
    }
  });
  
  // Task assignment routes
  app.post('/api/tasks/:taskId/assignees', isAuthenticated, async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      // Check if user is board member
      const isMember = await isBoardMember(task.boardId, req.user.id);
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to assign users to this task' });
      }
      
      const { userId } = req.body;
      
      // Check if user is a board member
      const boardMembers = await storage.getBoardMembers(task.boardId);
      const isBoardMemberToAssign = boardMembers.some(m => m.user.id === userId);
      
      if (!isBoardMemberToAssign) {
        return res.status(400).json({ message: 'User is not a member of this board' });
      }
      
      // Create assignee
      const assignee = await storage.assignTask({
        taskId,
        userId
      });
      
      // Get user data
      const assignedUser = await storage.getUser(userId);
      
      // Create notification for assigned user
      if (userId !== req.user.id && assignedUser) {
        await storage.createNotification({
          userId,
          message: `You were assigned to the task "${task.title}"`,
          type: 'task-assigned',
          relatedId: taskId,
          relatedType: 'task'
        });
        
        // Send push notification
        sendTaskAssignedNotification(task, req.user.username, assignedUser);
      }
      
      res.status(201).json({
        ...assignee,
        user: assignedUser
      });
    } catch (error) {
      res.status(500).json({ message: 'Error assigning task' });
    }
  });
  
  app.delete('/api/tasks/:taskId/assignees/:userId', isAuthenticated, async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const userIdToUnassign = parseInt(req.params.userId);
      
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      // Check if user is board member
      const isMember = await isBoardMember(task.boardId, req.user.id);
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to unassign users from this task' });
      }
      
      await storage.unassignTask(taskId, userIdToUnassign);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Error unassigning task' });
    }
  });
  
  // Notification routes
  app.get('/api/notifications', isAuthenticated, async (req, res) => {
    try {
      const notifications = await storage.getUserNotifications(req.user.id);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching notifications' });
    }
  });
  
  app.put('/api/notifications/:id/read', isAuthenticated, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      await storage.markNotificationAsRead(notificationId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Error marking notification as read' });
    }
  });
  
  // Web Push routes
  app.get('/api/push/vapid-public-key', isAuthenticated, (req, res) => {
    const vapidPublicKey = getVapidPublicKey();
    res.json({ vapidPublicKey });
  });
  
  app.post('/api/push/subscribe', isAuthenticated, async (req, res) => {
    try {
      const { endpoint, keys } = req.body;
      
      if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
        return res.status(400).json({ message: 'Invalid subscription data' });
      }
      
      await storage.createPushSubscription({
        userId: req.user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth
      });
      
      res.status(201).json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Error saving subscription' });
    }
  });
  
  app.delete('/api/push/unsubscribe', isAuthenticated, async (req, res) => {
    try {
      const { endpoint } = req.body;
      
      if (!endpoint) {
        return res.status(400).json({ message: 'Invalid subscription data' });
      }
      
      await storage.deletePushSubscription(endpoint);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Error removing subscription' });
    }
  });
  
  // Helper function to check if a user is a board member
  async function isBoardMember(boardId: number, userId: number): Promise<boolean> {
    const board = await storage.getBoard(boardId);
    if (board?.ownerId === userId) {
      return true;
    }
    
    const members = await storage.getBoardMembers(boardId);
    return members.some(member => member.user.id === userId);
  }
  
  return httpServer;
}
