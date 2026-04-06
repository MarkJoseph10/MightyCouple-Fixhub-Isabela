import api from "../api/client";

export async function applyAsTechnician(payload) {
  const { data } = await api.post("/users/seller/technician/apply", payload);
  return data;
}

export async function fetchTechnicianApplications() {
  const { data } = await api.get("/users/seller/technician/applications");
  return Array.isArray(data) ? data : [];
}

export async function reviewTechnicianApplication(id, payload) {
  const { data } = await api.patch(`/users/seller/technician/applications/${id}`, payload);
  return data;
}
