import { Bell, CheckCheck, ExternalLink, Inbox } from "lucide-react";
import { Link } from "react-router-dom";
import { useNotifications } from "../../context/NotificationContext";
import { useEffect } from "react";

function formatTime(value) {
  if (!value) {
    return "Just now";
  }

  const time = new Date(value);
  if (Number.isNaN(time.getTime())) {
    return "Just now";
  }

  return time.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export default function NotificationsPage() {
  const { notifications, unreadCount, loading, refreshNotifications, markNotificationRead, markAllNotificationsRead } = useNotifications();

  useEffect(() => {
    refreshNotifications().catch(() => {});
  }, [refreshNotifications]);

  return (
    <section className="section-card space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="section-eyebrow">Notifications</p>
          <h1 className="section-title mt-2">Your latest alerts</h1>
          <p className="section-description mt-3">Order updates, seller actions, appeals, and other account activity will show up here.</p>
        </div>
        <button
          type="button"
          onClick={markAllNotificationsRead}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          <CheckCheck size={16} />
          Mark all read
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Unread</p>
          <p className="mt-2 text-3xl font-semibold text-white">{unreadCount}</p>
        </div>
        <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Total</p>
          <p className="mt-2 text-3xl font-semibold text-white">{notifications.length}</p>
        </div>
        <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Live feed</p>
          <p className="mt-2 text-sm text-slate-200">Auto-refreshes every 45 seconds while you are signed in.</p>
        </div>
      </div>

      <div className="space-y-3">
        {loading && !notifications.length ? (
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 text-slate-300">Loading notifications...</div>
        ) : notifications.length ? (
          notifications.map((notification) => {
            const unread = !notification.readAt;

            return (
              <article
                key={notification._id}
                className={`rounded-[28px] border p-5 transition ${unread ? "border-brand-400/30 bg-brand-500/10" : "border-white/10 bg-white/5"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-slate-400">
                      <Bell size={14} className={unread ? "text-brand-300" : "text-slate-500"} />
                      {notification.type?.replaceAll("_", " ") || "Notification"}
                    </div>
                    <h2 className="text-lg font-semibold text-white">{notification.title}</h2>
                    <p className="max-w-3xl text-sm text-slate-200/90">{notification.message}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {notification.link ? (
                      <Link
                        to={notification.link}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10"
                        onClick={() => markNotificationRead(notification._id).catch(() => {})}
                      >
                        Open
                        <ExternalLink size={14} />
                      </Link>
                    ) : null}
                    {unread ? (
                      <button
                        type="button"
                        onClick={() => markNotificationRead(notification._id).catch(() => {})}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/10"
                      >
                        Mark read
                      </button>
                    ) : (
                      <span className="rounded-full border border-white/10 px-3 py-2 text-sm text-slate-400">Read</span>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span>{formatTime(notification.createdAt)}</span>
                  {notification.readAt ? <span>• Read</span> : <span>• Unread</span>}
                  {notification.data?.orderNumber ? <span>• Order {notification.data.orderNumber}</span> : null}
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-8 text-center text-slate-300">
            <Inbox size={28} className="mx-auto mb-3 text-slate-400" />
            No notifications yet. When orders, appeals, or seller actions happen, they will appear here.
          </div>
        )}
      </div>
    </section>
  );
}
