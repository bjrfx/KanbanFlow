export interface User {
  id: number;
  email: string;
  username: string;
  avatar?: string;
}

export interface Board {
  id: number;
  name: string;
  description?: string;
  ownerId: number;
  createdAt: string;
  updatedAt: string;
}

export interface BoardMember {
  boardId: number;
  userId: number;
  role: string;
  joinedAt: string;
  user: User;
}

export interface Column {
  id: number;
  name: string;
  boardId: number;
  order: number;
  color: string;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  columnId: number;
  boardId: number;
  order: number;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: number;
}

export interface TaskAssignee {
  taskId: number;
  userId: number;
  assignedAt: string;
  user: User;
}

export interface Notification {
  id: number;
  userId: number;
  message: string;
  type: string;
  read: boolean;
  relatedId?: number;
  relatedType?: string;
  createdAt: string;
}

export interface BoardData {
  board: Board;
  columns: Column[];
  tasks: Task[];
  members: BoardMember[];
}

export interface CreateBoardInput {
  name: string;
  description?: string;
}

export interface CreateColumnInput {
  name: string;
  boardId: number;
  order: number;
  color: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  columnId: number;
  boardId: number;
  order: number;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  columnId?: number;
  order?: number;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
}

export interface TaskWithAssignees extends Task {
  assignees?: User[];
}

export interface DragItem {
  id: number;
  type: 'task';
  columnId: number;
  index: number;
}
