import { Link, useLocation } from "react-router-dom";
import { AlertTriangle, LoaderCircle, MessageSquare, Minus, Paperclip, Send, ShieldAlert, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import ChatConversationProductCard from "./ChatConversationProductCard";
import ChatMessageAttachments from "./ChatMessageAttachments";
import ChatPendingAttachments from "./ChatPendingAttachments";

const customerQuickReplies = [
  "Available pa po ba ito?",
  "Magkano po shipping?",
  "Pwede COD?",
  "Gaano kabilis ang shipping?"
];

function formatMessageTime(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit"
  });
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
    return "Waiting for your reply";
  }
  if (normalized === "blocked") {
    return "Conversation blocked";
  }
  if (normalized === "resolved") {
    return "Conversation resolved";
  }

  return "Conversation open";
}

export default function ChatWidget() {
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const {
    isOpen,
    selectedProduct,
    selectedOrder,
    selectedRepairRequest,
    activeConversation,
    closeChat,
    readyingConversation,
    sending,
    error,
    sendMessage,
    updateTyping,
    escalateConversation,
    reportConversation,
    blockConversation,
    unblockConversation,
    resolveConversation
  } = useChat();
  const [draft, setDraft] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [actionMessage, setActionMessage] = useState("");
  const [actionPending, setActionPending] = useState("");
  const fileInputRef = useRef(null);

  const hideOnDedicatedInbox = location.pathname === "/messages";
  const contextType = activeConversation?.contextType || (selectedRepairRequest ? "repair" : selectedOrder ? "order" : "product");
  const contextCard = useMemo(() => {
    if (contextType === "repair") {
      const repairId = activeConversation?.repairRequest?._id || selectedRepairRequest?._id || "";
      const repairBase = location.pathname.startsWith("/admin")
        ? "/admin/repairs"
        : location.pathname.startsWith("/seller")
          ? "/seller/repairs"
          : "/repairs";

      return {
        repairRequest: activeConversation?.repairRequest || selectedRepairRequest,
        actionTo: repairId ? `${repairBase}?repair=${repairId}` : repairBase,
        actionLabel: "Open repair"
      };
    }

    if (contextType === "order") {
      return {
        order: activeConversation?.order || selectedOrder,
        actionTo: location.pathname.startsWith("/admin")
          ? "/admin/orders"
          : location.pathname.startsWith("/seller")
            ? "/seller/orders"
            : "/orders",
        actionLabel: "Open order"
      };
    }

    return {
      product: activeConversation?.product || selectedProduct,
      actionTo: activeConversation?.product?.slug ? `/product/${activeConversation.product.slug}` : "",
      actionLabel: "Open product"
    };
  }, [activeConversation?.order, activeConversation?.product, activeConversation?.repairRequest, contextType, location.pathname, selectedOrder, selectedProduct, selectedRepairRequest]);

  const headerLabel = useMemo(() => {
    if (activeConversation?.seller?.storeName) {
      return activeConversation.seller.storeName;
    }

    if (activeConversation?.seller?.name) {
      return activeConversation.seller.name;
    }

    return "Store support";
  }, [activeConversation?.seller]);

  const presenceLabel = activeConversation?.seller?.presence?.label || "Waiting for seller";
  const typingLabel = activeConversation?.typingParticipants?.[0]?.label || "";
  const canSend = isAuthenticated && !(activeConversation?.isBlocked && user?.role !== "admin");

  useEffect(() => {
    if (!isAuthenticated || !activeConversation?._id) {
      return undefined;
    }

    const shouldType = Boolean(draft.trim()) || selectedFiles.length > 0;
    const timer = window.setTimeout(() => {
      updateTyping(activeConversation._id, shouldType).catch(() => {});
    }, 250);

    return () => window.clearTimeout(timer);
  }, [activeConversation?._id, draft, isAuthenticated, selectedFiles.length, updateTyping]);

  if (!isOpen || hideOnDedicatedInbox) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-4 z-50 w-[400px] max-w-[calc(100vw-1.5rem)] sm:bottom-6 sm:right-6">
      <div className="glass-panel overflow-hidden rounded-[28px] border border-white/10 shadow-ambient">
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/45 px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm text-white">
              <MessageSquare size={16} className="text-brand-200" />
              <span className="font-semibold">{contextType === "repair" ? "Repair chat" : contextType === "order" ? "Order chat" : "Product chat"}</span>
            </div>
            <p className="mt-1 truncate text-xs text-slate-400">
              Connected with {headerLabel} • {presenceLabel}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCollapsed((current) => !current)}
              className="rounded-full border border-white/10 bg-white/5 p-1 text-slate-200 transition hover:bg-white/10"
              title={collapsed ? "Expand chat" : "Collapse chat"}
            >
              <Minus size={14} />
            </button>
            <button
              type="button"
              onClick={closeChat}
              className="rounded-full border border-white/10 bg-white/5 p-1 text-slate-200 transition hover:bg-white/10"
              title="Close chat"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {!collapsed ? (
          <>
            {(contextCard.product || contextCard.order || contextCard.repairRequest) ? (
              <div className="border-b border-white/10 bg-slate-950/20 px-4 py-3">
                <ChatConversationProductCard
                  product={contextCard.product}
                  order={contextCard.order}
                  repairRequest={contextCard.repairRequest}
                  compact
                  participantLabel={`Connected with ${headerLabel}`}
                  actionLabel={contextCard.actionLabel}
                  actionTo={contextCard.actionTo}
                />
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-slate-950/20 px-4 py-2 text-xs text-slate-400">
              <span>{activeConversation ? getStatusCopy(activeConversation.status) : "Conversation not started yet"}</span>
              <div className="flex items-center gap-2">
                <Link to="/messages" className="font-semibold text-brand-100 transition hover:text-white">
                  Open inbox
                </Link>
                {activeConversation?.isEscalated ? <span className="rounded-full bg-amber-500/15 px-2 py-1 text-amber-100">Escalated</span> : null}
              </div>
            </div>

            {activeConversation?.isBlocked ? (
              <div className="border-b border-white/10 bg-rose-500/10 px-4 py-2 text-xs text-rose-100">
                This conversation is blocked. Only admin can reopen it.
              </div>
            ) : null}

            {typingLabel ? (
              <div className="border-b border-white/10 bg-cyan-500/10 px-4 py-2 text-xs text-cyan-100">
                {typingLabel}
              </div>
            ) : null}

            <div className="flex max-h-[300px] min-h-[220px] flex-col gap-3 overflow-y-auto px-4 py-4 text-sm text-slate-200">
              {readyingConversation ? (
                <div className="flex h-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-slate-300">
                  <LoaderCircle size={16} className="animate-spin" />
                  Preparing your conversation...
                </div>
              ) : activeConversation?.messages?.length ? (
                activeConversation.messages.map((message) => {
                  const mine = String(message.sender?._id || "") === String(user?._id || "");

                  return (
                    <div key={message._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[88%] rounded-[22px] px-3 py-2 ${mine ? "bg-brand-500/20 text-white" : "bg-white/10 text-slate-100"}`}>
                        {message.attachments?.length ? (
                          <div className={message.text ? "mb-2" : ""}>
                            <ChatMessageAttachments attachments={message.attachments} />
                          </div>
                        ) : null}
                        {message.text ? <p>{message.text}</p> : null}
                        <p className={`mt-1 text-[11px] ${mine ? "text-brand-100/80" : "text-slate-400"}`}>
                          {message.sender?.storeName || message.sender?.name || (mine ? "You" : "Support")} • {formatMessageTime(message.createdAt)}
                          {mine && message.deliveryStatus ? ` • ${message.deliveryStatus}` : ""}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4 text-xs leading-6 text-slate-300">
                  Ask the seller about specs, stock, shipping, or warranty. The thread will only appear in the inbox after the first actual message is sent.
                </div>
              )}
            </div>

            {error ? <div className="border-t border-white/10 bg-rose-500/10 px-4 py-2 text-xs text-rose-100">{error}</div> : null}
            {actionMessage ? <div className="border-t border-white/10 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-100">{actionMessage}</div> : null}

            <div className="border-t border-white/10 bg-slate-950/20 px-3 py-2">
              <div className="flex flex-wrap gap-2">
                {customerQuickReplies.map((reply) => (
                  <button
                    key={reply}
                    type="button"
                    onClick={() => setDraft(reply)}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-200 transition hover:bg-white/10"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            </div>

            {activeConversation?._id ? (
              <div className="border-t border-white/10 bg-slate-950/20 px-3 py-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={actionPending === "escalate"}
                    onClick={async () => {
                      const reason = window.prompt("Reason for escalation", "Customer needs admin help") || "";
                      setActionPending("escalate");
                      const result = await escalateConversation(activeConversation._id, reason);
                      setActionPending("");
                      if (result?.message) {
                        setActionMessage(result.message);
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-white transition hover:bg-white/10"
                  >
                    <ShieldAlert size={12} />
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
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-white transition hover:bg-white/10"
                  >
                    <AlertTriangle size={12} />
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
                    className="inline-flex items-center gap-2 rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-[11px] text-rose-100 transition hover:bg-rose-500/15"
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
                      className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] text-emerald-100"
                    >
                      Unblock
                    </button>
                  ) : null}
                  {user?.role === "admin" ? (
                    <button
                      type="button"
                      onClick={async () => {
                        const result = await resolveConversation(activeConversation._id);
                        if (result?.message) {
                          setActionMessage(result.message);
                        }
                      }}
                      className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-[11px] text-cyan-100"
                    >
                      Mark resolved
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            <form
              onSubmit={async (event) => {
                event.preventDefault();
                const result = await sendMessage(draft, {
                  conversationId: activeConversation?._id,
                  product: selectedProduct,
                  order: selectedOrder,
                  repairRequest: selectedRepairRequest,
                  attachments: selectedFiles
                });

                if (!result?.error && !result?.requiresAuth) {
                  setDraft("");
                  setSelectedFiles([]);
                  setActionMessage("");
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }
              }}
              className="border-t border-white/10 bg-slate-950/45 px-3 py-3"
            >
              {!isAuthenticated ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-300">
                  Please sign in first to send a real message to the seller.
                </div>
              ) : (
                <>
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
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-100 transition hover:bg-white/10"
                      title="Attach image or video"
                    >
                      <Paperclip size={15} />
                    </button>
                    <input
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder={canSend ? "Type your message..." : "Conversation is blocked"}
                      disabled={!canSend}
                      className="h-11 flex-1 rounded-full border border-white/10 bg-slate-950/40 px-4 text-sm text-white outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={sending || readyingConversation || !canSend}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand-500 text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                      title="Send message"
                    >
                      {sending ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={15} />}
                    </button>
                  </div>
                  <p className="mt-2 px-1 text-[11px] text-slate-500">
                    Send text, photos, or videos without leaving this page.
                  </p>
                </>
              )}
            </form>
          </>
        ) : null}
      </div>
    </div>
  );
}
