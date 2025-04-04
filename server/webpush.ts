import webpush from 'web-push';
import { storage } from './storage';
import type { User } from '@shared/schema';

// Configure web push
export function setupWebPush() {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      'mailto:info@kanban.app',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  } else {
    console.warn('VAPID keys not found. Push notifications will not work.');
  }

  return webpush;
}

// Helper to send notification to a specific user
export async function sendNotificationToUser(
  userId: number, 
  payload: { title: string, body: string, tag?: string, icon?: string, data?: any }
) {
  try {
    // Get user's push subscriptions
    const subscriptions = await storage.getUserPushSubscriptions(userId);
    
    if (!subscriptions.length) {
      return { sent: false, reason: 'No subscription found' };
    }

    // Try to send to all subscriptions
    const results = await Promise.all(subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth
            }
          },
          JSON.stringify(payload)
        );
        return { success: true, endpoint: subscription.endpoint };
      } catch (error: any) {
        // If subscription is expired or invalid, delete it
        if (error.statusCode === 404 || error.statusCode === 410) {
          await storage.deletePushSubscription(subscription.endpoint);
        }
        return { success: false, endpoint: subscription.endpoint, error };
      }
    }));

    return { sent: results.some(r => r.success), results };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { sent: false, error };
  }
}

// Send task due notification
export async function sendTaskDueNotification(task: any, user: User) {
  return sendNotificationToUser(user.id, {
    title: 'Task Due Soon',
    body: `The task "${task.title}" is due soon.`,
    tag: `task-due-${task.id}`,
    data: {
      type: 'task-due',
      taskId: task.id,
      boardId: task.boardId
    }
  });
}

// Send task assignment notification
export async function sendTaskAssignedNotification(task: any, assignerName: string, user: User) {
  return sendNotificationToUser(user.id, {
    title: 'New Task Assignment',
    body: `${assignerName} assigned you to "${task.title}"`,
    tag: `task-assigned-${task.id}`,
    data: {
      type: 'task-assigned',
      taskId: task.id,
      boardId: task.boardId
    }
  });
}

// Send board invitation notification
export async function sendBoardInviteNotification(board: any, inviterName: string, user: User) {
  return sendNotificationToUser(user.id, {
    title: 'Board Invitation',
    body: `${inviterName} invited you to collaborate on "${board.name}"`,
    tag: `board-invite-${board.id}`,
    data: {
      type: 'board-invite',
      boardId: board.id
    }
  });
}

// Get VAPID public key
export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || '';
}
