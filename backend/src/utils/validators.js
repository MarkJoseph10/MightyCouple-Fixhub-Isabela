export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

export function isValidPhone(phone) {
  return /^(\+63|0)?9\d{9}$/.test(String(phone || "").replace(/[\s-]/g, ""));
}

export function normalizePhilippinePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");

  if (digits.startsWith("63") && digits.length === 12) {
    return `+${digits}`;
  }

  if (digits.startsWith("09") && digits.length === 11) {
    return `+63${digits.slice(1)}`;
  }

  if (digits.startsWith("9") && digits.length === 10) {
    return `+63${digits}`;
  }

  return String(phone || "").trim();
}
