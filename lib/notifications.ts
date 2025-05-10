import { supabase } from './supabase';

export type NotificationType = 'task_assigned' | 'group_invitation';

export async function createNotification({
  userId,
  type,
  data,
}: {
  userId: string;
  type: NotificationType;
  data: any;
}) {
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type,
    data,
    is_read: false,
  });
  if (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

export async function notifyTaskAssigned(studentId: string, taskTitle: string, taskId: string) {
  console.log("Notifying student:", studentId);

  // studentId null bo'lsa, notification yozilmasligini ta'minlash
  if (!studentId) {
    console.error("Cannot notify with null studentId");
    return;
  }

  return createNotification({
    userId: studentId,
    type: 'task_assigned',
    data: {
      message: `New task assigned: ${taskTitle}`,
      taskId,
    },
  });
}

export async function notifyGroupInvitation(studentId: string, groupName: string, groupId: string) {
  return createNotification({
    userId: studentId,
    type: 'group_invitation',
    data: {
      message: `You've been invited to join group: ${groupName}`,
      groupId,
    },
  });
}
