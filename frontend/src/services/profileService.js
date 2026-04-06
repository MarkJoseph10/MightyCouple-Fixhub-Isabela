import api from "../api/client";

export async function getMyProfile() {
  const { data } = await api.get("/users/me/profile");
  return data;
}

export async function updateMyProfile(formData) {
  const { data } = await api.put("/users/me/profile", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
  return data;
}

export async function updateMyPassword(payload) {
  const { data } = await api.put("/users/me/password", payload);
  return data;
}
