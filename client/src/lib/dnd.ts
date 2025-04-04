import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';

export interface Task {
  id: number;
  title: string;
  description?: string;
  columnId: number;
  boardId: number;
  order: number;
  priority: string;
  dueDate?: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
  createdBy?: number;
}

export interface Column {
  id: number;
  name: string;
  boardId: number;
  order: number;
  color: string;
}

// Reorder tasks within the same column
export async function reorderTasks(
  columnId: number,
  taskId: number,
  newOrder: number
): Promise<void> {
  try {
    await apiRequest('PUT', `/api/tasks/${taskId}`, {
      columnId,
      order: newOrder
    });
    
    // Invalidate tasks cache to trigger a refetch
    queryClient.invalidateQueries({ queryKey: [`/api/boards/${columnId}`] });
  } catch (error) {
    console.error('Error reordering tasks:', error);
    throw error;
  }
}

// Move task to a different column
export async function moveTaskToColumn(
  task: Task,
  sourceColumnId: number,
  destinationColumnId: number,
  newOrder: number
): Promise<void> {
  try {
    // First verify offline support is possible
    if (!navigator.onLine) {
      await saveOfflineTaskMove({
        url: `/api/tasks/${task.id}`,
        method: 'PUT',
        data: {
          ...task,
          columnId: destinationColumnId,
          order: newOrder
        }
      });
      return;
    }
    
    // Update the task with the new column and order
    await apiRequest('PUT', `/api/tasks/${task.id}`, {
      columnId: destinationColumnId,
      order: newOrder
    });
    
    // Invalidate both source and destination column queries
    queryClient.invalidateQueries({ queryKey: [`/api/boards/${task.boardId}`] });
  } catch (error) {
    console.error('Error moving task to column:', error);
    throw error;
  }
}

// Get sorted and filtered tasks from a columns
export function getSortedTasks(tasks: Task[], columnId: number): Task[] {
  return tasks
    .filter(task => task.columnId === columnId)
    .sort((a, b) => a.order - b.order);
}

// Get highest order in a column
export function getHighestOrder(tasks: Task[], columnId: number): number {
  const columnTasks = tasks.filter(task => task.columnId === columnId);
  if (columnTasks.length === 0) return 0;
  return Math.max(...columnTasks.map(task => task.order)) + 1;
}

// Get sorted columns
export function getSortedColumns(columns: Column[]): Column[] {
  return [...columns].sort((a, b) => a.order - b.order);
}

// Get task by ID
export function getTaskById(tasks: Task[], taskId: number): Task | undefined {
  return tasks.find(task => task.id === taskId);
}

// Save task move for offline support
async function saveOfflineTaskMove(operation: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('kanban-offline-db', 1);
    
    request.onerror = (event) => {
      reject('Error opening IndexedDB');
    };
    
    request.onsuccess = (event) => {
      const db = request.result;
      const transaction = db.transaction(['pendingTasks'], 'readwrite');
      const store = transaction.objectStore('pendingTasks');
      
      const addRequest = store.add(operation);
      
      addRequest.onsuccess = () => {
        resolve();
        
        // Register for sync when back online
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
          navigator.serviceWorker.ready.then(registration => {
            registration.sync.register('sync-tasks')
              .catch(error => console.error('Sync registration failed:', error));
          });
        }
      };
      
      addRequest.onerror = () => {
        reject('Error saving offline operation');
      };
    };
    
    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains('pendingTasks')) {
        db.createObjectStore('pendingTasks', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('pendingBoards')) {
        db.createObjectStore('pendingBoards', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}
