import { createNotification } from "./firestore";

/**
 * Create a task assigned notification
 */
export async function createTaskAssignedNotification(
  userId: string,
  taskTitle: string,
  boardName: string,
  boardId: string,
  taskId: string,
  assignerName: string
) {
  return createNotification({
    userId,
    title: "Task assigned to you",
    message: `${assignerName} assigned you a task '${taskTitle}' in board '${boardName}'`,
    read: false,
    type: "task",
    linkTo: `/board/${boardId}`,
    boardId,
    taskId
  });
}

/**
 * Create a task due soon notification
 */
export async function createTaskDueNotification(
  userId: string,
  taskTitle: string,
  boardName: string,
  boardId: string,
  taskId: string,
  dueDate: Date
) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Format the due date
  const dueDateStr = dueDate.toLocaleDateString(undefined, {
    month: 'short', 
    day: 'numeric',
    year: today.getFullYear() !== dueDate.getFullYear() ? 'numeric' : undefined
  });

  return createNotification({
    userId,
    title: "Task due soon",
    message: `Your task '${taskTitle}' in board '${boardName}' is due on ${dueDateStr}`,
    read: false,
    type: "due",
    linkTo: `/board/${boardId}`,
    boardId,
    taskId
  });
}

/**
 * Create a board shared notification
 */
export async function createBoardSharedNotification(
  userId: string,
  boardName: string,
  boardId: string,
  sharerName: string,
  role: string
) {
  return createNotification({
    userId,
    title: "New board shared with you",
    message: `${sharerName} has shared the '${boardName}' board with you. You have ${role} access.`,
    read: false,
    type: "task",
    linkTo: `/board/${boardId}`,
    boardId
  });
}

/**
 * Create a mention notification
 */
export async function createMentionNotification(
  userId: string,
  commenterName: string,
  comment: string,
  boardName: string,
  boardId: string,
  taskId?: string,
  taskTitle?: string
) {
  let message = `${commenterName} mentioned you in a comment: '${comment.substring(0, 50)}${comment.length > 50 ? '...' : ''}'`;
  if (taskTitle) {
    message += ` on task '${taskTitle}'`;
  }
  message += ` in board '${boardName}'`;
  
  return createNotification({
    userId,
    title: "You were mentioned",
    message,
    read: false,
    type: "mention",
    linkTo: `/board/${boardId}`,
    boardId,
    taskId
  });
}

/**
 * Create a task status update notification
 */
export async function createTaskStatusNotification(
  userId: string,
  taskTitle: string,
  boardName: string,
  boardId: string,
  taskId: string,
  updaterName: string,
  newStatus: string
) {
  return createNotification({
    userId,
    title: "Task status updated",
    message: `${updaterName} marked the task '${taskTitle}' as ${newStatus} in board '${boardName}'`,
    read: false,
    type: "task",
    linkTo: `/board/${boardId}`,
    boardId,
    taskId
  });
}

/**
 * Create a system notification
 */
export async function createSystemNotification(
  userId: string,
  title: string,
  message: string
) {
  return createNotification({
    userId,
    title,
    message,
    read: false,
    type: "system",
  });
}