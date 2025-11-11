import { useMutex } from "@/shared/hooks/useMutex.ts";
import { useEffect } from "react";
import { useNavigation } from "@/shared/contexts/NavigationContext.tsx";
import { formatDateTime } from "@/shared/utils/DateTime.ts";
import { useNotification } from "@/shared/contexts/NotificationContext.tsx";

type ModelLockProps = {
  saveModel: (version?: string) => void;
  id: string | undefined;
  canUndo: boolean;
};

export const useModelLock = ({ id, saveModel, canUndo }: ModelLockProps) => {
  const { heartbeat, unlockModel } = useMutex();
  const { setIsModelViewer } = useNavigation();
  const idleTimeout = 120000;
  const notificationCheckTime = 30000;
  const { showNotification } = useNotification();

  useEffect(() => {
    if (!id) return;

    let lastActivity = Date.now();
    const resetTimer = () => (lastActivity = Date.now());
    let interactionCount = 0;

    const incrementInteractionCount = () => {
      interactionCount += 1;
    };

    globalThis.addEventListener("mousemove", incrementInteractionCount);
    globalThis.addEventListener("keydown", incrementInteractionCount);
    globalThis.addEventListener("pointerdown", incrementInteractionCount);
    globalThis.addEventListener("wheel", incrementInteractionCount);
    globalThis.addEventListener("touchmove", incrementInteractionCount);

    const idleCheckInterval = setInterval(async () => {
      const interacted = interactionCount > 0;
      interactionCount = 0;

      if (interacted) {
        await heartbeat(id);
        resetTimer();
        return;
      }

      const idleTime = Date.now() - lastActivity;
      const idleTimeInSeconds = Math.round(idleTime / 1000);
      const notificationTimeInSeconds =
        (idleTimeout - notificationCheckTime) / 1000;
      const isNotificationTime =
        idleTimeInSeconds === notificationTimeInSeconds;
      if (isNotificationTime) {
        showNotification("Still there? Session ends in 30 seconds.", "warn");
      }
      if (idleTime > idleTimeout) {
        try {
          if (canUndo) {
            const versionName = `AutoSave at ${
              formatDateTime(new Date().toISOString()).timeStr
            }`;
            saveModel(versionName);
          }

          await unlockModel(id);
          setIsModelViewer(false);
        } catch (err) {
          console.error("Error during auto-save/unlock:", err);
        } finally {
          clearInterval(idleCheckInterval);
        }
      }
    }, 10000);

    return () => {
      globalThis.removeEventListener("mousemove", resetTimer);
      globalThis.removeEventListener("keydown", resetTimer);
      globalThis.removeEventListener("pointerdown", resetTimer);
      globalThis.removeEventListener("wheel", resetTimer);
      globalThis.removeEventListener("touchmove", resetTimer);
      clearInterval(idleCheckInterval);
    };
  }, [
    id,
    heartbeat,
    unlockModel,
    setIsModelViewer,
    saveModel,
    canUndo,
    idleTimeout,
    showNotification,
  ]);

  useEffect(() => {
    if (!id) return;
    const handleUnload = async () => {
      await unlockModel(id);
    };
    globalThis.addEventListener("beforeunload", handleUnload);
    return () => {
      globalThis.removeEventListener("beforeunload", handleUnload);
    };
  }, [id, unlockModel]);
};
