/**
 * Enterprise-level notification management service
 * Handles notification state, deduplication, and grouping
 */

type NotificationType = "success" | "error" | "info" | "warn";

type NotificationEvent = {
  message: string;
  type: NotificationType;
  id: string;
  timestamp: number;
};

type NotificationSubscriber = (notifications: NotificationEvent[]) => void;

class NotificationManagerService {
  private static instance: NotificationManagerService;
  private activeNotifications: Map<string, NotificationEvent> = new Map();
  private subscribers: Set<NotificationSubscriber> = new Set();
  private notificationTTL: number = 5000; // Time to live for notifications in ms

  private constructor() {
    setInterval(() => this.cleanupExpiredNotifications(), 1000);
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): NotificationManagerService {
    if (!NotificationManagerService.instance) {
      NotificationManagerService.instance = new NotificationManagerService();
    }
    return NotificationManagerService.instance;
  }

  /**
   * Add notification with deduplication
   */
  public addNotification(message: string, type: NotificationType): string {
    const fingerprint = this.createFingerprint(message, type);
    const timestamp = Date.now();

    if (this.activeNotifications.has(fingerprint)) {
      const existing = this.activeNotifications.get(fingerprint)!;
      existing.timestamp = timestamp;
      this.notifySubscribers();
      return existing.id;
    }

    const id = this.generateId();
    const notification: NotificationEvent = {
      id,
      message,
      type,
      timestamp,
    };

    this.activeNotifications.set(fingerprint, notification);
    this.notifySubscribers();

    return id;
  }

  /**
   * Remove notification by ID
   */
  public removeNotification(id: string): void {
    let keyToDelete: string | undefined;

    // Find the notification by ID
    for (const [key, notification] of this.activeNotifications.entries()) {
      if (notification.id === id) {
        keyToDelete = key;
        break;
      }
    }

    if (keyToDelete) {
      this.activeNotifications.delete(keyToDelete);
      this.notifySubscribers();
    }
  }

  /**
   * Subscribe to notification changes
   */
  public subscribe(callback: NotificationSubscriber): () => void {
    this.subscribers.add(callback);
    callback(this.getActiveNotifications());

    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Get current active notifications
   */
  public getActiveNotifications(): NotificationEvent[] {
    return Array.from(this.activeNotifications.values());
  }

  /**
   * Set notification TTL (time to live)
   */
  public setNotificationTTL(milliseconds: number): void {
    this.notificationTTL = milliseconds;
  }

  /**
   * Clean up expired notifications
   */
  private cleanupExpiredNotifications(): void {
    const now = Date.now();
    let hasRemoved = false;

    for (const [key, notification] of this.activeNotifications.entries()) {
      if (now - notification.timestamp > this.notificationTTL) {
        this.activeNotifications.delete(key);
        hasRemoved = true;
      }
    }

    if (hasRemoved) {
      this.notifySubscribers();
    }
  }

  /**
   * Create a unique fingerprint for a notification (for deduplication)
   */
  private createFingerprint(message: string, type: NotificationType): string {
    return `${type}:${message}`;
  }

  /**
   * Generate unique notification ID
   */
  private generateId(): string {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Notify all subscribers of state changes
   */
  private notifySubscribers(): void {
    const notifications = this.getActiveNotifications();
    this.subscribers.forEach((subscriber) => subscriber(notifications));
  }
}

// Export singleton instance
export const NotificationManager = NotificationManagerService.getInstance();
