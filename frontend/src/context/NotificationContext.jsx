import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import api from "../api/client";
import { useAuth } from "./AuthContext";
import { startRealtimeClient, stopRealtimeClient, subscribeRealtime } from "../services/realtimeClient";

const NotificationContext = createContext(null);
const BROWSER_ALERTS_KEY = "shopverse-browser-alerts";

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const userIdentifier = user?.id || user?._id || "";
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [browserAlertsEnabled, setBrowserAlertsEnabled] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(BROWSER_ALERTS_KEY) === "enabled";
  });
  const [browserAlertPermission, setBrowserAlertPermission] = useState(() => {
    if (typeof window === "undefined" || typeof window.Notification === "undefined") {
      return "unsupported";
    }

    return window.Notification.permission;
  });
  const knownNotificationIdsRef = useRef(new Set());
  const initializedRef = useRef(false);

  const showBrowserAlerts = useCallback((items = []) => {
    if (
      typeof window === "undefined"
      || typeof window.Notification === "undefined"
      || browserAlertPermission !== "granted"
      || !browserAlertsEnabled
    ) {
      return;
    }

    items.forEach((notification) => {
      if (document.visibilityState === "visible") {
        return;
      }

      const browserNotification = new window.Notification(notification.title || "Shopverse notification", {
        body: notification.message || "",
        tag: notification._id,
        silent: false
      });

      browserNotification.onclick = () => {
        window.focus();
        if (notification.link) {
          window.location.assign(notification.link);
        }
      };
    });
  }, [browserAlertPermission, browserAlertsEnabled]);

  const refreshNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      knownNotificationIdsRef.current = new Set();
      initializedRef.current = false;
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.get("/notifications?limit=12");
      const nextNotifications = data.notifications || [];
      const newItems = nextNotifications.filter((notification) => !knownNotificationIdsRef.current.has(notification._id) && !notification.readAt);

      setNotifications(nextNotifications);
      setUnreadCount(Number(data.unreadCount || 0));
      if (initializedRef.current && newItems.length) {
        showBrowserAlerts(newItems);
      }
      knownNotificationIdsRef.current = new Set(nextNotifications.map((notification) => notification._id));
      initializedRef.current = true;
    } finally {
      setLoading(false);
    }
  }, [showBrowserAlerts, userIdentifier]);

  const markNotificationRead = useCallback(async (notificationId) => {
    if (!notificationId) {
      return;
    }

    const { data } = await api.patch(`/notifications/${notificationId}/read`);
    const readId = data.notification?._id || notificationId;

    setNotifications((current) =>
      current.map((notification) =>
        notification._id === readId ? { ...notification, readAt: notification.readAt || new Date().toISOString() } : notification
      )
    );
    setUnreadCount((current) => Math.max(0, current - 1));
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    if (!user) {
      return;
    }

    await api.patch("/notifications/read-all");
    setNotifications((current) => current.map((notification) => ({ ...notification, readAt: notification.readAt || new Date().toISOString() })));
    setUnreadCount(0);
  }, [user]);

  const enableBrowserAlerts = useCallback(async () => {
    if (typeof window === "undefined" || typeof window.Notification === "undefined") {
      return false;
    }

    const permission = await window.Notification.requestPermission();
    setBrowserAlertPermission(permission);

    if (permission === "granted") {
      window.localStorage.setItem(BROWSER_ALERTS_KEY, "enabled");
      setBrowserAlertsEnabled(true);
      return true;
    }

    return false;
  }, []);

  const disableBrowserAlerts = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(BROWSER_ALERTS_KEY, "disabled");
    }
    setBrowserAlertsEnabled(false);
  }, []);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    refreshNotifications().catch(() => {
      setNotifications([]);
      setUnreadCount(0);
    });
  }, [userIdentifier, refreshNotifications]);

  useEffect(() => {
    if (!user) {
      stopRealtimeClient();
      return undefined;
    }

    const token = window.localStorage.getItem("shopverse-token");
    startRealtimeClient(token);

    return () => {
      stopRealtimeClient();
    };
  }, [userIdentifier]);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    const unsubscribe = subscribeRealtime(({ type, payload }) => {
      if (type !== "notification.created" || !payload?.notification?._id) {
        return;
      }

      const nextNotification = payload.notification;
      const isUnread = !nextNotification.readAt;

      setNotifications((current) => {
        const existing = current.filter((notification) => notification._id !== nextNotification._id);
        return [nextNotification, ...existing].sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());
      });

      if (isUnread) {
        setUnreadCount((current) => current + 1);
      }

      knownNotificationIdsRef.current.add(nextNotification._id);
      initializedRef.current = true;

      if (isUnread) {
        showBrowserAlerts([nextNotification]);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [showBrowserAlerts, userIdentifier]);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      refreshNotifications().catch(() => {});
    }, 45000);

    return () => window.clearInterval(interval);
  }, [userIdentifier, refreshNotifications]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      browserAlertsEnabled,
      browserAlertPermission,
      refreshNotifications,
      markNotificationRead,
      markAllNotificationsRead,
      enableBrowserAlerts,
      disableBrowserAlerts
    }),
    [
      browserAlertPermission,
      browserAlertsEnabled,
      loading,
      notifications,
      unreadCount,
      refreshNotifications,
      markNotificationRead,
      markAllNotificationsRead,
      enableBrowserAlerts,
      disableBrowserAlerts
    ]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  return useContext(NotificationContext);
}
