import { useMutex } from "@/shared/hooks/useMutex.ts";
import { useEffect } from "react";
import { useNavigation } from "@/shared/contexts/NavigationContext.tsx";

export const useModelLock = (id: string | undefined) => {
  const { heartbeat, unlockModel } = useMutex();
  const { setIsModelViewer } = useNavigation();
  const heartbeatDuration = 90000;
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

    globalThis.addEventListener("mousemove", resetTimer);
    globalThis.addEventListener("keydown", resetTimer);
    globalThis.addEventListener("pointerdown", resetTimer);
    globalThis.addEventListener("wheel", resetTimer);
    globalThis.addEventListener("touchmove", resetTimer);

    const checkIdle = setInterval(async () => {
      const idleTime = Date.now() - lastActivity;

      if (idleTime > idleTimeout) {
        await unlockModel(id);
        setIsModelViewer(false);
        clearInterval(checkIdle);
      }
    }, 30000);

    return () => {
      globalThis.removeEventListener("mousemove", resetTimer);
      globalThis.removeEventListener("keydown", resetTimer);
      globalThis.removeEventListener("pointerdown", resetTimer);
      globalThis.removeEventListener("wheel", resetTimer);
      globalThis.removeEventListener("touchmove", resetTimer);
      clearInterval(checkIdle);
    };
  }, [id, unlockModel, setIsModelViewer, idleTimeout]);

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
