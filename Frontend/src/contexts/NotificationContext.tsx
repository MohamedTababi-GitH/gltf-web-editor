import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence } from "framer-motion";
import Notification from "../layout/Notification.tsx";
import { NotificationManager } from "../services/NotificationManager";

type NotificationContextType = {
  showNotification: (
    message: string,
    type?: "success" | "error" | "info" | "warn",
  ) => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<
    { id: string; message: string; type: string }[]
  >([]);

  // Subscribe to notification manager updates
  useEffect(() => {
    const unsubscribe = NotificationManager.subscribe((notificationEvents) => {
      setNotifications(
        notificationEvents.map((event) => ({
          id: event.id,
          message: event.message,
          type: event.type,
        })),
      );
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  const showNotification = (
    message: string,
    type: "success" | "error" | "info" | "warn" = "info",
  ) => {
    // Delegate to notification manager service
    NotificationManager.addNotification(message, type);
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <div className="fixed top-[6dvh] right-5 flex flex-col space-y-2 font-inter z-[9999]">
        <AnimatePresence>
          {notifications.map(({ id, message, type }) => (
            <Notification
              key={id}
              message={message}
              type={type as "success" | "error" | "info" | "warn"}
              onClose={() => NotificationManager.removeNotification(id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context)
    throw new Error("useNotification must be used within NotificationProvider");
  return context;
};
