import { createContext, useContext, useState, type ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import Notification from "../components/Notification";

interface NotificationContextType {
  showNotification: (
    message: string,
    type?: "success" | "error" | "info" | "warn",
  ) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<
    { id: number; message: string; type?: string }[]
  >([]);

  const showNotification = (
    message: string,
    type?: "success" | "error" | "info" | "warn",
  ) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <div className="fixed top-5 right-5 flex flex-col space-y-2 font-inter">
        <AnimatePresence>
          {notifications.map(({ id, message, type }) => (
            <Notification
              key={id}
              message={message}
              type={type as never}
              onClose={() =>
                setNotifications((prev) => prev.filter((n) => n.id !== id))
              }
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
