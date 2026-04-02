import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  async function refreshNotifications() {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.get("/notifications?limit=12");
      setNotifications(data.notifications || []);
      setUnreadCount(Number(data.unreadCount || 0));
    } finally {
      setLoading(false);
    }
  }

  async function markNotificationRead(notificationId) {
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
  }

  async function markAllNotificationsRead() {
    if (!user) {
      return;
    }

    await api.patch("/notifications/read-all");
    setNotifications((current) => current.map((notification) => ({ ...notification, readAt: notification.readAt || new Date().toISOString() })));
    setUnreadCount(0);
  }

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
  }, [user]);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      refreshNotifications().catch(() => {});
    }, 45000);

    return () => window.clearInterval(interval);
  }, [user]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      refreshNotifications,
      markNotificationRead,
      markAllNotificationsRead
    }),
    [loading, notifications, unreadCount]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  return useContext(NotificationContext);
}
