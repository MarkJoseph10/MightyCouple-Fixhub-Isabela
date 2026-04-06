import { useLocation, useSearchParams } from "react-router-dom";
import { AlertTriangle, Bell, Inbox, LoaderCircle, Mail, MessageSquare, Paperclip, Search, Send, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/client";
import ChatConversationProductCard from "../../components/common/ChatConversationProductCard";
import ChatMessageAttachments from "../../components/common/ChatMessageAttachments";
import ChatPendingAttachments from "../../components/common/ChatPendingAttachments";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import { useNotifications } from "../../context/NotificationContext";

const customerQuickReplies = [
  "Available pa po ba ito?",
  "Pwede COD?",
  "Magkano po shipping?",
  "Kailan po ito mashi-ship?"
];

const sellerQuickReplies = [
  "Available pa po ito.",
  "On-hand stock po ito.",
  "Pwede po COD depende sa location.",
  "Iche-check ko po ang update ng order ninyo."
];

const adminQuickReplies = [
  "We are reviewing this now.",
  "This is now escalated for admin handling.",
  "Please wait while we verify the details.",
  "Thank you. We updated the thread."
];

const FILTER_OPTIONS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "needsReply", label: "Needs reply" },
  { key: "order", label: "Order chat" },
  { key: "repair", label: "Repair chat" },
  { key: "product", label: "Product chat" },
  { key: "attachments", label: "With attachment" },
  { key: "escalated", label: "Escalated" },
  { key: "reported", label: "Reported" },
  { key: "blocked", label: "Blocked" },
  { key: "resolved", label: "Resolved" }
];

function formatMessageTime(value) {
  if (!value) {
    return "Just now";
  }

  return new Date(value).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function getPageCopy(user, pathname) {
  if (pathname.startsWith("/admin")) {
    return {
      eyebrow: "Marketplace chat",
      title: "Admin conversation oversight",
      description: "Monitor customer-to-seller chats, step in when needed, and keep a clean record of product and order inquiries."
    };
  }

  if (pathname.startsWith("/seller")) {
    return {
      eyebrow: "Seller inbox",
      title: "Customer product and order inquiries",
      description: "Reply to shoppers, monitor escalations, and keep all item or order conversations organized in one place."
    };
  }

  if (user?.role === "seller") {
    return {
      eyebrow: "Messages",
      title: "Conversation center",
      description: "Review your linked conversations and continue product or order discussions from one place."
    };
  }

  return {
    eyebrow: "Messages",
    title: "Your chat inbox",
    description: "Each product or order inquiry stays linked to its original context so you and the seller can continue without losing track."
  };
}

function getStatusCopy(status = "") {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "waiting_seller") {
    return "Waiting for seller reply";
  }
  if (normalized === "waiting_admin") {
    return "Waiting for admin review";
  }
  if (normalized === "waiting_customer") {
    return "Waiting for customer reply";
  }
  if (normalized === "blocked") {
    return "Blocked";
  }
  if (normalized === "resolved") {
    return "Resolved";
  }

  return "Open";
}

function getQuickReplies(user) {
  if (user?.role === "admin") {
    return adminQuickReplies;
  }

  if (user?.role === "seller") {
    return sellerQuickReplies;
  }

  return customerQuickReplies;
}

function buildConversationQuery(filterKey, searchValue, orderId, repairId) {
  const query = {
    q: searchValue || ""
  };

  if (orderId) {
    query.orderId = orderId;
  }

  if (repairId) {
    query.repairId = repairId;
  }

  if (filterKey === "unread") {
    query.unreadOnly = true;
  } else if (filterKey === "needsReply") {
    query.needsReply = true;
  } else if (filterKey === "order") {
    query.contextType = "order";
  } else if (filterKey === "repair") {
    query.contextType = "repair";
  } else if (filterKey === "product") {
    query.contextType = "product";
  } else if (filterKey === "attachments") {
    query.withAttachments = true;
  } else if (filterKey === "escalated") {
    query.escalatedOnly = true;
  } else if (filterKey === "reported") {
    query.reportedOnly = true;
  } else if (filterKey === "blocked") {
    query.status = "blocked";
  } else if (filterKey === "resolved") {
    query.status = "resolved";
  }

  return query;
}

export default function MessagesPage() {
  const location = useLocation();
  const { user, setUserData } = useAuth();
  const {
    conversations,
    activeConversation,
    loadingConversations,
    realtimeConnected,
    sending,
    error,
    refreshConversations,
    loadConversation,
    sendMessage,
    updateTyping,
    escalateConversation,
    reportConversation,
    blockConversation,
    unblockConversation,
    resolveConversation
  } = useChat();
  const {
    browserAlertsEnabled,
    browserAlertPermission,
    enableBrowserAlerts,
    disableBrowserAlerts
  } = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();
  const [draft, setDraft] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [filterKey, setFilterKey] = useState("all");
  const [actionMessage, setActionMessage] = useState("");
  const [actionPending, setActionPending] = useState("");
  const [updatingAlertPrefs, setUpdatingAlertPrefs] = useState(false);
  const fileInputRef = useRef(null);

  const copy = useMemo(() => getPageCopy(user, location.pathname), [location.pathname, user]);
  const selectedConversationId = searchParams.get("conversation") || "";
  const incomingOrderId = searchParams.get("orderId") || "";
  const incomingRepairId = searchParams.get("repairId") || "";
  const quickReplies = useMemo(() => getQuickReplies(user), [user]);
  const activeTypingLabel = activeConversation?.typingParticipants?.[0]?.label || "";
  const contextActionTo = activeConversation?.contextType === "repair"
    ? location.pathname.startsWith("/admin")
      ? `/admin/repairs?repair=${activeConversation.repairRequest?._id || ""}`
      : location.pathname.startsWith("/seller")
        ? `/seller/repairs?repair=${activeConversation.repairRequest?._id || ""}`
        : `/repairs?repair=${activeConversation.repairRequest?._id || ""}`
    : activeConversation?.contextType === "order"
      ? location.pathname.startsWith("/admin")
        ? "/admin/orders"
        : location.pathname.startsWith("/seller")
          ? "/seller/orders"
          : "/orders"
      : activeConversation?.product?.slug
        ? `/product/${activeConversation.product.slug}`
        : "";

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refreshConversations(buildConversationQuery(filterKey, searchValue, incomingOrderId, incomingRepairId)).catch(() => {});
    }, 220);

    return () => window.clearTimeout(timer);
  }, [filterKey, incomingOrderId, incomingRepairId, refreshConversations, searchValue]);

  useEffect(() => {
    if (!selectedConversationId && conversations.length) {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.set("conversation", conversations[0]._id);
        return next;
      }, { replace: true });
      return;
    }

    if (selectedConversationId && activeConversation?._id !== selectedConversationId) {
      loadConversation(selectedConversationId).catch(() => {});
    }
  }, [activeConversation?._id, conversations, loadConversation, selectedConversationId, setSearchParams]);

  useEffect(() => {
    return () => {
      refreshConversations({}).catch(() => {});
    };
  }, [refreshConversations]);

  useEffect(() => {
    setDraft("");
    setSelectedFiles([]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [selectedConversationId]);

  useEffect(() => {
    if (!activeConversation?._id) {
      return undefined;
    }

    const shouldType = Boolean(draft.trim()) || selectedFiles.length > 0;
    const timer = window.setTimeout(() => {
      updateTyping(activeConversation._id, shouldType).catch(() => {});
    }, 250);

    return () => window.clearTimeout(timer);
  }, [activeConversation?._id, draft, selectedFiles.length, updateTyping]);

  return (
    <section className="space-y-6 pb-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{copy.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">{copy.title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{copy.description}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className={`rounded-full border px-3 py-2 text-xs ${realtimeConnected ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100" : "border-amber-400/30 bg-amber-500/10 text-amber-100"}`}>
            {realtimeConnected ? "Realtime live" : "Realtime reconnecting"}
          </div>
          <button
            type="button"
            onClick={() => {
              if (browserAlertsEnabled) {
                disableBrowserAlerts();
                return;
              }

              enableBrowserAlerts().catch(() => {});
            }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 transition hover:bg-white/10"
          >
            <Bell size={13} />
            {browserAlertsEnabled ? "Browser alerts on" : browserAlertPermission === "unsupported" ? "Browser alerts unavailable" : "Enable browser alerts"}
          </button>
          <button
            type="button"
            disabled={updatingAlertPrefs}
            onClick={async () => {
              if (!user) {
                return;
              }

              setUpdatingAlertPrefs(true);

              try {
                const nextEnabled = user.chatPreferences?.emailAlertsEnabled === false;
                const { data } = await api.patch("/users/me/chat-preferences", {
                  emailAlertsEnabled: nextEnabled
                });

                setUserData({
                  ...user,
                  chatPreferences: {
                    ...(user.chatPreferences || {}),
                    ...(data.chatPreferences || {}),
                    emailAlertsEnabled: data.chatPreferences?.emailAlertsEnabled !== false
                  }
                });
              } finally {
                setUpdatingAlertPrefs(false);
              }
            }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Mail size={13} />
            {user?.chatPreferences?.emailAlertsEnabled === false ? "Email alerts off" : "Email alerts on"}
          </button>
          <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
            {conversations.length} conversation{conversations.length === 1 ? "" : "s"} visible
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="glass-panel rounded-[32px] p-4 shadow-ambient">
          <div className="space-y-4 border-b border-white/10 px-2 pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Inbox list</p>
                <p className="mt-1 text-sm text-slate-300">Latest conversations first</p>
              </div>
              {loadingConversations ? <LoaderCircle size={16} className="animate-spin text-slate-400" /> : null}
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <Search size={15} className="text-slate-400" />
              <input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search conversations"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setFilterKey(option.key)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    filterKey === option.key ? "border-brand-400/40 bg-brand-500/15 text-white" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {conversations.length ? (
              conversations.map((conversation) => {
                const isActive = selectedConversationId === conversation._id;
                const conversationTitle = conversation.contextType === "repair"
                  ? conversation.repairRequest?.title || conversation.repairRequest?.requestNumber || conversation.subject || "Repair conversation"
                  : conversation.order?.orderNumber || conversation.product?.name || conversation.subject || "Conversation";
                const peerLabel = user?.role === "customer"
                  ? `${conversation.seller?.storeName || conversation.seller?.name || "Store support"} • ${conversation.seller?.presence?.label || "Offline"}`
                  : (conversation.customer?.name || conversation.customer?.email || "Customer");

                return (
                  <button
                    key={conversation._id}
                    type="button"
                    onClick={() => {
                      setSearchParams((current) => {
                        const next = new URLSearchParams(current);
                        next.set("conversation", conversation._id);
                        return next;
                      });
                    }}
                    className={`w-full rounded-[26px] border p-4 text-left transition ${
                      isActive ? "border-brand-400/40 bg-brand-500/15" : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-white">{conversationTitle}</p>
                          {conversation.contextType === "order" ? (
                            <span className="rounded-full bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-100">Order</span>
                          ) : conversation.contextType === "repair" ? (
                            <span className="rounded-full bg-violet-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-100">Repair</span>
                          ) : null}
                          {conversation.isEscalated ? (
                            <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-100">Escalated</span>
                          ) : null}
                        </div>
                        <p className="mt-1 truncate text-xs text-slate-400">{peerLabel}</p>
                      </div>
                      {conversation.unreadCount ? (
                        <span className="rounded-full bg-brand-500 px-2 py-1 text-[11px] font-semibold text-white">
                          {conversation.unreadCount}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-slate-300">{conversation.lastMessagePreview || "No messages yet."}</p>
                    <div className="mt-3 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      <span>{getStatusCopy(conversation.status)}</span>
                      <span>{formatMessageTime(conversation.lastMessageAt)}</span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-[26px] border border-dashed border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-slate-400">
                No conversations yet.
              </div>
            )}
          </div>
        </div>

        <div className="glass-panel rounded-[32px] p-5 shadow-ambient">
          {activeConversation ? (
            <>
              <div className="space-y-4 border-b border-white/10 pb-5">
                <ChatConversationProductCard
                  product={activeConversation.product}
                  order={activeConversation.order}
                  repairRequest={activeConversation.repairRequest}
                  participantLabel={
                    user?.role === "customer"
                      ? `Seller: ${activeConversation.seller?.storeName || activeConversation.seller?.name || "Store support"} • ${activeConversation.seller?.presence?.label || "Offline"}`
                      : `Customer: ${activeConversation.customer?.name || activeConversation.customer?.email || "Customer"}`
                  }
                  actionLabel={activeConversation.contextType === "repair" ? "Open repair" : activeConversation.contextType === "order" ? "Open order" : "Open product page"}
                  actionTo={contextActionTo}
                />

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-200">{getStatusCopy(activeConversation.status)}</span>
                  {activeConversation.isEscalated ? <span className="rounded-full bg-amber-500/10 px-3 py-1.5 text-amber-100">Escalated to admin</span> : null}
                  {activeConversation.isBlocked ? <span className="rounded-full bg-rose-500/10 px-3 py-1.5 text-rose-100">Blocked</span> : null}
                  {activeConversation.moderation?.unresolvedReportsCount ? (
                    <span className="rounded-full bg-fuchsia-500/10 px-3 py-1.5 text-fuchsia-100">
                      {activeConversation.moderation.unresolvedReportsCount} report(s)
                    </span>
                  ) : null}
                </div>

                {activeConversation.isEscalated || activeConversation.moderation?.reports?.length ? (
                  <div className="grid gap-3 lg:grid-cols-2">
                    {activeConversation.isEscalated ? (
                      <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                        <p className="font-semibold text-white">Escalation reason</p>
                        <p className="mt-2 leading-6">
                          {activeConversation.escalation?.reason || "This conversation was escalated for admin review."}
                        </p>
                      </div>
                    ) : null}

                    {activeConversation.moderation?.reports?.length ? (
                      <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 px-4 py-3 text-sm text-fuchsia-100">
                        <p className="font-semibold text-white">Latest report</p>
                        <p className="mt-2 leading-6">
                          {(activeConversation.moderation.reports[activeConversation.moderation.reports.length - 1]?.reason || "Reported for review")}
                        </p>
                        {activeConversation.moderation.reports[activeConversation.moderation.reports.length - 1]?.message ? (
                          <p className="mt-2 text-xs leading-6 text-fuchsia-100/90">
                            {activeConversation.moderation.reports[activeConversation.moderation.reports.length - 1].message}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {activeTypingLabel ? (
                  <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
                    {activeTypingLabel}
                  </div>
                ) : null}

                {activeConversation.isBlocked ? (
                  <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                    This thread is blocked. Only admin can reopen it and non-admin replies are disabled.
                  </div>
                ) : null}
              </div>

              <div className="mt-5 flex min-h-[420px] flex-col">
                <div className="flex-1 space-y-3 overflow-y-auto rounded-[28px] border border-white/10 bg-slate-950/20 p-4">
                  {activeConversation.messages?.length ? (
                    activeConversation.messages.map((message) => {
                      const mine = String(message.sender?._id || "") === String(user?._id || "");

                      return (
                        <div key={message._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[85%] rounded-[24px] px-4 py-3 ${mine ? "bg-brand-500/20 text-white" : "bg-white/10 text-slate-100"}`}>
                            {message.attachments?.length ? (
                              <div className={message.text ? "mb-3" : ""}>
                                <ChatMessageAttachments attachments={message.attachments} />
                              </div>
                            ) : null}
                            {message.text ? <p className="leading-6">{message.text}</p> : null}
                            <p className={`mt-2 text-[11px] ${mine ? "text-brand-100/80" : "text-slate-400"}`}>
                              {message.sender?.storeName || message.sender?.name || message.senderRole} • {formatMessageTime(message.createdAt)}
                              {mine && message.deliveryStatus ? ` • ${message.deliveryStatus}` : ""}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex h-full min-h-[260px] flex-col items-center justify-center rounded-[24px] border border-dashed border-white/10 px-4 text-center text-sm text-slate-400">
                      <MessageSquare size={24} className="mb-3 text-slate-500" />
                      No messages yet in this conversation.
                    </div>
                  )}
                </div>

                {error ? <div className="mt-4 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
                {actionMessage ? <div className="mt-4 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{actionMessage}</div> : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  {quickReplies.map((reply) => (
                    <button
                      key={reply}
                      type="button"
                      onClick={() => setDraft(reply)}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-white/10"
                    >
                      {reply}
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={actionPending === "escalate"}
                    onClick={async () => {
                      const reason = window.prompt("Reason for escalation", "Needs admin review") || "";
                      setActionPending("escalate");
                      const result = await escalateConversation(activeConversation._id, reason);
                      setActionPending("");
                      if (result?.message) {
                        setActionMessage(result.message);
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10"
                  >
                    <ShieldAlert size={14} />
                    Escalate
                  </button>
                  <button
                    type="button"
                    disabled={actionPending === "report"}
                    onClick={async () => {
                      const reason = window.prompt("Report reason", "Suspicious behavior") || "Suspicious behavior";
                      setActionPending("report");
                      const result = await reportConversation(activeConversation._id, { reason });
                      setActionPending("");
                      if (result?.message) {
                        setActionMessage(result.message);
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10"
                  >
                    <AlertTriangle size={14} />
                    Report
                  </button>
                  <button
                    type="button"
                    disabled={actionPending === "block"}
                    onClick={async () => {
                      const reason = window.prompt("Block reason", "Unsafe conversation") || "Unsafe conversation";
                      setActionPending("block");
                      const result = await blockConversation(activeConversation._id, reason);
                      setActionPending("");
                      if (result?.message) {
                        setActionMessage(result.message);
                      }
                    }}
                    className="rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100"
                  >
                    Block
                  </button>
                  {user?.role === "admin" && activeConversation?.isBlocked ? (
                    <button
                      type="button"
                      onClick={async () => {
                        const result = await unblockConversation(activeConversation._id);
                        if (result?.message) {
                          setActionMessage(result.message);
                        }
                      }}
                      className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100"
                    >
                      Unblock
                    </button>
                  ) : null}
                  {user?.role === "admin" ? (
                    <button
                      type="button"
                      onClick={async () => {
                        const reopen = activeConversation.status === "resolved";
                        const result = await resolveConversation(activeConversation._id, { reopen });
                        if (result?.message) {
                          setActionMessage(result.message);
                        }
                      }}
                      className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100"
                    >
                      {activeConversation.status === "resolved" ? "Reopen" : "Mark resolved"}
                    </button>
                  ) : null}
                </div>

                <form
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const result = await sendMessage(draft, {
                      conversationId: activeConversation._id,
                      product: activeConversation.product,
                      order: activeConversation.order,
                      attachments: selectedFiles
                    });

                    if (!result?.error) {
                      setDraft("");
                      setSelectedFiles([]);

                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }
                  }}
                  className="mt-4"
                >
                  <ChatPendingAttachments
                    files={selectedFiles}
                    onRemove={(index) => {
                      setSelectedFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
                    }}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      const pickedFiles = Array.from(event.target.files || []);

                      if (!pickedFiles.length) {
                        return;
                      }

                      setSelectedFiles((current) => [...current, ...pickedFiles].slice(0, 4));
                      event.target.value = "";
                    }}
                  />
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-100 transition hover:bg-white/10"
                      title="Attach image or video"
                    >
                      <Paperclip size={16} />
                    </button>
                    <input
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder={activeConversation?.isBlocked && user?.role !== "admin" ? "Conversation is blocked" : "Reply to this conversation..."}
                      disabled={activeConversation?.isBlocked && user?.role !== "admin"}
                      className="h-12 flex-1 rounded-full border border-white/10 bg-slate-950/40 px-4 text-sm text-white outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={sending || (activeConversation?.isBlocked && user?.role !== "admin")}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand-500 px-5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {sending ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={15} />}
                      Send
                    </button>
                  </div>
                  <p className="mt-2 px-1 text-xs text-slate-500">You can send text, screenshots, images, and short videos here.</p>
                </form>
              </div>
            </>
          ) : (
            <div className="flex min-h-[520px] flex-col items-center justify-center rounded-[28px] border border-dashed border-white/10 bg-white/5 px-6 text-center text-slate-400">
              <Inbox size={28} className="mb-4 text-slate-500" />
              <p className="text-lg font-semibold text-white">Pick a conversation</p>
              <p className="mt-2 max-w-md text-sm leading-7">
                Once a customer sends the first message, the full thread appears here with product or order context, participants, and reply history.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
