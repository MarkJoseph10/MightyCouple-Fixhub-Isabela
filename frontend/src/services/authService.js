import api from "../api/client";

export async function requestPasswordReset(contact) {
  const { data } = await api.post("/auth/forgot-password", { contact });
  return data;
}

export async function resetPasswordWithToken({ token, password, confirmPassword }) {
  const { data } = await api.post("/auth/reset-password", {
    token,
    password,
    confirmPassword
  });
  return data;
}
