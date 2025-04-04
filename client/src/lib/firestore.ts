import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { db } from "./firebase";

// Types
export interface Board {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Column {
  id: string;
  boardId: string;
  name: string;
  order: number;
  color?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Task {
  id: string;
  boardId: string;
  columnId: string;
  title: string;
  description?: string;
  priority?: string;
  dueDate?: Timestamp;
  assignedTo?: string[];
  order: number;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface BoardMember {
  id: string;
  boardId: string;
  userId: string;
  role: string; // 'owner', 'editor', 'viewer'
  joinedAt: Timestamp;
}

// Boards
export async function createBoard(userId: string, data: { name: string, description?: string }) {
  try {
    console.log("Creating board for user:", userId, "with data:", data);
    
    const boardData = {
      ...data,
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    console.log("Prepared board data:", boardData);
    
    // Add the board document
    const boardRef = await addDoc(collection(db, "boards"), boardData);
    console.log("Board created with ID:", boardRef.id);
    
    // Add board membership for the creator with 'owner' role
    const membershipData = {
      boardId: boardRef.id,
      userId,
      role: 'owner',
      joinedAt: serverTimestamp()
    };
    console.log("Adding board membership:", membershipData);
    
    const membershipRef = await addDoc(collection(db, "boardMembers"), membershipData);
    console.log("Board membership created with ID:", membershipRef.id);
    
    // Create default columns
    const defaultColumns = [
      { name: 'To Do', order: 0, color: '#3b82f6' },
      { name: 'In Progress', order: 1, color: '#f97316' },
      { name: 'Done', order: 2, color: '#10b981' }
    ];
    
    console.log("Creating default columns for board:", boardRef.id);
    
    for (const column of defaultColumns) {
      const columnData = {
        ...column,
        boardId: boardRef.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const columnRef = await addDoc(collection(db, "columns"), columnData);
      console.log(`Column "${column.name}" created with ID:`, columnRef.id);
    }
    
    // Get the complete board data
    const boardSnapshot = await getDoc(boardRef);
    const board = { id: boardRef.id, ...boardSnapshot.data() } as Board;
    console.log("Returning new board:", board);
    
    return board;
  } catch (error) {
    console.error("Error creating board:", error);
    throw error;
  }
}

export async function getUserBoards(userId: string) {
  try {
    console.log("Getting boards for user:", userId);
    
    // Get board memberships for the user
    const membershipQuery = query(
      collection(db, "boardMembers"),
      where("userId", "==", userId)
    );
    
    const membershipSnapshots = await getDocs(membershipQuery);
    console.log("Board memberships found:", membershipSnapshots.size);
    
    const boardIds = membershipSnapshots.docs.map(doc => doc.data().boardId);
    console.log("Board IDs from memberships:", boardIds);
    
    if (boardIds.length === 0) {
      console.log("No board memberships found, returning empty array");
      return [];
    }
    
    // Get all boards where the user is a member
    const boards: Board[] = [];
    
    for (const boardId of boardIds) {
      console.log("Fetching board with ID:", boardId);
      const boardDoc = await getDoc(doc(db, "boards", boardId));
      
      if (boardDoc.exists()) {
        console.log("Board exists, adding to list:", boardDoc.id);
        boards.push({ id: boardDoc.id, ...boardDoc.data() } as Board);
      } else {
        console.log("Board document doesn't exist for ID:", boardId);
      }
    }
    
    console.log("Final boards list:", boards);
    return boards;
  } catch (error) {
    console.error("Error getting user boards:", error);
    throw error;
  }
}

export async function getBoard(boardId: string) {
  try {
    const boardDoc = await getDoc(doc(db, "boards", boardId));
    if (!boardDoc.exists()) {
      throw new Error("Board not found");
    }
    
    return { id: boardDoc.id, ...boardDoc.data() } as Board;
  } catch (error) {
    console.error("Error getting board:", error);
    throw error;
  }
}

export async function updateBoard(boardId: string, data: Partial<Omit<Board, 'id' | 'createdBy' | 'createdAt'>>) {
  try {
    const boardRef = doc(db, "boards", boardId);
    
    await updateDoc(boardRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    
    const updatedBoard = await getDoc(boardRef);
    return { id: updatedBoard.id, ...updatedBoard.data() } as Board;
  } catch (error) {
    console.error("Error updating board:", error);
    throw error;
  }
}

export async function deleteBoard(boardId: string) {
  try {
    // Delete the board document
    await deleteDoc(doc(db, "boards", boardId));
    
    // Delete all columns in the board
    const columnsQuery = query(
      collection(db, "columns"),
      where("boardId", "==", boardId)
    );
    const columnsSnapshots = await getDocs(columnsQuery);
    
    for (const columnDoc of columnsSnapshots.docs) {
      await deleteDoc(doc(db, "columns", columnDoc.id));
    }
    
    // Delete all tasks in the board
    const tasksQuery = query(
      collection(db, "tasks"),
      where("boardId", "==", boardId)
    );
    const tasksSnapshots = await getDocs(tasksQuery);
    
    for (const taskDoc of tasksSnapshots.docs) {
      await deleteDoc(doc(db, "tasks", taskDoc.id));
    }
    
    // Delete all board memberships
    const membersQuery = query(
      collection(db, "boardMembers"),
      where("boardId", "==", boardId)
    );
    const membersSnapshots = await getDocs(membersQuery);
    
    for (const memberDoc of membersSnapshots.docs) {
      await deleteDoc(doc(db, "boardMembers", memberDoc.id));
    }
    
    return true;
  } catch (error) {
    console.error("Error deleting board:", error);
    throw error;
  }
}

// Columns
export async function getBoardColumns(boardId: string) {
  try {
    const columnsQuery = query(
      collection(db, "columns"),
      where("boardId", "==", boardId)
    );
    
    const columnsSnapshots = await getDocs(columnsQuery);
    const columns = columnsSnapshots.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Column[];
    
    // Sort columns by order
    return columns.sort((a, b) => a.order - b.order);
  } catch (error) {
    console.error("Error getting board columns:", error);
    throw error;
  }
}

export async function createColumn(data: Omit<Column, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const columnData = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const columnRef = await addDoc(collection(db, "columns"), columnData);
    const columnSnapshot = await getDoc(columnRef);
    
    return { id: columnRef.id, ...columnSnapshot.data() } as Column;
  } catch (error) {
    console.error("Error creating column:", error);
    throw error;
  }
}

export async function updateColumn(columnId: string, data: Partial<Omit<Column, 'id' | 'boardId' | 'createdAt'>>) {
  try {
    const columnRef = doc(db, "columns", columnId);
    
    await updateDoc(columnRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    
    const updatedColumn = await getDoc(columnRef);
    return { id: updatedColumn.id, ...updatedColumn.data() } as Column;
  } catch (error) {
    console.error("Error updating column:", error);
    throw error;
  }
}

export async function deleteColumn(columnId: string) {
  try {
    // Delete the column
    await deleteDoc(doc(db, "columns", columnId));
    
    // Delete all tasks in the column
    const tasksQuery = query(
      collection(db, "tasks"),
      where("columnId", "==", columnId)
    );
    const tasksSnapshots = await getDocs(tasksQuery);
    
    for (const taskDoc of tasksSnapshots.docs) {
      await deleteDoc(doc(db, "tasks", taskDoc.id));
    }
    
    return true;
  } catch (error) {
    console.error("Error deleting column:", error);
    throw error;
  }
}

// Tasks
export async function getBoardTasks(boardId: string) {
  try {
    const tasksQuery = query(
      collection(db, "tasks"),
      where("boardId", "==", boardId)
    );
    
    const tasksSnapshots = await getDocs(tasksQuery);
    const tasks = tasksSnapshots.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Task[];
    
    return tasks;
  } catch (error) {
    console.error("Error getting board tasks:", error);
    throw error;
  }
}

export async function getColumnTasks(columnId: string) {
  try {
    const tasksQuery = query(
      collection(db, "tasks"),
      where("columnId", "==", columnId)
    );
    
    const tasksSnapshots = await getDocs(tasksQuery);
    const tasks = tasksSnapshots.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Task[];
    
    // Sort tasks by order
    return tasks.sort((a, b) => a.order - b.order);
  } catch (error) {
    console.error("Error getting column tasks:", error);
    throw error;
  }
}

export async function createTask(userId: string, data: Omit<Task, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>) {
  try {
    const taskData = {
      ...data,
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const taskRef = await addDoc(collection(db, "tasks"), taskData);
    const taskSnapshot = await getDoc(taskRef);
    
    return { id: taskRef.id, ...taskSnapshot.data() } as Task;
  } catch (error) {
    console.error("Error creating task:", error);
    throw error;
  }
}

export async function updateTask(taskId: string, data: Partial<Omit<Task, 'id' | 'boardId' | 'createdBy' | 'createdAt'>>) {
  try {
    const taskRef = doc(db, "tasks", taskId);
    
    await updateDoc(taskRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    
    const updatedTask = await getDoc(taskRef);
    return { id: updatedTask.id, ...updatedTask.data() } as Task;
  } catch (error) {
    console.error("Error updating task:", error);
    throw error;
  }
}

export async function deleteTask(taskId: string) {
  try {
    await deleteDoc(doc(db, "tasks", taskId));
    return true;
  } catch (error) {
    console.error("Error deleting task:", error);
    throw error;
  }
}

// Board members
export async function getBoardMembers(boardId: string) {
  try {
    const membersQuery = query(
      collection(db, "boardMembers"),
      where("boardId", "==", boardId)
    );
    
    const membersSnapshots = await getDocs(membersQuery);
    const members = membersSnapshots.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as BoardMember[];
    
    return members;
  } catch (error) {
    console.error("Error getting board members:", error);
    throw error;
  }
}

export async function addBoardMember(data: Omit<BoardMember, 'id' | 'joinedAt'>) {
  try {
    const memberData = {
      ...data,
      joinedAt: serverTimestamp()
    };
    
    const memberRef = await addDoc(collection(db, "boardMembers"), memberData);
    const memberSnapshot = await getDoc(memberRef);
    
    return { id: memberRef.id, ...memberSnapshot.data() } as BoardMember;
  } catch (error) {
    console.error("Error adding board member:", error);
    throw error;
  }
}

export async function updateBoardMemberRole(memberId: string, role: string) {
  try {
    const memberRef = doc(db, "boardMembers", memberId);
    
    await updateDoc(memberRef, { role });
    
    const updatedMember = await getDoc(memberRef);
    return { id: updatedMember.id, ...updatedMember.data() } as BoardMember;
  } catch (error) {
    console.error("Error updating board member role:", error);
    throw error;
  }
}

export async function removeBoardMember(memberId: string) {
  try {
    await deleteDoc(doc(db, "boardMembers", memberId));
    return true;
  } catch (error) {
    console.error("Error removing board member:", error);
    throw error;
  }
}