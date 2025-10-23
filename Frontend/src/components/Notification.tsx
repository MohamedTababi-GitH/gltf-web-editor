import React, { useEffect } from "react";
import { motion } from "framer-motion";
import {
  X,
  CircleCheck,
  AlertTriangle,
  Info,
  TriangleAlert,
} from "lucide-react";

// Define the props for the Notification component
interface NotificationProps {
  message: string;
  type?: "success" | "error" | "info" | "warn";
  onClose: () => void;
}

// A configuration object to map notification types to their specific icons and styles.
const notificationConfig = {
  success: {
    Icon: CircleCheck,
    iconClass: "text-emerald-500",
  },
  error: {
    Icon: AlertTriangle, // Using a more appropriate icon for errors
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

/**
 * A sleek, animated notification component that displays success, error, or info messages.
 */
const Notification: React.FC<NotificationProps> = ({
  message,
  type = "info",
  onClose,
}) => {
  // Set a timer to automatically close the notification after 5 seconds.
  useEffect(() => {
    const timer = setTimeout(onClose, 5000); // Auto-dismiss after 5s
    return () => clearTimeout(timer);
  }, [onClose]);

  // Get the correct Icon component and class string based on the notification type.
  const { Icon, iconClass } = notificationConfig[type];

  return (
    <motion.div
      // Animation properties from framer-motion for a smooth entrance and exit.
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      // Base classes for the notification container
      className="w-full bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-700 shadow-lg"
    >
      <div className="flex items-start gap-3 p-4">
        {/* Icon for the notification type */}
        <Icon
          className={`h-5 w-5 flex-shrink-0 ${iconClass}`}
          aria-hidden="true"
        />

        {/* Notification message */}
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {message}
          </p>
        </div>

        {/* Close button */}
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
