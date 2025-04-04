import mongoose from 'mongoose';

// MongoDB connection string - use the one you provided
const MONGODB_URI = 'mongodb+srv://kiranbjrfx1:0E8ene341oSC59We@kanban-cluster.3kg55wz.mongodb.net/?retryWrites=true&w=majority&appName=Kanban-cluster';

// Connect to MongoDB
export async function connectToDatabase() {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('Already connected to MongoDB');
      return;
    }
    
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

// Define User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  password: { type: String, required: true },
  googleId: { type: String, sparse: true, unique: true },
  avatar: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Define Board Schema
const boardSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Define BoardMember Schema
const boardMemberSchema = new mongoose.Schema({
  boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, default: 'member', required: true },
  joinedAt: { type: Date, default: Date.now }
});

// Define Column Schema
const columnSchema = new mongoose.Schema({
  name: { type: String, required: true },
  boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
  order: { type: Number, required: true },
  color: { type: String, default: 'blue', required: true }
});

// Define Task Schema
const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  columnId: { type: mongoose.Schema.Types.ObjectId, ref: 'Column', required: true },
  boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
  order: { type: Number, required: true },
  priority: { type: String, default: 'medium', required: true },
  dueDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

// Define TaskAssignee Schema
const taskAssigneeSchema = new mongoose.Schema({
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedAt: { type: Date, default: Date.now }
});

// Define Notification Schema
const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  type: { type: String, required: true },
  read: { type: Boolean, default: false, required: true },
  relatedId: { type: mongoose.Schema.Types.ObjectId },
  relatedType: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Define PushSubscription Schema
const pushSubscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  endpoint: { type: String, required: true },
  p256dh: { type: String, required: true },
  auth: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Create models
export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const Board = mongoose.models.Board || mongoose.model('Board', boardSchema);
export const BoardMember = mongoose.models.BoardMember || mongoose.model('BoardMember', boardMemberSchema);
export const Column = mongoose.models.Column || mongoose.model('Column', columnSchema);
export const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);
export const TaskAssignee = mongoose.models.TaskAssignee || mongoose.model('TaskAssignee', taskAssigneeSchema);
export const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
export const PushSubscription = mongoose.models.PushSubscription || mongoose.model('PushSubscription', pushSubscriptionSchema);