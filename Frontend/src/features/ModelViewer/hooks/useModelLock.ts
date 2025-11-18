import { useMutex } from "@/shared/hooks/useMutex.ts";
import { useEffect, useRef } from "react";
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
  const { showNotification } = useNotification();

  const IDLE_TIMEOUT_MS = 120000;
  const NOTIFICATION_BUFFER_MS = 30000;
  const INTERVAL_MS = 10000;

  const lastActivityRef = useRef<number>(Date.now());
  const hasInteractedRef = useRef<boolean>(false);
  const warningSentRef = useRef<boolean>(false);

  useEffect(() => {
    if (!id) return;

    const handleUserActivity = () => {
      hasInteractedRef.current = true;
    };

    const events = [
      "mousemove",
      "mouseup",
      "mousedown",
      "mouseleave",
      "mouseenter",
      "mouseout",
      "mouseover",
      "keydown",
      "pointerdown",
      "wheel",
      "touchmove",
      "touchstart",
      "touchend",
      "touchcancel",
    ];

    events.forEach((event) =>
      globalThis.addEventListener(event, handleUserActivity),
    );

    const idleCheckInterval = setInterval(async () => {
      const now = Date.now();

      if (hasInteractedRef.current) {
        lastActivityRef.current = now;
        hasInteractedRef.current = false;
        warningSentRef.current = false;

        await heartbeat(id);
        return;
      }

      const elapsedMs = now - lastActivityRef.current;
      const warningThresholdMs = IDLE_TIMEOUT_MS - NOTIFICATION_BUFFER_MS;

      if (elapsedMs >= IDLE_TIMEOUT_MS) {
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
        return;
      }

      if (elapsedMs >= warningThresholdMs && !warningSentRef.current) {
        showNotification("Still there? Session ends in 30 seconds.", "warn");
        warningSentRef.current = true;
      }
    }, INTERVAL_MS);

    return () => {
      events.forEach((event) =>
        globalThis.removeEventListener(event, handleUserActivity),
      );
      clearInterval(idleCheckInterval);
    };
  }, [
    id,
    heartbeat,
    unlockModel,
    setIsModelViewer,
    saveModel,
    canUndo,
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
