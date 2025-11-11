import { useMutex } from "@/shared/hooks/useMutex.ts";
import { useEffect } from "react";
import { useNavigation } from "@/shared/contexts/NavigationContext.tsx";
import { formatDateTime } from "@/shared/utils/DateTime.ts";

type ModelLockProps = {
  saveModel: (version?: string) => void;
  id: string | undefined;
  canUndo: boolean;
};

export const useModelLock = ({ id, saveModel, canUndo }: ModelLockProps) => {
  const { heartbeat, unlockModel } = useMutex();
  const { setIsModelViewer } = useNavigation();
  //const heartbeatDuration = 90000;
  const idleTimeout = 120000;

  useEffect(() => {
    if (!id) return;

    const interval = setInterval(async () => {
      await heartbeat(id);
    }, heartbeatDuration);
    return () => clearInterval(interval);
  }, [id, heartbeat]);

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

    const checkIdle = setInterval(async () => {
      const idleTime = Date.now() - lastActivity;

      if (idleTime > idleTimeout) {
        if (canUndo) {
          const versionName = `AutoSave at ${formatDateTime(new Date().toISOString()).timeStr}`;
          saveModel(versionName);
        }
        await unlockModel(id);
        setIsModelViewer(false);
        clearInterval(checkIdle);
      }
    }, 10000);

    return () => {
      globalThis.removeEventListener("mousemove", resetTimer);
      globalThis.removeEventListener("keydown", resetTimer);
      globalThis.removeEventListener("pointerdown", resetTimer);
      globalThis.removeEventListener("wheel", resetTimer);
      globalThis.removeEventListener("touchmove", resetTimer);
      clearInterval(checkIdle);
    };
  }, [id, unlockModel, setIsModelViewer, idleTimeout, saveModel, canUndo]);

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
