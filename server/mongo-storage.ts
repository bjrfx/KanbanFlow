import {
  User, Board, BoardMember, Column, Task, TaskAssignee, Notification, PushSubscription
} from './mongodb';
import { IStorage } from './storage';
import mongoose from 'mongoose';
import { hashPassword } from './jwt-auth';

// MongoDB implementation of the storage interface
export class MongoDBStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<any | undefined> {
    try {
      // Check if id is valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(id.toString())) {
        return undefined;
      }
      
      const user = await User.findById(id.toString());
      if (!user) return undefined;
      
      const userObj = user.toObject();
      // Ensure id is returned as a number for compatibility
      return {
        ...userObj,
        id: userObj._id
      };
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<any | undefined> {
    try {
      const user = await User.findOne({ email });
      if (!user) return undefined;
      
      const userObj = user.toObject();
      // Ensure id is returned as expected by the interface
      return {
        ...userObj,
        id: userObj._id
      };
    } catch (error) {
      console.error('Error getting user by email:', error);
      return undefined;
    }
  }

  async getUserByGoogleId(googleId: string): Promise<any | undefined> {
    try {
      const user = await User.findOne({ googleId });
      return user ? user.toObject() : undefined;
    } catch (error) {
      console.error('Error getting user by Google ID:', error);
      return undefined;
    }
  }

  async createUser(user: any): Promise<any> {
    try {
      // If user has a password, hash it
      if (user.password) {
        user.password = await hashPassword(user.password);
      }
      
      const newUser = new User(user);
      await newUser.save();
      
      const userObj = newUser.toObject();
      // Ensure id is returned as expected by the interface
      return {
        ...userObj,
        id: userObj._id
      };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: number, userData: Partial<any>): Promise<any | undefined> {
    try {
      // If updating password, hash it first
      if (userData.password) {
        userData.password = await hashPassword(userData.password);
      }
      
      const user = await User.findByIdAndUpdate(id, { $set: userData }, { new: true });
      return user ? user.toObject() : undefined;
    } catch (error) {
      console.error('Error updating user:', error);
      return undefined;
    }
  }

  // Board operations
  async getBoard(id: number): Promise<any | undefined> {
    try {
      // Check if id is valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(id.toString())) {
        return undefined;
      }
      
      const board = await Board.findById(id.toString());
      if (!board) return undefined;
      
      const boardObj = board.toObject();
      // Ensure id is returned as expected by the interface
      return {
        ...boardObj,
        id: boardObj._id
      };
    } catch (error) {
      console.error('Error getting board:', error);
      return undefined;
    }
  }

  async getBoardsForUser(userId: number): Promise<any[]> {
    try {
      // Check if userId is valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(userId.toString())) {
        return [];
      }
      
      // Find boards where user is owner or member
      const ownedBoards = await Board.find({ ownerId: userId.toString() });
      const memberBoardIds = await BoardMember.find({ userId: userId.toString() }).distinct('boardId');
      const memberBoards = await Board.find({ _id: { $in: memberBoardIds } });
      
      // Map the boards and add id property for consistency
      return [...ownedBoards, ...memberBoards].map(board => {
        const boardObj = board.toObject();
        return {
          ...boardObj,
          id: boardObj._id
        };
      });
    } catch (error) {
      console.error('Error getting boards for user:', error);
      return [];
    }
  }

  async createBoard(board: any): Promise<any> {
    try {
      const newBoard = new Board(board);
      await newBoard.save();
      
      // Add owner as a board member with "owner" role
      const boardMember = new BoardMember({
        boardId: newBoard._id,
        userId: board.ownerId,
        role: 'owner'
      });
      await boardMember.save();
      
      const boardObj = newBoard.toObject();
      // Ensure id is returned as expected by the interface
      return {
        ...boardObj,
        id: boardObj._id
      };
    } catch (error) {
      console.error('Error creating board:', error);
      throw error;
    }
  }

  async updateBoard(id: number, boardData: Partial<any>): Promise<any | undefined> {
    try {
      const board = await Board.findByIdAndUpdate(id, 
        { 
          $set: { 
            ...boardData, 
            updatedAt: new Date() 
          } 
        }, 
        { new: true }
      );
      return board ? board.toObject() : undefined;
    } catch (error) {
      console.error('Error updating board:', error);
      return undefined;
    }
  }

  async deleteBoard(id: number): Promise<boolean> {
    try {
      // Delete board and all related data (cascading delete)
      await Board.findByIdAndDelete(id);
      await BoardMember.deleteMany({ boardId: id });
      
      // Get all columns for this board
      const columns = await Column.find({ boardId: id });
      const columnIds = columns.map(column => column._id);
      
      // Delete tasks and task assignees
      await Task.deleteMany({ boardId: id });
      await TaskAssignee.deleteMany({ taskId: { $in: await Task.find({ boardId: id }).distinct('_id') } });
      
      // Delete columns
      await Column.deleteMany({ boardId: id });
      
      return true;
    } catch (error) {
      console.error('Error deleting board:', error);
      return false;
    }
  }

  // Board members operations
  async getBoardMembers(boardId: number): Promise<any[]> {
    try {
      const boardMembers = await BoardMember.find({ boardId }).populate('userId');
      return boardMembers.map(member => ({
        ...member.toObject(),
        user: member.userId
      }));
    } catch (error) {
      console.error('Error getting board members:', error);
      return [];
    }
  }

  async addBoardMember(boardMember: any): Promise<any> {
    try {
      const newBoardMember = new BoardMember(boardMember);
      await newBoardMember.save();
      return newBoardMember.toObject();
    } catch (error) {
      console.error('Error adding board member:', error);
      throw error;
    }
  }

  async removeBoardMember(boardId: number, userId: number): Promise<boolean> {
    try {
      await BoardMember.deleteOne({ boardId, userId });
      return true;
    } catch (error) {
      console.error('Error removing board member:', error);
      return false;
    }
  }

  // Column operations
  async getColumns(boardId: number): Promise<any[]> {
    try {
      const columns = await Column.find({ boardId }).sort('order');
      return columns.map(column => column.toObject());
    } catch (error) {
      console.error('Error getting columns:', error);
      return [];
    }
  }

  async createColumn(column: any): Promise<any> {
    try {
      const newColumn = new Column(column);
      await newColumn.save();
      return newColumn.toObject();
    } catch (error) {
      console.error('Error creating column:', error);
      throw error;
    }
  }

  async updateColumn(id: number, columnData: Partial<any>): Promise<any | undefined> {
    try {
      const column = await Column.findByIdAndUpdate(id, { $set: columnData }, { new: true });
      return column ? column.toObject() : undefined;
    } catch (error) {
      console.error('Error updating column:', error);
      return undefined;
    }
  }

  async deleteColumn(id: number): Promise<boolean> {
    try {
      // Delete column and all tasks in it
      await Column.findByIdAndDelete(id);
      
      // Get all tasks in this column
      const tasks = await Task.find({ columnId: id });
      const taskIds = tasks.map(task => task._id);
      
      // Delete task assignees and tasks
      await TaskAssignee.deleteMany({ taskId: { $in: taskIds } });
      await Task.deleteMany({ columnId: id });
      
      return true;
    } catch (error) {
      console.error('Error deleting column:', error);
      return false;
    }
  }

  // Task operations
  async getTask(id: number): Promise<any | undefined> {
    try {
      const task = await Task.findById(id);
      return task ? task.toObject() : undefined;
    } catch (error) {
      console.error('Error getting task:', error);
      return undefined;
    }
  }

  async getTasks(boardId: number): Promise<any[]> {
    try {
      const tasks = await Task.find({ boardId });
      return tasks.map(task => task.toObject());
    } catch (error) {
      console.error('Error getting tasks:', error);
      return [];
    }
  }

  async getTasksByColumn(columnId: number): Promise<any[]> {
    try {
      const tasks = await Task.find({ columnId }).sort('order');
      return tasks.map(task => task.toObject());
    } catch (error) {
      console.error('Error getting tasks by column:', error);
      return [];
    }
  }

  async createTask(task: any): Promise<any> {
    try {
      const newTask = new Task({
        ...task,
        updatedAt: new Date(),
      });
      await newTask.save();
      return newTask.toObject();
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  async updateTask(id: number, taskData: Partial<any>): Promise<any | undefined> {
    try {
      const task = await Task.findByIdAndUpdate(
        id, 
        { 
          $set: { 
            ...taskData, 
            updatedAt: new Date() 
          } 
        }, 
        { new: true }
      );
      return task ? task.toObject() : undefined;
    } catch (error) {
      console.error('Error updating task:', error);
      return undefined;
    }
  }

  async deleteTask(id: number): Promise<boolean> {
    try {
      await Task.findByIdAndDelete(id);
      await TaskAssignee.deleteMany({ taskId: id });
      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
      return false;
    }
  }

  // Task assignees operations
  async getTaskAssignees(taskId: number): Promise<any[]> {
    try {
      const assignees = await TaskAssignee.find({ taskId }).populate('userId');
      return assignees.map(assignee => ({
        ...assignee.toObject(),
        user: assignee.userId
      }));
    } catch (error) {
      console.error('Error getting task assignees:', error);
      return [];
    }
  }

  async assignTask(taskAssignee: any): Promise<any> {
    try {
      const newTaskAssignee = new TaskAssignee(taskAssignee);
      await newTaskAssignee.save();
      return newTaskAssignee.toObject();
    } catch (error) {
      console.error('Error assigning task:', error);
      throw error;
    }
  }

  async unassignTask(taskId: number, userId: number): Promise<boolean> {
    try {
      await TaskAssignee.deleteOne({ taskId, userId });
      return true;
    } catch (error) {
      console.error('Error unassigning task:', error);
      return false;
    }
  }

  // Notification operations
  async getUserNotifications(userId: number): Promise<any[]> {
    try {
      const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
      return notifications.map(notification => notification.toObject());
    } catch (error) {
      console.error('Error getting user notifications:', error);
      return [];
    }
  }

  async createNotification(notification: any): Promise<any> {
    try {
      const newNotification = new Notification(notification);
      await newNotification.save();
      return newNotification.toObject();
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  async markNotificationAsRead(id: number): Promise<boolean> {
    try {
      await Notification.findByIdAndUpdate(id, { $set: { read: true } });
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  // Push subscription operations
  async createPushSubscription(subscription: any): Promise<any> {
    try {
      const newSubscription = new PushSubscription(subscription);
      await newSubscription.save();
      return newSubscription.toObject();
    } catch (error) {
      console.error('Error creating push subscription:', error);
      throw error;
    }
  }

  async getUserPushSubscriptions(userId: number): Promise<any[]> {
    try {
      const subscriptions = await PushSubscription.find({ userId });
      return subscriptions.map(subscription => subscription.toObject());
    } catch (error) {
      console.error('Error getting user push subscriptions:', error);
      return [];
    }
  }

  async deletePushSubscription(endpoint: string): Promise<boolean> {
    try {
      await PushSubscription.deleteOne({ endpoint });
      return true;
    } catch (error) {
      console.error('Error deleting push subscription:', error);
      return false;
    }
  }
}