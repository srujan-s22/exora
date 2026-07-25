import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db/connection';
import { Notification as NotificationModel } from '@/lib/db/models/notification.model';
import { User as UserModel } from '@/lib/db/models/user.model';
import type { UserRoleType } from '@/lib/config/roles';

export interface SendNotificationInput {
  senderId: string;
  targetType: 'roles' | 'users' | 'all';
  targetRoles?: UserRoleType[];
  recipientUserIds?: string[];
  title: string;
  message: string;
  type?: 'announcement' | 'alert' | 'system' | 'info';
}

export class NotificationService {
  /**
   * Super Admin sends notifications to selected users or target roles.
   */
  static async sendBroadcastNotifications(input: SendNotificationInput) {
    await connectToDatabase();

    const { senderId, targetType, targetRoles = [], recipientUserIds = [], title, message, type = 'announcement' } = input;

    let targetUserObjectIds: mongoose.Types.ObjectId[] = [];

    if (targetType === 'all') {
      const allUsers = await UserModel.find({ isActive: true }).select('_id');
      targetUserObjectIds = allUsers.map((u) => u._id);
    } else if (targetType === 'roles' && targetRoles.length > 0) {
      const matchingUsers = await UserModel.find({
        role: { $in: targetRoles },
        isActive: true,
      }).select('_id');
      targetUserObjectIds = matchingUsers.map((u) => u._id);
    } else if (targetType === 'users' && recipientUserIds.length > 0) {
      targetUserObjectIds = recipientUserIds
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));
    }

    if (targetUserObjectIds.length === 0) {
      throw new Error('No active recipient users found matching the selected target criteria.');
    }

    const senderObjId = new mongoose.Types.ObjectId(senderId);
    const now = new Date();

    const notificationDocs = targetUserObjectIds.map((recipientId) => ({
      recipient: recipientId,
      sender: senderObjId,
      title: title.trim(),
      message: message.trim(),
      type,
      isRead: false,
      createdAt: now,
    }));

    const result = await NotificationModel.insertMany(notificationDocs);

    return {
      sentCount: result.length,
      recipientCount: targetUserObjectIds.length,
    };
  }

  /**
   * Retrieves notifications and unread count for a given user.
   */
  static async getUserNotifications(userId: string, limit = 20) {
    await connectToDatabase();

    const userObjId = new mongoose.Types.ObjectId(userId);

    const [unreadCount, docs] = await Promise.all([
      NotificationModel.countDocuments({ recipient: userObjId, isRead: false }),
      NotificationModel.find({ recipient: userObjId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('sender', 'name role staffId'),
    ]);

    return {
      notifications: docs.map((d) => d.toJSON()),
      unreadCount,
    };
  }

  /**
   * Mark specified notifications as read.
   */
  static async markAsRead(userId: string, notificationIds?: string[]) {
    await connectToDatabase();

    const userObjId = new mongoose.Types.ObjectId(userId);
    const query: Record<string, any> = { recipient: userObjId, isRead: false };

    if (notificationIds && notificationIds.length > 0) {
      query._id = { $in: notificationIds.map((id) => new mongoose.Types.ObjectId(id)) };
    }

    const res = await NotificationModel.updateMany(query, {
      $set: { isRead: true, readAt: new Date() },
    });

    return { updatedCount: res.modifiedCount };
  }

  /**
   * Get recent notifications broadcast by Super Admins.
   */
  static async getSentBroadcastHistory(limit = 30) {
    await connectToDatabase();

    const docs = await NotificationModel.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sender', 'name role')
      .populate('recipient', 'name role staffId');

    return docs.map((d) => d.toJSON());
  }
}
