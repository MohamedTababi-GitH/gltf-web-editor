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
  private notificationTTL: number = 5000;

  private constructor() {
    setInterval(() => this.cleanupExpiredNotifications(), 1000);
  }

  public static getInstance(): NotificationManagerService {
    if (!NotificationManagerService.instance) {
      NotificationManagerService.instance = new NotificationManagerService();
    }
    return NotificationManagerService.instance;
  }

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

  public removeNotification(id: string): void {
    let keyToDelete: string | undefined;

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

  public subscribe(callback: NotificationSubscriber): () => void {
    this.subscribers.add(callback);
    callback(this.getActiveNotifications());

    return () => {
      this.subscribers.delete(callback);
    };
  }

  public getActiveNotifications(): NotificationEvent[] {
    return Array.from(this.activeNotifications.values());
  }

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

  private createFingerprint(message: string, type: NotificationType): string {
    return `${type}:${message}`;
  }

  private generateId(): string {
    const crypto = window.crypto;
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return `notification-${Date.now()}-${crypto.getRandomValues(array).toString().substring(2, 11)}`;
  }

  private notifySubscribers(): void {
    const notifications = this.getActiveNotifications();
    this.subscribers.forEach((subscriber) => subscriber(notifications));
  }
}

export const NotificationManager = NotificationManagerService.getInstance();
