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
  Timestamp,
  onSnapshot,
  orderBy
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

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  timestamp: Timestamp;
  read: boolean;
  type: "task" | "mention" | "due" | "system";
  linkTo?: string;
  boardId?: string;
  taskId?: string;
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
  // Additional properties for UI display (not stored in Firestore)
  boardName?: string;
  columnName?: string;
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
    
    // Create client-side timestamps for immediate display
    const clientTimestamp = new Timestamp(Math.floor(Date.now() / 1000), 0);
    
    const boardData = {
      ...data,
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      // Add client-side timestamps for immediate UI updates
      _clientCreatedAt: clientTimestamp,
      _clientUpdatedAt: clientTimestamp
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
    
    // Create columns in parallel for faster operation
    await Promise.all(defaultColumns.map(async (column) => {
      const columnData = {
        ...column,
        boardId: boardRef.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Add client-side timestamps for immediate UI updates
        _clientCreatedAt: clientTimestamp,
        _clientUpdatedAt: clientTimestamp
      };
      
      const columnRef = await addDoc(collection(db, "columns"), columnData);
      console.log(`Column "${column.name}" created with ID:`, columnRef.id);
    }));
    
    // Return a board object with client timestamps that will show up immediately
    // This helps with immediate display in the UI
    return {
      id: boardRef.id,
      ...data,
      createdBy: userId,
      createdAt: clientTimestamp,
      updatedAt: clientTimestamp
    } as Board;
  } catch (error) {
    console.error("Error creating board:", error);
    throw error;
  }
}

export async function getUserBoards(userId: string) {
  try {
    console.log("Getting boards for user:", userId);
    
    // First approach: Get boards directly by createdBy field
    const boardsQuery = query(
      collection(db, "boards"),
      where("createdBy", "==", userId)
    );
    
    const boardsSnapshot = await getDocs(boardsQuery);
    console.log(`Found ${boardsSnapshot.size} boards created by user:`, userId);
    
    const boards: Board[] = boardsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Board[];
    
    // Second approach: Get board memberships
    const membershipQuery = query(
      collection(db, "boardMembers"),
      where("userId", "==", userId)
    );
    
    const membershipSnapshots = await getDocs(membershipQuery);
    console.log(`Found ${membershipSnapshots.size} board memberships for user:`, userId);
    
    // Get board IDs from memberships, excluding those already in the boards array
    const boardIdsFromCreated = boards.map(board => board.id);
    const boardIdsFromMemberships = membershipSnapshots.docs
      .map(doc => doc.data().boardId)
      .filter(boardId => !boardIdsFromCreated.includes(boardId));
    
    console.log("Additional board IDs from memberships:", boardIdsFromMemberships);
    
    // Fetch additional boards from memberships
    for (const boardId of boardIdsFromMemberships) {
      console.log("Fetching additional board with ID:", boardId);
      const boardDoc = await getDoc(doc(db, "boards", boardId));
      
      if (boardDoc.exists()) {
        console.log("Board exists, adding to list:", boardDoc.id);
        boards.push({ id: boardDoc.id, ...boardDoc.data() } as Board);
      } else {
        console.log("Board document doesn't exist for ID:", boardId);
      }
    }
    
    // Sort boards by creation time (newest first)
    boards.sort((a, b) => {
      const dateA = a.createdAt ? a.createdAt.toDate().getTime() : 0;
      const dateB = b.createdAt ? b.createdAt.toDate().getTime() : 0;
      return dateB - dateA;
    });
    
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
    console.log("Getting tasks for column:", columnId);
    
    const tasksQuery = query(
      collection(db, "tasks"),
      where("columnId", "==", columnId)
    );
    
    const tasksSnapshots = await getDocs(tasksQuery);
    console.log(`Found ${tasksSnapshots.size} tasks for column ${columnId}`);
    
    const tasks = tasksSnapshots.docs.map(doc => {
      console.log(`Task document ID: ${doc.id}, data:`, doc.data());
      return {
        id: doc.id,
        ...doc.data()
      };
    }) as Task[];
    
    // Sort tasks by order
    const sortedTasks = tasks.sort((a, b) => a.order - b.order);
    console.log("Returning sorted tasks:", sortedTasks);
    
    return sortedTasks;
  } catch (error) {
    console.error("Error getting column tasks:", error);
    throw error;
  }
}

export async function createTask(userId: string, data: Omit<Task, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>) {
  try {
    console.log("Creating task:", { userId, data });
    
    // Create client-side timestamps for immediate display
    const clientTimestamp = new Timestamp(Math.floor(Date.now() / 1000), 0);
    
    const taskData = {
      ...data,
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      // Add client-side timestamps for immediate UI updates
      _clientCreatedAt: clientTimestamp,
      _clientUpdatedAt: clientTimestamp
    };
    
    console.log("Task data to be saved:", taskData);
    
    const taskRef = await addDoc(collection(db, "tasks"), taskData);
    console.log("Task created with ID:", taskRef.id);
    
    // Return a task object with client timestamps that will show up immediately
    return {
      id: taskRef.id,
      ...data,
      createdBy: userId,
      createdAt: clientTimestamp,
      updatedAt: clientTimestamp
    } as Task;
  } catch (error) {
    console.error("Error creating task:", error);
    throw error;
  }
}

export async function updateTask(taskId: string, data: Partial<Omit<Task, 'id' | 'boardId' | 'createdBy' | 'createdAt'>>) {
  try {
    const taskRef = doc(db, "tasks", taskId);
    
    // Create client-side timestamp for immediate display
    const clientTimestamp = new Timestamp(Math.floor(Date.now() / 1000), 0);
    
    // First, get the current task data
    const taskSnapshot = await getDoc(taskRef);
    if (!taskSnapshot.exists()) {
      throw new Error("Task not found");
    }
    
    const currentTask = { id: taskSnapshot.id, ...taskSnapshot.data() } as Task;
    
    // Update with server timestamp
    await updateDoc(taskRef, {
      ...data,
      updatedAt: serverTimestamp(),
      // Add client-side timestamp for immediate UI updates
      _clientUpdatedAt: clientTimestamp
    });
    
    // Return an immediately updated task object with client timestamp
    return {
      ...currentTask,
      ...data,
      updatedAt: clientTimestamp
    } as Task;
  } catch (error) {
    console.error("Error updating task:", error);
    throw error;
  }
}

// Task assignment functions
export async function assignTaskToUser(taskId: string, userId: string, currentUserId: string) {
  try {
    const taskRef = doc(db, "tasks", taskId);
    
    // First, get the current task data
    const taskSnapshot = await getDoc(taskRef);
    if (!taskSnapshot.exists()) {
      throw new Error("Task not found");
    }
    
    const task = { id: taskSnapshot.id, ...taskSnapshot.data() } as Task;
    
    // Get the board to get its name
    const boardRef = doc(db, "boards", task.boardId);
    const boardSnapshot = await getDoc(boardRef);
    if (!boardSnapshot.exists()) {
      throw new Error("Board not found");
    }
    
    const board = { id: boardSnapshot.id, ...boardSnapshot.data() } as { id: string; name: string; };
    
    // Get the assigner's name
    const userRef = doc(db, "users", currentUserId);
    const userSnapshot = await getDoc(userRef);
    const userName = userSnapshot.exists() ? 
                     userSnapshot.data().displayName || userSnapshot.data().email : 
                     "Someone";
    
    // Create an array of assignedTo if it doesn't exist
    const assignedTo = task.assignedTo || [];
    
    // Only add if not already assigned
    if (!assignedTo.includes(userId)) {
      // Update the task with the new assignee
      const updatedAssignedTo = [...assignedTo, userId];
      
      await updateDoc(taskRef, {
        assignedTo: updatedAssignedTo,
        updatedAt: serverTimestamp()
      });
      
      // Create a notification if the user is not assigning to themselves
      if (userId !== currentUserId) {
        // Import from notification-utils to avoid circular dependency
        const { createTaskAssignedNotification } = await import("./notification-utils");
        
        await createTaskAssignedNotification(
          userId,
          task.title,
          board.name,
          task.boardId,
          taskId,
          userName
        );
      }
      
      return {
        ...task,
        assignedTo: updatedAssignedTo
      };
    }
    
    return task;
  } catch (error) {
    console.error("Error assigning task to user:", error);
    throw error;
  }
}

export async function unassignTaskFromUser(taskId: string, userId: string) {
  try {
    const taskRef = doc(db, "tasks", taskId);
    
    // First, get the current task data
    const taskSnapshot = await getDoc(taskRef);
    if (!taskSnapshot.exists()) {
      throw new Error("Task not found");
    }
    
    const task = { id: taskSnapshot.id, ...taskSnapshot.data() } as Task;
    
    // Create an array of assignedTo if it doesn't exist
    const assignedTo = task.assignedTo || [];
    
    // Only remove if already assigned
    if (assignedTo.includes(userId)) {
      // Update the task with the new assignee list
      const updatedAssignedTo = assignedTo.filter(id => id !== userId);
      
      await updateDoc(taskRef, {
        assignedTo: updatedAssignedTo,
        updatedAt: serverTimestamp()
      });
      
      return {
        ...task,
        assignedTo: updatedAssignedTo
      };
    }
    
    return task;
  } catch (error) {
    console.error("Error unassigning task from user:", error);
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

// My Tasks helper
export async function getUserAssignedTasks(userId: string) {
  try {
    console.log("Getting tasks assigned to user:", userId);
    
    // Get user's boards
    const boards = await getUserBoards(userId);
    console.log(`Found ${boards.length} boards for user`);
    
    // Create an empty array to store all tasks
    let allAssignedTasks: Task[] = [];
    
    // Create a query to get all tasks assigned to the user
    const tasksQuery = query(
      collection(db, "tasks"),
      where("assignedTo", "array-contains", userId)
    );
    
    const tasksSnapshot = await getDocs(tasksQuery);
    const assignedTasks = tasksSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Task[];
    
    // Create a map of board IDs for quick lookup
    const boardsMap = new Map(boards.map(board => [board.id, board]));
    
    // For tasks that belong to user's boards, fetch column info
    for (const task of assignedTasks) {
      if (boardsMap.has(task.boardId)) {
        const board = boardsMap.get(task.boardId)!;
        const columns = await getBoardColumns(task.boardId);
        const columnsMap = new Map(columns.map(col => [col.id, col]));
        
        // Add board name and column name to task
        const enhancedTask = {
          ...task,
          boardName: board.name,
          columnName: columnsMap.get(task.columnId)?.name || "Unknown"
        };
        
        // Add this task to the overall array
        allAssignedTasks.push(enhancedTask);
      }
    }
    
    // Sort tasks by due date (tasks with due dates first, then by date)
    allAssignedTasks.sort((a, b) => {
      // If both have due dates, sort by date
      if (a.dueDate && b.dueDate) {
        return a.dueDate.toDate().getTime() - b.dueDate.toDate().getTime();
      }
      // If only a has a due date, it comes first
      if (a.dueDate && !b.dueDate) return -1;
      // If only b has a due date, it comes first
      if (!a.dueDate && b.dueDate) return 1;
      // If neither has a due date, sort by updated date (most recent first)
      return b.updatedAt.toDate().getTime() - a.updatedAt.toDate().getTime();
    });
    
    return allAssignedTasks;
  } catch (error) {
    console.error("Error getting user assigned tasks:", error);
    throw error;
  }
}

// Calendar helpers
export async function getBoardsWithTasks(userId: string) {
  try {
    console.log("Getting boards with tasks for user:", userId);
    
    // Get user's boards
    const boards = await getUserBoards(userId);
    console.log(`Found ${boards.length} boards for user`);
    
    // For each board, get all tasks
    const boardsWithTasks = await Promise.all(
      boards.map(async (board) => {
        const tasks = await getBoardTasks(board.id);
        return {
          ...board,
          tasks
        };
      })
    );
    
    console.log("Boards with tasks:", boardsWithTasks);
    return boardsWithTasks;
  } catch (error) {
    console.error("Error getting boards with tasks:", error);
    throw error;
  }
}

// Real-time listeners
export function onBoardChange(boardId: string, callback: (board: Board) => void) {
  console.log(`Setting up real-time listener for board ${boardId}`);
  
  const boardRef = doc(db, "boards", boardId);
  
  return onSnapshot(boardRef, (snapshot) => {
    if (snapshot.exists()) {
      const boardData = { id: snapshot.id, ...snapshot.data() } as Board;
      console.log(`Board ${boardId} updated:`, boardData);
      callback(boardData);
    } else {
      console.log(`Board ${boardId} does not exist`);
    }
  }, (error) => {
    console.error(`Error in board ${boardId} listener:`, error);
  });
}

export function onBoardColumnsChange(boardId: string, callback: (columns: Column[]) => void) {
  console.log(`Setting up real-time listener for columns in board ${boardId}`);
  
  const columnsQuery = query(
    collection(db, "columns"),
    where("boardId", "==", boardId),
    orderBy("order")
  );
  
  return onSnapshot(columnsQuery, (snapshot) => {
    const columns = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Column[];
    
    console.log(`Columns for board ${boardId} updated:`, columns);
    callback(columns);
  }, (error) => {
    console.error(`Error in columns listener for board ${boardId}:`, error);
  });
}

export function onColumnTasksChange(columnId: string, callback: (tasks: Task[]) => void) {
  console.log(`Setting up real-time listener for tasks in column ${columnId}`);
  
  const tasksQuery = query(
    collection(db, "tasks"),
    where("columnId", "==", columnId),
    orderBy("order")
  );
  
  return onSnapshot(tasksQuery, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Task[];
    
    console.log(`Tasks for column ${columnId} updated:`, tasks);
    callback(tasks);
  }, (error) => {
    console.error(`Error in tasks listener for column ${columnId}:`, error);
  });
}

export function onBoardTasksChange(boardId: string, callback: (tasks: Task[]) => void) {
  console.log(`Setting up real-time listener for all tasks in board ${boardId}`);
  
  const tasksQuery = query(
    collection(db, "tasks"),
    where("boardId", "==", boardId)
  );
  
  return onSnapshot(tasksQuery, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Task[];
    
    console.log(`All tasks for board ${boardId} updated:`, tasks);
    callback(tasks);
  }, (error) => {
    console.error(`Error in all tasks listener for board ${boardId}:`, error);
  });
}

export function onUserBoardsChange(userId: string, callback: (boards: Board[]) => void) {
  console.log(`Setting up real-time listener for boards of user ${userId}`);
  
  let ownedBoards: Board[] = [];
  let memberBoards: Board[] = [];
  let membershipBoardIds: string[] = [];
  // Initialize with no-op functions to prevent undefined errors
  let membershipUnsubscribe: (() => void) = () => {};
  let ownedBoardsUnsubscribe: (() => void) = () => {};
  
  try {
    // 1. Listen for boards created by the user
    const ownedBoardsQuery = query(
      collection(db, "boards"),
      where("createdBy", "==", userId)
    );
    
    // 2. Listen for board memberships
    const membershipsQuery = query(
      collection(db, "boardMembers"),
      where("userId", "==", userId)
    );
    
    // Set up the membership listener first
    membershipUnsubscribe = onSnapshot(membershipsQuery, async (snapshot) => {
      try {
        membershipBoardIds = snapshot.docs.map(doc => doc.data().boardId);
        
        // Get the actual board documents for membership boards that aren't already owned
        const boardsToFetch = membershipBoardIds.filter(id => !ownedBoards.some(board => board.id === id));
        
        if (boardsToFetch.length > 0) {
          memberBoards = [];
          
          for (const boardId of boardsToFetch) {
            try {
              const boardDoc = await getDoc(doc(db, "boards", boardId));
              if (boardDoc.exists()) {
                memberBoards.push({ id: boardDoc.id, ...boardDoc.data() } as Board);
              }
            } catch (error) {
              console.error(`Error fetching board ${boardId}:`, error);
            }
          }
          
          // Combine and sort all boards
          const allBoards = [...ownedBoards, ...memberBoards].sort((a, b) => {
            const dateA = a.createdAt ? a.createdAt.toDate().getTime() : 0;
            const dateB = b.createdAt ? b.createdAt.toDate().getTime() : 0;
            return dateB - dateA;
          });
          
          callback(allBoards);
        }
      } catch (error) {
        console.error("Error in membership listener:", error);
      }
    }, (error) => {
      console.error("Error in membership snapshot listener:", error);
    });
    
    // Set up the owned boards listener
    ownedBoardsUnsubscribe = onSnapshot(ownedBoardsQuery, (snapshot) => {
      try {
        ownedBoards = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Board[];
        
        // Combine and sort all boards
        const allBoards = [...ownedBoards, ...memberBoards].sort((a, b) => {
          const dateA = a.createdAt ? a.createdAt.toDate().getTime() : 0;
          const dateB = b.createdAt ? b.createdAt.toDate().getTime() : 0;
          return dateB - dateA;
        });
        
        callback(allBoards);
      } catch (error) {
        console.error("Error in owned boards listener:", error);
      }
    }, (error) => {
      console.error("Error in owned boards snapshot listener:", error);
    });
  } catch (error) {
    console.error("Error setting up board listeners:", error);
    // Don't throw the error, just log it to prevent app crashes
    // Instead, return a no-op unsubscribe function
    return () => {};
  }
  
  // Return a function to unsubscribe from both listeners
  return () => {
    try {
      console.log("Unsubscribing from board listeners");
      membershipUnsubscribe();
      ownedBoardsUnsubscribe();
    } catch (error) {
      console.error("Error unsubscribing from board listeners:", error);
    }
  };
}

// Notifications
export async function getUserNotifications(userId: string) {
  try {
    console.log("Getting notifications for user:", userId);
    
    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      orderBy("timestamp", "desc")
    );
    
    const notificationsSnapshots = await getDocs(notificationsQuery);
    console.log(`Found ${notificationsSnapshots.size} notifications for user ${userId}`);
    
    const notifications = notificationsSnapshots.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Notification[];
    
    return notifications;
  } catch (error) {
    console.error("Error getting user notifications:", error);
    throw error;
  }
}

export async function createNotification(notification: Omit<Notification, 'id' | 'timestamp'>) {
  try {
    console.log("Creating notification:", notification);
    
    // Create client-side timestamp for immediate display
    const clientTimestamp = new Timestamp(Math.floor(Date.now() / 1000), 0);
    
    const notificationData = {
      ...notification,
      timestamp: serverTimestamp(),
      _clientTimestamp: clientTimestamp // For immediate UI updates
    };
    
    const notificationRef = await addDoc(collection(db, "notifications"), notificationData);
    console.log("Notification created with ID:", notificationRef.id);
    
    // Return notification with client timestamp for immediate display
    return {
      id: notificationRef.id,
      ...notification,
      timestamp: clientTimestamp
    } as Notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
}

export async function markNotificationAsRead(notificationId: string) {
  try {
    const notificationRef = doc(db, "notifications", notificationId);
    
    await updateDoc(notificationRef, {
      read: true
    });
    
    return true;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
}

export async function markAllNotificationsAsRead(userId: string) {
  try {
    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      where("read", "==", false)
    );
    
    const notificationsSnapshots = await getDocs(notificationsQuery);
    
    const updatePromises = notificationsSnapshots.docs.map(doc => 
      updateDoc(doc.ref, { read: true })
    );
    
    await Promise.all(updatePromises);
    
    return true;
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    throw error;
  }
}

export async function deleteNotification(notificationId: string) {
  try {
    await deleteDoc(doc(db, "notifications", notificationId));
    return true;
  } catch (error) {
    console.error("Error deleting notification:", error);
    throw error;
  }
}

// Real-time notifications listener
export function listenForUserNotifications(userId: string, callback: (notifications: Notification[]) => void) {
  const notificationsQuery = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    orderBy("timestamp", "desc")
  );
  
  return onSnapshot(notificationsQuery, (snapshot) => {
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Notification[];
    
    callback(notifications);
  });
}