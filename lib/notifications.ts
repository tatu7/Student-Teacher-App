import { supabase } from './supabase';

export type NotificationType = 'task_assigned' | 'group_invitation';

export interface NotificationData {
  message: string;
  taskId?: string;
  groupId?: string;
  [key: string]: any;
}

/**
 * Creates a notification for a user
 */
export async function createNotification({
  userId,
  type,
  data,
}: {
  userId: string;
  type: NotificationType;
  data: NotificationData;
}) {
  if (!userId) {
    console.error('Error creating notification: userId is required');
    return;
  }

  try {
    // For debugging
    console.log(`Creating notification for user ${userId}`);

    // We need to use service_role (admin rights) to bypass RLS
    // when creating notifications for other users
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        data,
        is_read: false,
      });

    if (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  } catch (error) {
    console.error('Exception in createNotification:', error);
    throw error;
  }
}

/**
 * Notifies a student about a new task assignment
 */
export async function notifyTaskAssigned({
  studentId,
  taskTitle,
  taskId,
}: {
  studentId: string;
  taskTitle: string;
  taskId: string;
}) {
  return createNotification({
    userId: studentId,
    type: 'task_assigned',
    data: {
      message: `New task assigned: ${taskTitle}`,
      taskId,
    },
  });
}

/**
 * Notifies a student about being added to a group
 */
export async function notifyGroupInvitation({
  studentId,
  groupName,
  groupId,
}: {
  studentId: string;
  groupName: string;
  groupId: string;
}) {
  return createNotification({
    userId: studentId,
    type: 'group_invitation',
    data: {
      message: `You've been added to the group: ${groupName}`,
      groupId,
    },
  });
}
