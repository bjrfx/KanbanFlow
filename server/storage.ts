// Import types for documentation purposes
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

// Import MongoDB storage implementation
import { MongoDBStorage } from './mongo-storage';
import { connectToDatabase } from './mongodb';

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

// Connect to MongoDB
connectToDatabase().catch(console.error);

// Use MongoDB storage implementation
export const storage = new MongoDBStorage();