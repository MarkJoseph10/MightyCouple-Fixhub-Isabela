import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "./AuthContext";
import { useNotifications } from "./NotificationContext";
import { subscribeRealtime } from "../services/realtimeClient";

const ChatContext = createContext(null);

function normalizeProduct(product = null) {
  if (!product) {
    return null;
  }

  return {
    _id: product._id,
    name: product.name || "",
    image: product.images?.[0]?.url || product.image || "",
    price: Number(product.priceFrom || product.price || 0),
    slug: product.slug || "",
    vendorType: product.vendorType || "admin",
    category: product.category || ""
  };
}

function normalizeOrder(order = null) {
  if (!order) {
    return null;
  }

  const firstItem = Array.isArray(order.items) ? order.items[0] : null;

  return {
    _id: order._id,
    orderNumber: order.orderNumber || "",
    status: order.status || "pending",
    orderType: order.orderType || "regular",
    total: Number(order.pricing?.total || order.total || 0),
    createdAt: order.createdAt || null,
    customerName: order.user?.name || order.shippingAddress?.fullName || "",
    itemCount: Array.isArray(order.items) ? order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0) : Number(order.itemCount || 0),
    itemName: firstItem?.name || order.itemName || "Order item",
    image: firstItem?.image || order.image || "",
    slug: "",
    category: "Order"
  };
}

function normalizeRepairRequest(repairRequest = null) {
  if (!repairRequest) {
    return null;
  }

  const deviceLabel = [repairRequest.device?.brand, repairRequest.device?.model]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    _id: repairRequest._id,
    requestNumber: repairRequest.requestNumber || "",
    status: repairRequest.status || "pending",
    branchLabel: repairRequest.branchLabel || "",
    pickupMethod: repairRequest.pickupMethod || "drop_off",
    preferredScheduleAt: repairRequest.preferredScheduleAt || null,
    scheduledAt: repairRequest.scheduledAt || null,
    issueDescription: repairRequest.issueDescription || "",
    total: Number(repairRequest.quote?.total || repairRequest.quote?.approvedAmount || repairRequest.invoice?.approvedAmount || 0),
    image:
      repairRequest.attachments?.reportedIssue?.[0]?.url
      || repairRequest.reportedIssueAttachments?.[0]?.url
      || repairRequest.image
      || "",
    device: {
      type: repairRequest.device?.type || "",
      brand: repairRequest.device?.brand || "",
      model: repairRequest.device?.model || ""
    },
    sellerName: repairRequest.seller?.storeName || repairRequest.seller?.displayName || repairRequest.seller?.name || "",
    customerName: repairRequest.customer?.name || repairRequest.customer?.email || "",
    category: "Repair",
    title: deviceLabel || repairRequest.device?.type || repairRequest.requestNumber || "Repair request"
  };
}

function normalizeAttachmentFiles(files = []) {
  return Array.from(files || []).filter((file) => file instanceof File);
}

function mergeConversation(currentItems, nextConversation) {
  if (!nextConversation?._id) {
    return currentItems;
  }

  const existing = currentItems.filter((item) => item._id !== nextConversation._id);
  return [nextConversation, ...existing].sort((left, right) => {
    return new Date(right.lastMessageAt || right.updatedAt || 0).getTime() - new Date(left.lastMessageAt || left.updatedAt || 0).getTime();
  });
}

function updateConversationParticipantPresence(conversation, payload) {
  if (!conversation?._id || !payload?.userId) {
    return conversation;
  }

  let changed = false;
  const nextConversation = {
    ...conversation
  };

  if (String(conversation.seller?._id || "") === String(payload.userId)) {
    nextConversation.seller = {
      ...(conversation.seller || {}),
      presence: payload.presence || conversation.seller?.presence || null
    };
    changed = true;
  }

  if (String(conversation.customer?._id || "") === String(payload.userId)) {
    nextConversation.customer = {
      ...(conversation.customer || {}),
      presence: payload.presence || conversation.customer?.presence || null
    };
    changed = true;
  }

  return changed ? nextConversation : conversation;
}

function mergeActiveConversationSnapshot(currentConversation, refreshedConversation) {
  if (!refreshedConversation?._id) {
    return currentConversation;
  }

  if (!currentConversation || currentConversation._id !== refreshedConversation._id) {
    return refreshedConversation;
  }

  return {
    ...currentConversation,
    ...refreshedConversation,
    messages: refreshedConversation.messages || currentConversation.messages || []
  };
}

export function ChatProvider({ children }) {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { refreshNotifications } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedRepairRequest, setSelectedRepairRequest] = useState(null);
  const [activeConversation, setActiveConversation] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [readyingConversation, setReadyingConversation] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const activeConversationRef = useRef(null);
  const lastQueryRef = useRef({});

  const isInboxRoute = location.pathname === "/messages"
    || location.pathname.startsWith("/admin/messages")
    || location.pathname.startsWith("/seller/messages");

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  useEffect(() => {
    if (!isAuthenticated) {
      setRealtimeConnected(false);
      return undefined;
    }

    const unsubscribe = subscribeRealtime(({ type, payload }) => {
      if (type === "connection.open" || type === "connected") {
        setRealtimeConnected(true);
        return;
      }

      if (type === "connection.error") {
        setRealtimeConnected(false);
        return;
      }

      if (type === "conversation.updated" && payload?.conversation?._id) {
        const nextConversation = payload.conversation;
        setConversations((current) => mergeConversation(current, nextConversation));
        setActiveConversation((current) => mergeActiveConversationSnapshot(current, nextConversation));

        if (activeConversationRef.current?._id === nextConversation._id) {
          applyConversationSelection(nextConversation);
        }

        return;
      }

      if (type === "presence.updated" && payload?.userId) {
        setConversations((current) => current.map((conversation) => updateConversationParticipantPresence(conversation, payload)));
        setActiveConversation((current) => updateConversationParticipantPresence(current, payload));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated]);

  function applyConversationSelection(conversation) {
    setSelectedProduct(conversation?.product || null);
    setSelectedOrder(conversation?.order || null);
    setSelectedRepairRequest(conversation?.repairRequest || null);
  }

  const requestConversation = useCallback(async ({ product = null, order = null, repairRequest = null, createIfMissing = false } = {}) => {
    if (!isAuthenticated) {
      return { conversation: null };
    }

    const payload = {
      createIfMissing
    };

    if (product?._id) {
      payload.productId = product._id;
    }

    if (order?._id) {
      payload.orderId = order._id;
    }

    if (repairRequest?._id) {
      payload.repairRequestId = repairRequest._id;
    }

    if (!payload.productId && !payload.orderId && !payload.repairRequestId) {
      return { conversation: null };
    }

    const { data } = await api.post("/conversations", payload);

    return {
      conversation: data.conversation || null
    };
  }, [isAuthenticated]);

  const refreshConversations = useCallback(async (params = {}) => {
    lastQueryRef.current = params;

    if (!isAuthenticated) {
      setConversations([]);
      setActiveConversation(null);
      setSelectedProduct(null);
      setSelectedOrder(null);
      setSelectedRepairRequest(null);
      return [];
    }

    setLoadingConversations(true);

    try {
      const { data } = await api.get("/conversations", {
        params: {
          page: 1,
          limit: 60,
          ...params
        }
      });
      const nextItems = data.conversations || [];
      setConversations(nextItems);

      if (activeConversationRef.current?._id) {
        const refreshedActive = nextItems.find((item) => item._id === activeConversationRef.current._id);
        if (refreshedActive) {
          setActiveConversation((current) => mergeActiveConversationSnapshot(current, refreshedActive));
        }
      }

      setError("");
      return nextItems;
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load conversations.");
      return [];
    } finally {
      setLoadingConversations(false);
    }
  }, [isAuthenticated]);

  const markConversationRead = useCallback(async (conversationId) => {
    if (!conversationId || !isAuthenticated) {
      return null;
    }

    try {
      const { data } = await api.patch(`/conversations/${conversationId}/read`);
      const nextConversation = data.conversation;
      setConversations((current) => mergeConversation(current, nextConversation));
      setActiveConversation((current) => (current?._id === nextConversation?._id ? nextConversation : current));
      refreshNotifications().catch(() => {});
      return nextConversation;
    } catch {
      return null;
    }
  }, [isAuthenticated, refreshNotifications]);

  const loadConversation = useCallback(async (conversationId, options = {}) => {
    if (!conversationId || !isAuthenticated) {
      return null;
    }

    try {
      const { data } = await api.get(`/conversations/${conversationId}`);
      const nextConversation = data.conversation;
      setActiveConversation(nextConversation);
      applyConversationSelection(nextConversation);
      setConversations((current) => mergeConversation(current, nextConversation));
      setError("");

      if ((nextConversation?.unreadCount || 0) > 0 && options.skipRead !== true) {
        await markConversationRead(conversationId);
      }

      if (options.openWidget) {
        setIsOpen(true);
      }

      return nextConversation;
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load this conversation.");
      return null;
    }
  }, [isAuthenticated, markConversationRead]);

  const openChat = useCallback(async (product) => {
    const nextProduct = normalizeProduct(product);
    setSelectedProduct(nextProduct);
    setSelectedOrder(null);
    setSelectedRepairRequest(null);
    setIsOpen(true);

    if (!isAuthenticated) {
      return { requiresAuth: true };
    }

    if (!nextProduct?._id) {
      setError("Product chat could not be prepared.");
      return { conversation: null };
    }

    setReadyingConversation(true);

    try {
      const { conversation: nextConversation } = await requestConversation({
        product: nextProduct,
        createIfMissing: false
      });

      setActiveConversation(nextConversation);
      if (nextConversation) {
        applyConversationSelection(nextConversation);
        setConversations((current) => mergeConversation(current, nextConversation));
      }

      setError("");

      if ((nextConversation?.unreadCount || 0) > 0) {
        await markConversationRead(nextConversation._id);
      }

      return { conversation: nextConversation };
    } catch (requestError) {
      const nextError = requestError.response?.data?.message || "Unable to start a conversation right now.";
      setError(nextError);
      return { conversation: null, error: nextError };
    } finally {
      setReadyingConversation(false);
    }
  }, [isAuthenticated, markConversationRead, requestConversation]);

  const openOrderChat = useCallback(async (order) => {
    const nextOrder = normalizeOrder(order);
    setSelectedOrder(nextOrder);
    setSelectedProduct(null);
    setSelectedRepairRequest(null);
    setIsOpen(true);

    if (!isAuthenticated) {
      return { requiresAuth: true };
    }

    if (!nextOrder?._id) {
      setError("Order chat could not be prepared.");
      return { conversation: null };
    }

    setReadyingConversation(true);

    try {
      const { conversation: nextConversation } = await requestConversation({
        order: nextOrder,
        createIfMissing: false
      });

      setActiveConversation(nextConversation);
      if (nextConversation) {
        applyConversationSelection(nextConversation);
        setConversations((current) => mergeConversation(current, nextConversation));
      }

      setError("");

      if ((nextConversation?.unreadCount || 0) > 0) {
        await markConversationRead(nextConversation._id);
      }

      return { conversation: nextConversation };
    } catch (requestError) {
      const nextError = requestError.response?.data?.message || "Unable to open this order chat right now.";
      setError(nextError);
      return { conversation: null, error: nextError };
    } finally {
      setReadyingConversation(false);
    }
  }, [isAuthenticated, markConversationRead, requestConversation]);

  const openRepairChat = useCallback(async (repairRequest) => {
    const nextRepairRequest = normalizeRepairRequest(repairRequest);
    setSelectedRepairRequest(nextRepairRequest);
    setSelectedOrder(null);
    setSelectedProduct(null);
    setIsOpen(true);

    if (!isAuthenticated) {
      return { requiresAuth: true };
    }

    if (!nextRepairRequest?._id) {
      setError("Repair chat could not be prepared.");
      return { conversation: null };
    }

    setReadyingConversation(true);

    try {
      const { conversation: nextConversation } = await requestConversation({
        repairRequest: nextRepairRequest,
        createIfMissing: false
      });

      setActiveConversation(nextConversation);
      if (nextConversation) {
        applyConversationSelection(nextConversation);
        setConversations((current) => mergeConversation(current, nextConversation));
      }

      setError("");

      if ((nextConversation?.unreadCount || 0) > 0) {
        await markConversationRead(nextConversation._id);
      }

      return { conversation: nextConversation };
    } catch (requestError) {
      const nextError = requestError.response?.data?.message || "Unable to open this repair chat right now.";
      setError(nextError);
      return { conversation: null, error: nextError };
    } finally {
      setReadyingConversation(false);
    }
  }, [isAuthenticated, markConversationRead, requestConversation]);

  const sendMessage = useCallback(async (text, options = {}) => {
    const trimmed = String(text || "").trim();
    const attachmentFiles = normalizeAttachmentFiles(options.attachments);

    if (!trimmed && !attachmentFiles.length) {
      return { error: "Message or attachment is required." };
    }

    if (!isAuthenticated) {
      return { requiresAuth: true };
    }

    let conversationId = options.conversationId || activeConversationRef.current?._id || "";

    if (!conversationId) {
      const targetProduct = normalizeProduct(options.product || selectedProduct);
      const targetOrder = normalizeOrder(options.order || selectedOrder);
      const targetRepairRequest = normalizeRepairRequest(options.repairRequest || selectedRepairRequest);

      try {
        const bootstrapResult = await requestConversation({
          product: targetProduct,
          order: targetOrder,
          repairRequest: targetRepairRequest,
          createIfMissing: true
        });

        if (!bootstrapResult?.conversation?._id) {
          return { error: "Unable to start a conversation right now." };
        }

        conversationId = bootstrapResult.conversation._id;
        setActiveConversation(bootstrapResult.conversation);
        applyConversationSelection(bootstrapResult.conversation);
        setConversations((current) => mergeConversation(current, bootstrapResult.conversation));
      } catch (requestError) {
        const nextError = requestError.response?.data?.message || "Unable to start a conversation right now.";
        setError(nextError);
        return { error: nextError };
      }
    }

    setSending(true);

    try {
      const payload = attachmentFiles.length ? new FormData() : { message: trimmed };

      if (payload instanceof FormData) {
        payload.set("message", trimmed);
        attachmentFiles.forEach((file) => {
          payload.append("attachments", file);
        });
      }

      const { data } = await api.post(`/conversations/${conversationId}/messages`, payload);
      const nextConversation = data.conversation;
      setActiveConversation(nextConversation);
      applyConversationSelection(nextConversation);
      setConversations((current) => mergeConversation(current, nextConversation));
      setError("");
      refreshNotifications().catch(() => {});
      return { conversation: nextConversation };
    } catch (requestError) {
      const nextError = requestError.response?.data?.message || "Unable to send your message.";
      setError(nextError);
      return { error: nextError };
    } finally {
      setSending(false);
    }
  }, [isAuthenticated, refreshNotifications, requestConversation, selectedOrder, selectedProduct, selectedRepairRequest]);

  const updateTyping = useCallback(async (conversationId, isTyping) => {
    if (!conversationId || !isAuthenticated) {
      return null;
    }

    try {
      const { data } = await api.patch(`/conversations/${conversationId}/typing`, { isTyping });
      const nextConversation = data.conversation;
      setActiveConversation((current) => (current?._id === nextConversation?._id ? nextConversation : current));
      setConversations((current) => mergeConversation(current, nextConversation));
      return nextConversation;
    } catch {
      return null;
    }
  }, [isAuthenticated]);

  const mutateConversation = useCallback(async (conversationId, route, payload = {}) => {
    if (!conversationId || !isAuthenticated) {
      return { error: "Authentication required." };
    }

    try {
      const { data } = await api.post(`/conversations/${conversationId}/${route}`, payload);
      const nextConversation = data.conversation;
      setActiveConversation((current) => (current?._id === nextConversation?._id ? nextConversation : current));
      setConversations((current) => mergeConversation(current, nextConversation));
      setError("");
      refreshNotifications().catch(() => {});
      return { conversation: nextConversation, message: data.message || "" };
    } catch (requestError) {
      const nextError = requestError.response?.data?.message || "Unable to update this conversation.";
      setError(nextError);
      return { error: nextError };
    }
  }, [isAuthenticated, refreshNotifications]);

  const closeChat = useCallback(() => {
    if (activeConversationRef.current?._id) {
      updateTyping(activeConversationRef.current._id, false).catch(() => {});
    }
    setIsOpen(false);
  }, [updateTyping]);

  const clearChat = useCallback(() => {
    if (activeConversationRef.current?._id) {
      updateTyping(activeConversationRef.current._id, false).catch(() => {});
    }
    setIsOpen(false);
    setSelectedProduct(null);
    setSelectedOrder(null);
    setSelectedRepairRequest(null);
    setActiveConversation(null);
    setError("");
  }, [updateTyping]);

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }

    api.post("/conversations/presence/heartbeat").catch(() => {});
    const interval = window.setInterval(() => {
      api.post("/conversations/presence/heartbeat").catch(() => {});
    }, 45000);

    return () => window.clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || (!isOpen && !isInboxRoute)) {
      return undefined;
    }

    let running = false;

    const tick = async () => {
      if (running) {
        return;
      }

      running = true;

      try {
        await refreshConversations(lastQueryRef.current);

        if (activeConversationRef.current?._id) {
          await loadConversation(activeConversationRef.current._id, { skipRead: false });
        }
      } finally {
        running = false;
      }
    };

    tick().catch(() => {});
    const interval = window.setInterval(() => {
      tick().catch(() => {});
    }, realtimeConnected ? 30000 : 3500);

    return () => window.clearInterval(interval);
  }, [isAuthenticated, isInboxRoute, isOpen, loadConversation, realtimeConnected, refreshConversations]);

  const value = useMemo(
    () => ({
      isOpen,
      selectedProduct,
      selectedOrder,
      selectedRepairRequest,
      activeConversation,
      conversations,
      loadingConversations,
      readyingConversation,
      sending,
      realtimeConnected,
      error,
      isInboxRoute,
      openChat,
      openOrderChat,
      openRepairChat,
      closeChat,
      clearChat,
      refreshConversations,
      loadConversation,
      markConversationRead,
      sendMessage,
      updateTyping,
      escalateConversation: (conversationId, reason = "") => mutateConversation(conversationId, "escalate", { reason }),
      reportConversation: (conversationId, payload = {}) => mutateConversation(conversationId, "report", payload),
      blockConversation: (conversationId, reason = "") => mutateConversation(conversationId, "block", { reason }),
      unblockConversation: (conversationId) => mutateConversation(conversationId, "unblock"),
      resolveConversation: (conversationId, payload = {}) => mutateConversation(conversationId, "resolve", payload)
    }),
    [
      activeConversation,
      clearChat,
      closeChat,
      conversations,
      error,
      isInboxRoute,
      isOpen,
      loadConversation,
      loadingConversations,
      markConversationRead,
      mutateConversation,
      openChat,
      openOrderChat,
      openRepairChat,
      readyingConversation,
      refreshConversations,
      selectedOrder,
      selectedProduct,
      selectedRepairRequest,
      sendMessage,
      sending,
      realtimeConnected,
      updateTyping
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  return useContext(ChatContext);
}
