import { Bell, CheckCheck, ExternalLink, Filter, Inbox } from "lucide-react";
import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import { useNotifications } from "../../context/NotificationContext";

const PAGE_SIZE = 8;

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "read", label: "Read" }
];

const CATEGORY_FILTERS = [
  { key: "all", label: "All types" },
  { key: "order", label: "Orders" },
  { key: "installment", label: "Installments" },
  { key: "refund", label: "Refunds" },
  { key: "seller", label: "Seller" },
  { key: "payout", label: "Payouts" },
  { key: "system", label: "System" }
];

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

function getNotificationCategory(type = "") {
  const normalized = String(type).toLowerCase();

  if (normalized.startsWith("installment_")) {
    return "installment";
  }

  if (normalized.startsWith("refund_")) {
    return "refund";
  }

  if (normalized.startsWith("seller_payout_")) {
    return "payout";
  }

  if (normalized.startsWith("seller_")) {
    return "seller";
  }

  if (normalized.startsWith("order_")) {
    return "order";
  }

  if (normalized.startsWith("system_") || normalized.startsWith("account_") || normalized.startsWith("auth_")) {
    return "system";
  }

  return "system";
}

function getActionLabel(notification) {
  const category = getNotificationCategory(notification.type);

  if (notification.link) {
    if (category === "order") {
      return "View order";
    }
    if (category === "installment") {
      return "Open installment";
    }
    if (category === "refund") {
      return "Open refund";
    }
    if (category === "seller") {
      return "Review seller";
    }
    if (category === "payout") {
      return "Review payout";
    }
    return "Open details";
  }

  if (category === "installment") {
    return "Open installment";
  }
  if (category === "seller") {
    return "Open seller";
  }
  if (category === "payout") {
    return "Open payout";
  }
  if (category === "refund") {
    return "Open refund";
  }
  if (category === "order") {
    return "Open order";
  }

  return "Open";
}

function getCategoryLabel(category) {
  return CATEGORY_FILTERS.find((option) => option.key === category)?.label || "All types";
}

function getStatusLabel(status) {
  return STATUS_FILTERS.find((option) => option.key === status)?.label || "All";
}

export default function NotificationsPage() {
  const { unreadCount: liveUnreadCount, refreshNotifications, markNotificationRead, markAllNotificationsRead } = useNotifications();
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [lastLoadedPage, setLastLoadedPage] = useState(1);

  const unreadCount = useMemo(() => {
    return notifications.filter((notification) => !notification.readAt).length;
  }, [notifications]);

  const visibleNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      if (statusFilter === "unread" && notification.readAt) {
        return false;
      }

      if (statusFilter === "read" && !notification.readAt) {
        return false;
      }

      if (categoryFilter !== "all" && getNotificationCategory(notification.type) !== categoryFilter) {
        return false;
      }

      return true;
    });
  }, [categoryFilter, notifications, statusFilter]);

  const loadNotifications = useCallback(
    async ({ nextPage = 1, replace = false } = {}) => {
      setLoading(true);
      try {
        const { data } = await api.get("/notifications", {
          params: {
            page: nextPage,
            limit: PAGE_SIZE
          }
        });

        setHasMore(Boolean(data.hasMore));
        setTotalCount(Number(data.total || 0));
        setLastLoadedPage(Number(data.page || nextPage));
        setNotifications((current) => {
          if (replace || nextPage === 1) {
            return data.notifications || [];
          }

          const existingIds = new Set(current.map((notification) => notification._id));
          const nextItems = (data.notifications || []).filter((notification) => !existingIds.has(notification._id));
          return [...current, ...nextItems];
        });
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadNotifications({ nextPage: 1, replace: true }).catch(() => {
      setNotifications([]);
      setHasMore(false);
      setLoading(false);
    });
  }, [loadNotifications]);

  const reloadCurrent = async () => {
    await loadNotifications({ nextPage: lastLoadedPage, replace: true });
    await refreshNotifications().catch(() => {});
  };

  const handleLoadMore = async () => {
    const nextPage = lastLoadedPage + 1;
    await loadNotifications({ nextPage, replace: false });
    setPage(nextPage);
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    await reloadCurrent();
  };

  const handleMarkRead = async (notificationId) => {
    await markNotificationRead(notificationId);
    await reloadCurrent();
  };

  const hasFilteredResults = visibleNotifications.length > 0;

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
          onClick={() => {
            handleMarkAllRead().catch(() => {});
          }}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          <CheckCheck size={16} />
          Mark all read
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Unread</p>
          <p className="mt-2 text-3xl font-semibold text-white">{Math.max(unreadCount, liveUnreadCount || 0)}</p>
        </div>
        <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Total</p>
          <p className="mt-2 text-3xl font-semibold text-white">{totalCount}</p>
        </div>
        <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Archive</p>
          <p className="mt-2 text-3xl font-semibold text-white">{Math.max(0, totalCount - notifications.length)}</p>
        </div>
        <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Feed</p>
          <p className="mt-2 text-sm text-slate-200">Latest {PAGE_SIZE} per page with older history below.</p>
        </div>
      </div>

      <div className="space-y-3 rounded-[28px] border border-white/10 bg-white/5 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs uppercase tracking-[0.2em] text-slate-400">
            <Filter size={13} />
            Filter by status
          </div>
          {STATUS_FILTERS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => {
                setStatusFilter(option.key);
                setPage(1);
              }}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                statusFilter === option.key ? "border-brand-400/40 bg-brand-500/20 text-white" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs uppercase tracking-[0.2em] text-slate-400">
            <Bell size={13} />
            Filter by category
          </div>
          {CATEGORY_FILTERS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => {
                setCategoryFilter(option.key);
                setPage(1);
              }}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                categoryFilter === option.key ? "border-brand-400/40 bg-brand-500/20 text-white" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <p className="text-sm text-slate-300">
            Showing <span className="font-semibold text-white">{visibleNotifications.length}</span> notification{visibleNotifications.length === 1 ? "" : "s"} from <span className="font-semibold text-white">{getStatusLabel(statusFilter)}</span>
            {" "}and <span className="font-semibold text-white">{getCategoryLabel(categoryFilter)}</span>.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setStatusFilter("all");
                setCategoryFilter("all");
                setPage(1);
              }}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
            >
              Reset filters
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {loading && !notifications.length ? (
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 text-slate-300">Loading notifications...</div>
        ) : hasFilteredResults ? (
          visibleNotifications.map((notification) => {
            const unread = !notification.readAt;
            const actionLabel = getActionLabel(notification);

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
                  <div className="flex flex-wrap items-center gap-2">
                    {notification.link ? (
                      <Link
                        to={notification.link}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10"
                        onClick={() => handleMarkRead(notification._id).catch(() => {})}
                      >
                        {actionLabel}
                        <ExternalLink size={14} />
                      </Link>
                    ) : null}
                    {unread ? (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(notification._id).catch(() => {})}
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
                  {notification.data?.reference ? <span>• {notification.data.reference}</span> : null}
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-400">
          {hasMore ? "More older history is available in the archive." : "You are all caught up."}
        </p>
        {hasMore ? (
          <button
            type="button"
            onClick={() => {
              const nextPage = page + 1;
              setPage(nextPage);
              loadNotifications({ nextPage, replace: false }).catch(() => {});
            }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
          >
            Load older notifications
          </button>
        ) : null}
      </div>
    </section>
  );
}

