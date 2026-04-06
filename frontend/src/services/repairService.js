import api from "../api/client";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

export async function fetchRepairOptions() {
  const { data } = await api.get("/repairs/options");
  return data;
}

export async function updateRepairServicePoints(payload = {}, sellerId = "") {
  const endpoint = sellerId ? `/repairs/service-points/${sellerId}` : "/repairs/service-points";
  const { data } = await api.patch(endpoint, payload);
  return data;
}

export async function fetchRepairRequests(mode = "customer", params = {}) {
  const endpoint = mode === "admin" ? "/repairs" : mode === "seller" ? "/repairs/seller/mine" : "/repairs/mine";
  const { data } = await api.get(endpoint, { params });
  return {
    repairRequests: toArray(data.repairRequests ?? data),
    total: Number(data.total || 0),
    page: Number(data.page || 1),
    limit: Number(data.limit || 0),
    hasMore: Boolean(data.hasMore)
  };
}

export async function fetchRepairRequest(id) {
  const { data } = await api.get(`/repairs/${id}`);
  return data.repairRequest;
}

export async function createRepairRequest(payload) {
  const { data } = await api.post("/repairs", payload);
  return data;
}

export async function assignRepairRequest(id, payload) {
  const { data } = await api.patch(`/repairs/${id}/assign`, payload);
  return data;
}

export async function updateRepairStatus(id, payload) {
  const { data } = await api.patch(`/repairs/${id}/status`, payload);
  return data;
}

export async function submitRepairQuote(id, payload) {
  const { data } = await api.patch(`/repairs/${id}/quote`, payload);
  return data;
}

export async function respondRepairQuote(id, payload) {
  const { data } = await api.patch(`/repairs/${id}/quote/respond`, payload);
  return data;
}

export async function addRepairSlot(id, payload) {
  const { data } = await api.post(`/repairs/${id}/slots`, payload);
  return data;
}

export async function updateRepairSlot(id, slotId, payload) {
  const { data } = await api.patch(`/repairs/${id}/slots/${slotId}`, payload);
  return data;
}

export async function bookRepairSlot(id, slotId, payload) {
  const { data } = await api.patch(`/repairs/${id}/slots/${slotId}/book`, payload);
  return data;
}

export async function updateRepairSchedule(id, payload) {
  const { data } = await api.patch(`/repairs/${id}/schedule`, payload);
  return data;
}

export async function uploadRepairAttachments(id, category, payload) {
  const { data } = await api.post(`/repairs/${id}/attachments/${category}`, payload);
  return data;
}

export async function finalizeRepairRequest(id, payload) {
  const { data } = await api.patch(`/repairs/${id}/finalize`, payload);
  return data;
}

export async function submitRepairRating(id, payload) {
  const { data } = await api.patch(`/repairs/${id}/rating`, payload);
  return data;
}

export async function updateRepairDispute(id, payload) {
  const { data } = await api.patch(`/repairs/${id}/dispute`, payload);
  return data;
}

export async function claimRepairRequest(id, payload) {
  const { data } = await api.patch(`/repairs/${id}/claim`, payload);
  return data;
}
