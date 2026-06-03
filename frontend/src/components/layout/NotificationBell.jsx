import { Bell, CheckCheck, Inbox, ExternalLink } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useNotifications } from "../../context/NotificationContext";

function formatRelativeTime(value) {
  if (!value) {
    return "Just now";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  const diff = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const {
    notifications,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    browserAlertsEnabled,
    browserAlertPermission,
    enableBrowserAlerts,
    disableBrowserAlerts
  } = useNotifications();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const navigate = useNavigate();

  const latestNotifications = useMemo(() => notifications.slice(0, 5), [notifications]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function handleOpenNotification(notification) {
    if (notification?.link) {
      navigate(notification.link);
    }
    markNotificationRead(notification._id).catch(() => {});
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="glass-panel relative inline-flex h-9 min-w-[2.8rem] items-center justify-center rounded-full px-2.5 text-sm text-white sm:h-10 sm:min-w-[3rem] sm:px-3"
        aria-label="Notifications"
      >
        <Bell size={16} />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(24rem,calc(100vw-1.25rem))] overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">Notifications</p>
              <p className="text-xs text-slate-400">{unreadCount} unread</p>
            </div>
            <button
              type="button"
              onClick={() => {
                markAllNotificationsRead().catch(() => {});
              }}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white transition hover:bg-white/10"
            >
              <CheckCheck size={14} />
              Mark all read
            </button>
          </div>

          <div className="max-h-[24rem] overflow-y-auto p-2">
            {browserAlertPermission !== "unsupported" ? (
              <div className="mb-2 rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-left text-xs text-slate-300">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">Browser alerts</p>
                    <p className="mt-1 text-slate-400">
                      {browserAlertsEnabled ? "Enabled for new messages and updates." : "Enable browser alerts for live updates while the site is open."}
                    </p>
                  </div>
                  {browserAlertsEnabled ? (
                    <button
                      type="button"
                      onClick={disableBrowserAlerts}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-white"
                    >
                      Disable
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        enableBrowserAlerts().catch(() => {});
                      }}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-white"
                    >
                      Enable
                    </button>
                  )}
                </div>
              </div>
            ) : null}
            {latestNotifications.length ? (
              latestNotifications.map((notification) => {
                const unread = !notification.readAt;

                return (
                  <button
                    key={notification._id}
                    type="button"
                    onClick={() => handleOpenNotification(notification)}
                    className={`mb-2 w-full rounded-[22px] border px-4 py-3 text-left transition ${
                      unread ? "border-brand-400/30 bg-brand-500/10" : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{notification.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-300">{notification.message}</p>
                      </div>
                      {notification.link ? <ExternalLink size={14} className="shrink-0 text-slate-400" /> : null}
                    </div>
                    <div className="mt-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      {formatRelativeTime(notification.createdAt)}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-8 text-center text-slate-300">
                <Inbox size={22} className="mx-auto mb-2 text-slate-400" />
                No notifications yet
              </div>
            )}
          </div>

          <div className="border-t border-white/10 p-3">
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-white/10"
            >
              View all notifications
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
