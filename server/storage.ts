import {
  users, type User, type InsertUser,
  boards, type Board, type InsertBoard,
  boardMembers, type BoardMember, type InsertBoardMember,
  columns, type Column, type InsertColumn,
  tasks, type Task, type InsertTask,
  taskAssignees, type TaskAssignee, type InsertTaskAssignee,
  notifications, type Notification, type InsertNotification,
  pushSubscriptions, type PushSubscription, type InsertPushSubscription
} from "@shared/schema";

import { eq, and, InferSelectModel, desc } from "drizzle-orm";
import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  
  // Board operations
  getBoard(id: number): Promise<Board | undefined>;
  getBoardsForUser(userId: number): Promise<Board[]>;
  createBoard(board: InsertBoard): Promise<Board>;
  updateBoard(id: number, board: Partial<InsertBoard>): Promise<Board | undefined>;
  deleteBoard(id: number): Promise<boolean>;
  
  // Board members operations
  getBoardMembers(boardId: number): Promise<(BoardMember & { user: User })[]>;
  addBoardMember(boardMember: InsertBoardMember): Promise<BoardMember>;
  removeBoardMember(boardId: number, userId: number): Promise<boolean>;
  
  // Column operations
  getColumns(boardId: number): Promise<Column[]>;
  createColumn(column: InsertColumn): Promise<Column>;
  updateColumn(id: number, column: Partial<InsertColumn>): Promise<Column | undefined>;
  deleteColumn(id: number): Promise<boolean>;
  
  // Task operations
  getTask(id: number): Promise<Task | undefined>;
  getTasks(boardId: number): Promise<Task[]>;
  getTasksByColumn(columnId: number): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;
  
  // Task assignees operations
  getTaskAssignees(taskId: number): Promise<(TaskAssignee & { user: User })[]>;
  assignTask(taskAssignee: InsertTaskAssignee): Promise<TaskAssignee>;
  unassignTask(taskId: number, userId: number): Promise<boolean>;
  
  // Notification operations
  getUserNotifications(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<boolean>;
  
  // Push subscription operations
  createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription>;
  getUserPushSubscriptions(userId: number): Promise<PushSubscription[]>;
  deletePushSubscription(endpoint: string): Promise<boolean>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private usersMap: Map<number, User>;
  private boardsMap: Map<number, Board>;
  private boardMembersMap: Map<string, BoardMember>;
  private columnsMap: Map<number, Column>;
  private tasksMap: Map<number, Task>;
  private taskAssigneesMap: Map<string, TaskAssignee>;
  private notificationsMap: Map<number, Notification>;
  private pushSubscriptionsMap: Map<number, PushSubscription>;
  
  private userId: number;
  private boardId: number;
  private columnId: number;
  private taskId: number;
  private notificationId: number;
  private subscriptionId: number;
  
  constructor() {
    this.usersMap = new Map();
    this.boardsMap = new Map();
    this.boardMembersMap = new Map();
    this.columnsMap = new Map();
    this.tasksMap = new Map();
    this.taskAssigneesMap = new Map();
    this.notificationsMap = new Map();
    this.pushSubscriptionsMap = new Map();
    
    this.userId = 1;
    this.boardId = 1;
    this.columnId = 1;
    this.taskId = 1;
    this.notificationId = 1;
    this.subscriptionId = 1;
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.usersMap.get(id);
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.usersMap.values()).find(user => user.email === email);
  }
  
  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return Array.from(this.usersMap.values()).find(user => user.googleId === googleId);
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const id = this.userId++;
    const createdAt = new Date();
    
    const newUser: User = { ...user, id, createdAt };
    this.usersMap.set(id, newUser);
    return newUser;
  }
  
  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = this.usersMap.get(id);
    if (!existingUser) return undefined;
    
    const updatedUser = { ...existingUser, ...user };
    this.usersMap.set(id, updatedUser);
    return updatedUser;
  }
  
  // Board operations
  async getBoard(id: number): Promise<Board | undefined> {
    return this.boardsMap.get(id);
  }
  
  async getBoardsForUser(userId: number): Promise<Board[]> {
    // Get boards where user is owner or member
    const ownedBoards = Array.from(this.boardsMap.values()).filter(board => board.ownerId === userId);
    
    // Get boards where user is a member
    const memberBoardIds = Array.from(this.boardMembersMap.values())
      .filter(member => member.userId === userId)
      .map(member => member.boardId);
    
    const memberBoards = memberBoardIds.map(boardId => this.boardsMap.get(boardId)!).filter(Boolean);
    
    return [...ownedBoards, ...memberBoards];
  }
  
  async createBoard(board: InsertBoard): Promise<Board> {
    const id = this.boardId++;
    const createdAt = new Date();
    const updatedAt = new Date();
    
    const newBoard: Board = { ...board, id, createdAt, updatedAt };
    this.boardsMap.set(id, newBoard);
    
    // Add owner as a board member automatically
    const boardMemberKey = `${id}-${board.ownerId}`;
    const boardMember: BoardMember = {
      boardId: id,
      userId: board.ownerId,
      role: "owner",
      joinedAt: createdAt
    };
    this.boardMembersMap.set(boardMemberKey, boardMember);
    
    // Create default columns
    const columns = [
      { name: "To Do", boardId: id, order: 0, color: "blue" },
      { name: "In Progress", boardId: id, order: 1, color: "yellow" },
      { name: "Done", boardId: id, order: 2, color: "green" }
    ];
    
    columns.forEach(column => {
      this.createColumn(column);
    });
    
    return newBoard;
  }
  
  async updateBoard(id: number, board: Partial<InsertBoard>): Promise<Board | undefined> {
    const existingBoard = this.boardsMap.get(id);
    if (!existingBoard) return undefined;
    
    const updatedBoard = { 
      ...existingBoard, 
      ...board, 
      updatedAt: new Date() 
    };
    this.boardsMap.set(id, updatedBoard);
    return updatedBoard;
  }
  
  async deleteBoard(id: number): Promise<boolean> {
    if (!this.boardsMap.has(id)) return false;
    
    // Delete all tasks in the board
    const boardTasks = Array.from(this.tasksMap.values()).filter(task => task.boardId === id);
    boardTasks.forEach(task => {
      this.tasksMap.delete(task.id);
      
      // Delete task assignees
      const taskAssigneeKeys = Array.from(this.taskAssigneesMap.keys())
        .filter(key => key.startsWith(`${task.id}-`));
      taskAssigneeKeys.forEach(key => this.taskAssigneesMap.delete(key));
    });
    
    // Delete all columns in the board
    const boardColumns = Array.from(this.columnsMap.values()).filter(column => column.boardId === id);
    boardColumns.forEach(column => this.columnsMap.delete(column.id));
    
    // Delete all board members
    const boardMemberKeys = Array.from(this.boardMembersMap.keys())
      .filter(key => key.startsWith(`${id}-`));
    boardMemberKeys.forEach(key => this.boardMembersMap.delete(key));
    
    // Delete the board
    this.boardsMap.delete(id);
    return true;
  }
  
  // Board members operations
  async getBoardMembers(boardId: number): Promise<(BoardMember & { user: User })[]> {
    const boardMembers = Array.from(this.boardMembersMap.values())
      .filter(member => member.boardId === boardId);
    
    return boardMembers.map(member => {
      const user = this.usersMap.get(member.userId)!;
      return { ...member, user };
    });
  }
  
  async addBoardMember(boardMember: InsertBoardMember): Promise<BoardMember> {
    const key = `${boardMember.boardId}-${boardMember.userId}`;
    const joinedAt = new Date();
    
    const newBoardMember: BoardMember = { ...boardMember, joinedAt };
    this.boardMembersMap.set(key, newBoardMember);
    return newBoardMember;
  }
  
  async removeBoardMember(boardId: number, userId: number): Promise<boolean> {
    const key = `${boardId}-${userId}`;
    return this.boardMembersMap.delete(key);
  }
  
  // Column operations
  async getColumns(boardId: number): Promise<Column[]> {
    const columns = Array.from(this.columnsMap.values())
      .filter(column => column.boardId === boardId)
      .sort((a, b) => a.order - b.order);
    
    return columns;
  }
  
  async createColumn(column: InsertColumn): Promise<Column> {
    const id = this.columnId++;
    
    const newColumn: Column = { ...column, id };
    this.columnsMap.set(id, newColumn);
    return newColumn;
  }
  
  async updateColumn(id: number, column: Partial<InsertColumn>): Promise<Column | undefined> {
    const existingColumn = this.columnsMap.get(id);
    if (!existingColumn) return undefined;
    
    const updatedColumn = { ...existingColumn, ...column };
    this.columnsMap.set(id, updatedColumn);
    return updatedColumn;
  }
  
  async deleteColumn(id: number): Promise<boolean> {
    if (!this.columnsMap.has(id)) return false;
    
    // Delete all tasks in the column
    const columnTasks = Array.from(this.tasksMap.values()).filter(task => task.columnId === id);
    columnTasks.forEach(task => {
      this.tasksMap.delete(task.id);
      
      // Delete task assignees
      const taskAssigneeKeys = Array.from(this.taskAssigneesMap.keys())
        .filter(key => key.startsWith(`${task.id}-`));
      taskAssigneeKeys.forEach(key => this.taskAssigneesMap.delete(key));
    });
    
    // Delete the column
    this.columnsMap.delete(id);
    return true;
  }
  
  // Task operations
  async getTask(id: number): Promise<Task | undefined> {
    return this.tasksMap.get(id);
  }
  
  async getTasks(boardId: number): Promise<Task[]> {
    return Array.from(this.tasksMap.values())
      .filter(task => task.boardId === boardId)
      .sort((a, b) => a.order - b.order);
  }
  
  async getTasksByColumn(columnId: number): Promise<Task[]> {
    return Array.from(this.tasksMap.values())
      .filter(task => task.columnId === columnId)
      .sort((a, b) => a.order - b.order);
  }
  
  async createTask(task: InsertTask): Promise<Task> {
    const id = this.taskId++;
    const createdAt = new Date();
    const updatedAt = new Date();
    
    const newTask: Task = { ...task, id, createdAt, updatedAt };
    this.tasksMap.set(id, newTask);
    return newTask;
  }
  
  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined> {
    const existingTask = this.tasksMap.get(id);
    if (!existingTask) return undefined;
    
    const updatedTask = { 
      ...existingTask, 
      ...task, 
      updatedAt: new Date() 
    };
    this.tasksMap.set(id, updatedTask);
    return updatedTask;
  }
  
  async deleteTask(id: number): Promise<boolean> {
    if (!this.tasksMap.has(id)) return false;
    
    // Delete task assignees
    const taskAssigneeKeys = Array.from(this.taskAssigneesMap.keys())
      .filter(key => key.startsWith(`${id}-`));
    taskAssigneeKeys.forEach(key => this.taskAssigneesMap.delete(key));
    
    // Delete the task
    this.tasksMap.delete(id);
    return true;
  }
  
  // Task assignees operations
  async getTaskAssignees(taskId: number): Promise<(TaskAssignee & { user: User })[]> {
    const assignees = Array.from(this.taskAssigneesMap.values())
      .filter(assignee => assignee.taskId === taskId);
    
    return assignees.map(assignee => {
      const user = this.usersMap.get(assignee.userId)!;
      return { ...assignee, user };
    });
  }
  
  async assignTask(taskAssignee: InsertTaskAssignee): Promise<TaskAssignee> {
    const key = `${taskAssignee.taskId}-${taskAssignee.userId}`;
    const assignedAt = new Date();
    
    const newTaskAssignee: TaskAssignee = { ...taskAssignee, assignedAt };
    this.taskAssigneesMap.set(key, newTaskAssignee);
    return newTaskAssignee;
  }
  
  async unassignTask(taskId: number, userId: number): Promise<boolean> {
    const key = `${taskId}-${userId}`;
    return this.taskAssigneesMap.delete(key);
  }
  
  // Notification operations
  async getUserNotifications(userId: number): Promise<Notification[]> {
    return Array.from(this.notificationsMap.values())
      .filter(notification => notification.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const id = this.notificationId++;
    const createdAt = new Date();
    
    const newNotification: Notification = { 
      ...notification, 
      id, 
      read: false, 
      createdAt 
    };
    this.notificationsMap.set(id, newNotification);
    return newNotification;
  }
  
  async markNotificationAsRead(id: number): Promise<boolean> {
    const notification = this.notificationsMap.get(id);
    if (!notification) return false;
    
    notification.read = true;
    this.notificationsMap.set(id, notification);
    return true;
  }
  
  // Push subscription operations
  async createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription> {
    const id = this.subscriptionId++;
    const createdAt = new Date();
    
    const newSubscription: PushSubscription = { ...subscription, id, createdAt };
    this.pushSubscriptionsMap.set(id, newSubscription);
    return newSubscription;
  }
  
  async getUserPushSubscriptions(userId: number): Promise<PushSubscription[]> {
    return Array.from(this.pushSubscriptionsMap.values())
      .filter(subscription => subscription.userId === userId);
  }
  
  async deletePushSubscription(endpoint: string): Promise<boolean> {
    const subscription = Array.from(this.pushSubscriptionsMap.values())
      .find(sub => sub.endpoint === endpoint);
    
    if (!subscription) return false;
    return this.pushSubscriptionsMap.delete(subscription.id);
  }
}

export class DatabaseStorage implements IStorage {
  private sql;
  private db;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }

    neonConfig.fetchOptions = {
      cache: 'no-store',
    };

    this.sql = neon(process.env.DATABASE_URL);
    this.db = drizzle(this.sql);
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const results = await this.db.select().from(users).where(eq(users.id, id));
    return results[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const results = await this.db.select().from(users).where(eq(users.email, email));
    return results[0];
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const results = await this.db.select().from(users).where(eq(users.googleId, googleId));
    return results[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const results = await this.db.insert(users).values(user).returning();
    return results[0];
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    const results = await this.db.update(users).set(user).where(eq(users.id, id)).returning();
    return results[0];
  }

  // Board operations
  async getBoard(id: number): Promise<Board | undefined> {
    const results = await this.db.select().from(boards).where(eq(boards.id, id));
    return results[0];
  }

  async getBoardsForUser(userId: number): Promise<Board[]> {
    // Get boards where user is owner
    const ownedBoards = await this.db.select().from(boards).where(eq(boards.ownerId, userId));
    
    // Get boards where user is a member
    const memberBoardsIds = await this.db.select().from(boardMembers).where(eq(boardMembers.userId, userId));
    const memberBoardsPromises = memberBoardsIds.map(async (member) => {
      const result = await this.db.select().from(boards).where(eq(boards.id, member.boardId));
      return result[0];
    });
    
    const memberBoards = await Promise.all(memberBoardsPromises);
    return [...ownedBoards, ...memberBoards.filter(Boolean)];
  }

  async createBoard(board: InsertBoard): Promise<Board> {
    const now = new Date();
    const boardWithTimestamps = { ...board, createdAt: now, updatedAt: now };
    
    const newBoard = (await this.db.insert(boards).values(boardWithTimestamps).returning())[0];
    
    // Add owner as board member
    await this.db.insert(boardMembers).values({
      boardId: newBoard.id,
      userId: board.ownerId,
      role: "owner",
      joinedAt: now
    });
    
    // Create default columns
    const defaultColumns = [
      { name: "To Do", boardId: newBoard.id, order: 0, color: "blue" },
      { name: "In Progress", boardId: newBoard.id, order: 1, color: "yellow" },
      { name: "Done", boardId: newBoard.id, order: 2, color: "green" }
    ];
    
    await this.db.insert(columns).values(defaultColumns);
    
    return newBoard;
  }

  async updateBoard(id: number, board: Partial<InsertBoard>): Promise<Board | undefined> {
    const results = await this.db.update(boards)
      .set({ ...board, updatedAt: new Date() })
      .where(eq(boards.id, id))
      .returning();
    return results[0];
  }

  async deleteBoard(id: number): Promise<boolean> {
    // Delete all tasks in the board
    const boardTasks = await this.db.select().from(tasks).where(eq(tasks.boardId, id));
    
    for (const task of boardTasks) {
      // Delete task assignees
      await this.db.delete(taskAssignees).where(eq(taskAssignees.taskId, task.id));
    }
    
    // Delete all tasks
    await this.db.delete(tasks).where(eq(tasks.boardId, id));
    
    // Delete all columns
    await this.db.delete(columns).where(eq(columns.boardId, id));
    
    // Delete all board members
    await this.db.delete(boardMembers).where(eq(boardMembers.boardId, id));
    
    // Delete the board
    const result = await this.db.delete(boards).where(eq(boards.id, id)).returning();
    return result.length > 0;
  }

  // Board members operations
  async getBoardMembers(boardId: number): Promise<(BoardMember & { user: User })[]> {
    const memberships = await this.db.select().from(boardMembers).where(eq(boardMembers.boardId, boardId));
    
    const membersWithUsers = await Promise.all(memberships.map(async (member) => {
      const user = (await this.db.select().from(users).where(eq(users.id, member.userId)))[0];
      return { ...member, user };
    }));
    
    return membersWithUsers;
  }

  async addBoardMember(boardMember: InsertBoardMember): Promise<BoardMember> {
    const results = await this.db.insert(boardMembers)
      .values({ ...boardMember, joinedAt: new Date() })
      .returning();
    return results[0];
  }

  async removeBoardMember(boardId: number, userId: number): Promise<boolean> {
    const result = await this.db.delete(boardMembers)
      .where(and(
        eq(boardMembers.boardId, boardId),
        eq(boardMembers.userId, userId)
      ))
      .returning();
    return result.length > 0;
  }

  // Column operations
  async getColumns(boardId: number): Promise<Column[]> {
    return await this.db.select()
      .from(columns)
      .where(eq(columns.boardId, boardId))
      .orderBy(columns.order);
  }

  async createColumn(column: InsertColumn): Promise<Column> {
    const results = await this.db.insert(columns).values(column).returning();
    return results[0];
  }

  async updateColumn(id: number, column: Partial<InsertColumn>): Promise<Column | undefined> {
    const results = await this.db.update(columns)
      .set(column)
      .where(eq(columns.id, id))
      .returning();
    return results[0];
  }

  async deleteColumn(id: number): Promise<boolean> {
    // Delete all tasks in the column or move them to another column
    await this.db.delete(tasks).where(eq(tasks.columnId, id));
    
    // Delete the column
    const result = await this.db.delete(columns).where(eq(columns.id, id)).returning();
    return result.length > 0;
  }

  // Task operations
  async getTask(id: number): Promise<Task | undefined> {
    const results = await this.db.select().from(tasks).where(eq(tasks.id, id));
    return results[0];
  }

  async getTasks(boardId: number): Promise<Task[]> {
    return await this.db.select()
      .from(tasks)
      .where(eq(tasks.boardId, boardId))
      .orderBy(tasks.order);
  }

  async getTasksByColumn(columnId: number): Promise<Task[]> {
    return await this.db.select()
      .from(tasks)
      .where(eq(tasks.columnId, columnId))
      .orderBy(tasks.order);
  }

  async createTask(task: InsertTask): Promise<Task> {
    const now = new Date();
    const results = await this.db.insert(tasks)
      .values({ ...task, createdAt: now, updatedAt: now })
      .returning();
    return results[0];
  }

  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined> {
    const results = await this.db.update(tasks)
      .set({ ...task, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return results[0];
  }

  async deleteTask(id: number): Promise<boolean> {
    // Delete task assignees
    await this.db.delete(taskAssignees).where(eq(taskAssignees.taskId, id));
    
    // Delete the task
    const result = await this.db.delete(tasks).where(eq(tasks.id, id)).returning();
    return result.length > 0;
  }

  // Task assignees operations
  async getTaskAssignees(taskId: number): Promise<(TaskAssignee & { user: User })[]> {
    const assignees = await this.db.select()
      .from(taskAssignees)
      .where(eq(taskAssignees.taskId, taskId));
    
    const assigneesWithUsers = await Promise.all(assignees.map(async (assignee) => {
      const user = (await this.db.select().from(users).where(eq(users.id, assignee.userId)))[0];
      return { ...assignee, user };
    }));
    
    return assigneesWithUsers;
  }

  async assignTask(taskAssignee: InsertTaskAssignee): Promise<TaskAssignee> {
    const results = await this.db.insert(taskAssignees)
      .values({ ...taskAssignee, assignedAt: new Date() })
      .returning();
    return results[0];
  }

  async unassignTask(taskId: number, userId: number): Promise<boolean> {
    const result = await this.db.delete(taskAssignees)
      .where(and(
        eq(taskAssignees.taskId, taskId),
        eq(taskAssignees.userId, userId)
      ))
      .returning();
    return result.length > 0;
  }

  // Notification operations
  async getUserNotifications(userId: number): Promise<Notification[]> {
    return await this.db.select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const results = await this.db.insert(notifications)
      .values({ ...notification, read: false, createdAt: new Date() })
      .returning();
    return results[0];
  }

  async markNotificationAsRead(id: number): Promise<boolean> {
    const result = await this.db.update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, id))
      .returning();
    return result.length > 0;
  }

  // Push subscription operations
  async createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription> {
    const results = await this.db.insert(pushSubscriptions)
      .values({ ...subscription, createdAt: new Date() })
      .returning();
    return results[0];
  }

  async getUserPushSubscriptions(userId: number): Promise<PushSubscription[]> {
    return await this.db.select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));
  }

  async deletePushSubscription(endpoint: string): Promise<boolean> {
    const result = await this.db.delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint))
      .returning();
    return result.length > 0;
  }
}

// Choose the appropriate storage implementation based on environment
export const storage = process.env.DATABASE_URL 
  ? new DatabaseStorage() 
  : new MemStorage();
