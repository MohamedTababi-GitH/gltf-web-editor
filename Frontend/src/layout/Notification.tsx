import React, { useEffect } from "react";
import { motion } from "framer-motion";
import {
  X,
  CircleCheck,
  AlertTriangle,
  Info,
  TriangleAlert,
} from "lucide-react";

type NotificationProps = {
  message: string;
  type?: "success" | "error" | "info" | "warn";
  onClose: () => void;
};

const notificationConfig = {
  success: {
    Icon: CircleCheck,
    iconClass: "text-emerald-500",
  },
  error: {
    Icon: AlertTriangle,
    iconClass: "text-red-500",
  },
  info: {
    Icon: Info,
    iconClass: "text-blue-500",
  },
  warn: {
    Icon: TriangleAlert,
    iconClass: "text-yellow-500",
  },
};

const Notification: React.FC<NotificationProps> = ({
  message,
  type = "info",
  onClose,
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const { Icon, iconClass } = notificationConfig[type];

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="w-full bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-700 shadow-lg"
    >
      <div className="flex items-start gap-3 p-4">
        <Icon
          className={`h-5 w-5 flex-shrink-0 ${iconClass}`}
          aria-hidden="true"
        />

        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {message}
          </p>
        </div>

        <button
          onClick={onClose}
          aria-label="Close notification"
          className="group -my-1.5 -me-1.5 p-1.5 inline-flex items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900 focus:ring-blue-500"
        >
          <X size={18} className="transition-opacity group-hover:opacity-100" />
        </button>
      </div>
    </motion.div>
  );
};

export default Notification;
