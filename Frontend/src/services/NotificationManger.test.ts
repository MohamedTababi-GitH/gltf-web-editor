import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NotificationManager } from "./NotificationManager";

describe("NotificationManagerService", () => {
  beforeEach(() => {
    NotificationManager["activeNotifications"].clear();
    NotificationManager["subscribers"].clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllTimers();
  });

  it("adds a new notification", () => {
    const subscriber = vi.fn();
    NotificationManager.subscribe(subscriber);
    NotificationManager.addNotification("Hello", "success");
    const notifications = NotificationManager.getActiveNotifications();
    expect(notifications).toHaveLength(1);
    expect(notifications[0].message).toBe("Hello");
    expect(notifications[0].type).toBe("success");
  });

  it("deduplicates notifications with same message and type", () => {
    NotificationManager.addNotification("Duplicate", "info");
    NotificationManager.addNotification("Duplicate", "info");
    expect(NotificationManager.getActiveNotifications()).toHaveLength(1);
  });

  it("removes notifications by ID", () => {
    const id = NotificationManager.addNotification("Remove me", "warn");
    NotificationManager.removeNotification(id);
    expect(NotificationManager.getActiveNotifications()).toHaveLength(0);
  });

  it("calls subscriber immediately and on updates", () => {
    const subscriber = vi.fn();
    const unsubscribe = NotificationManager.subscribe(subscriber);
    expect(subscriber).toHaveBeenCalledTimes(1);
    NotificationManager.addNotification("Ping", "info");
    expect(subscriber).toHaveBeenCalledTimes(2);
    unsubscribe();
    NotificationManager.addNotification("Another", "info");
    expect(subscriber).toHaveBeenCalledTimes(2);
  });

  it("cleans up expired notifications after TTL", () => {
    vi.spyOn(Date, "now").mockReturnValue(1000);
    NotificationManager.setNotificationTTL(5000);
    NotificationManager.addNotification("Temp", "success");

    expect(NotificationManager.getActiveNotifications()).toHaveLength(1);

    vi.spyOn(Date, "now").mockReturnValue(7001);

    NotificationManager["cleanupExpiredNotifications"]();

    expect(NotificationManager.getActiveNotifications()).toHaveLength(0);
  });
});
