import { useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, Facebook, HelpCircle, Mail } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "../../context/AuthContext";
import PasswordInput from "../../components/common/PasswordInput";
import { requestPasswordReset } from "../../services/authService";

const initialForm = {
  firstName: "",
  lastName: "",
  birthMonth: "",
  birthDay: "",
  birthYear: "",
  gender: "",
  contact: ""
};

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const facebookAppId = import.meta.env.VITE_FACEBOOK_APP_ID || "";
const monthOptions = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" }
];
const genderOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "prefer_not_to_say", label: "Prefer not to say" }
];

function buildBirthDate(month, day, year) {
  if (!month || !day || !year) {
    return "";
  }

  return `${year}-${month}-${String(day).padStart(2, "0")}`;
}

function SelectField({ value, onChange, children, placeholder }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className="w-full appearance-none rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 pr-10 text-white outline-none transition focus:border-brand-400/50"
      >
        <option value="">{placeholder}</option>
        {children}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

function resolveAuthError(requestError, mode) {
  const status = requestError?.response?.status;
  const apiMessage = requestError?.response?.data?.message?.trim();
  const networkCode = requestError?.code;

  if (status === 401) {
    return mode === "login"
      ? "Incorrect email/mobile number or password."
      : apiMessage || "Your session is no longer valid. Please try again.";
  }

  if (status === 429) {
    return apiMessage || "Too many attempts. Please wait a few minutes before trying again.";
  }

  if (status === 503) {
    return "Server is waking up. Please try again in a few moments.";
  }

  if (status >= 500) {
    return "The server is temporarily unavailable. Please try again shortly.";
  }

  if (networkCode === "ERR_NETWORK" || networkCode === "ECONNABORTED") {
    return "We couldn't reach the server right now. Please check your connection and try again.";
  }

  return apiMessage || "Something went wrong. Please try again.";
}

export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const isNativeApp = Capacitor.isNativePlatform();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotContact, setForgotContact] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotResetLink, setForgotResetLink] = useState("");
  const passwordInputRef = useRef(null);
  const redirectedMessage = location.state?.message || "";
  const redirectTo = location.state?.from || new URLSearchParams(location.search).get("from") || "";
  const sessionExpired = new URLSearchParams(location.search).get("session") === "expired";

  const dayOptions = useMemo(() => Array.from({ length: 31 }, (_, index) => String(index + 1)), []);
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 100 }, (_, index) => String(currentYear - index));
  }, []);

  useEffect(() => {
    setError("");
    setFormLoading(false);
    setSocialLoading("");
    setForm(initialForm);
    setForgotOpen(false);
    setForgotContact("");
    setForgotError("");
    setForgotMessage("");
    setForgotResetLink("");
    if (passwordInputRef.current) {
      passwordInputRef.current.value = "";
    }
  }, [mode]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleGoogleLogin() {
    if (!googleClientId) {
      setError("Google login is not configured yet.");
      return;
    }

    const callbackUrl = `${window.location.origin}/auth/google/callback`;
    const statePayload = window.btoa(JSON.stringify({ redirectTo }));
    const googleUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    googleUrl.searchParams.set("client_id", googleClientId);
    googleUrl.searchParams.set("redirect_uri", callbackUrl);
    googleUrl.searchParams.set("response_type", "token");
    googleUrl.searchParams.set("scope", "openid email profile");
    googleUrl.searchParams.set("include_granted_scopes", "true");
    googleUrl.searchParams.set("prompt", "select_account");
    googleUrl.searchParams.set("state", statePayload);
    setError("");
    setSocialLoading("google");
    window.location.assign(googleUrl.toString());
  }

  function handleFacebookLogin() {
    if (!facebookAppId) {
      setError("Facebook login is not configured yet.");
      return;
    }

    const callbackUrl = `${window.location.origin}/auth/facebook/callback`;
    const statePayload = window.btoa(JSON.stringify({ redirectTo }));
    const facebookUrl = new URL("https://www.facebook.com/v23.0/dialog/oauth");
    facebookUrl.searchParams.set("client_id", facebookAppId);
    facebookUrl.searchParams.set("redirect_uri", callbackUrl);
    facebookUrl.searchParams.set("response_type", "token");
    facebookUrl.searchParams.set("scope", "public_profile");
    facebookUrl.searchParams.set("state", statePayload);
    setError("");
    setSocialLoading("facebook");
    window.location.assign(facebookUrl.toString());
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSocialLoading("");
    setFormLoading(true);
    setError("");

    try {
      let response;
      const passwordValue = passwordInputRef.current?.value || "";

      if (mode === "login") {
        response = await login({ email: form.contact, password: passwordValue });
      } else {
        response = await register({
          firstName: form.firstName,
          lastName: form.lastName,
          contact: form.contact,
          birthDate: buildBirthDate(form.birthMonth, form.birthDay, form.birthYear),
          gender: form.gender,
          password: passwordValue
        });
      }

      const fallbackTarget = isNativeApp
        ? (response?.user?.role === "admin" ? "/admin" : "/")
        : "/download";
      navigate(redirectTo || fallbackTarget, { replace: true });
    } catch (requestError) {
      setError(resolveAuthError(requestError, mode));
    } finally {
      if (passwordInputRef.current) {
        passwordInputRef.current.value = "";
      }
      setFormLoading(false);
    }
  }

  async function handleForgotPassword(event) {
    event.preventDefault();
    setForgotLoading(true);
    setForgotError("");
    setForgotMessage("");
    setForgotResetLink("");

    try {
      const data = await requestPasswordReset(forgotContact);
      setForgotMessage(data?.message || "If we found a matching account, we sent a password reset link.");
      setForgotResetLink(data?.resetLink || "");
    } catch (requestError) {
      setForgotError(requestError.response?.data?.message || "Unable to start password reset right now.");
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <div className="page-shell py-10">
      <div className="mx-auto max-w-xl glass-panel rounded-[36px] p-8 shadow-ambient">
        <div className="flex rounded-full bg-white/5 p-1">
          <button
            onClick={() => setMode("login")}
            className={`flex-1 rounded-full px-4 py-2 text-sm ${mode === "login" ? "bg-brand-500 text-white" : "text-slate-300"}`}
          >
            Login
          </button>
          <button
            onClick={() => setMode("register")}
            className={`flex-1 rounded-full px-4 py-2 text-sm ${mode === "register" ? "bg-brand-500 text-white" : "text-slate-300"}`}
          >
            Register
          </button>
        </div>

        <h1 className="mt-6 text-3xl font-semibold text-white">
          {mode === "login" ? "Welcome back" : "Create your customer account"}
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          {mode === "login"
            ? "Sign in with your real account or create a new customer account."
            : "Fill out your personal details now so they are already saved in your profile after sign-up."}
        </p>
        {!isNativeApp ? (
          <div className="mt-4 rounded-2xl border border-cyan-300/15 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50">
            Desktop access is for account sign-in and sign-up. Shopping, checkout, and notifications continue inside the Android app.
          </div>
        ) : null}

        {(redirectedMessage || sessionExpired) && (
          <div className="mt-6 rounded-2xl border border-brand-400/20 bg-brand-500/10 px-4 py-3 text-sm text-brand-50">
            {redirectedMessage || "Your session expired. Please sign in again to continue."}
          </div>
        )}

        {error && <div className="mt-6 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "register" ? (
            <>
              <div>
                <p className="mb-2 text-sm font-medium text-white">Name</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    required
                    placeholder="First name"
                    value={form.firstName}
                    onChange={(event) => updateField("firstName", event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
                  />
                  <input
                    required
                    placeholder="Last name"
                    value={form.lastName}
                    onChange={(event) => updateField("lastName", event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <p className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                  Birthday <HelpCircle size={14} className="text-slate-400" />
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <SelectField value={form.birthMonth} onChange={(event) => updateField("birthMonth", event.target.value)} placeholder="Month">
                    {monthOptions.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField value={form.birthDay} onChange={(event) => updateField("birthDay", event.target.value)} placeholder="Day">
                    {dayOptions.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField value={form.birthYear} onChange={(event) => updateField("birthYear", event.target.value)} placeholder="Year">
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </SelectField>
                </div>
              </div>

              <div>
                <p className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                  Gender <HelpCircle size={14} className="text-slate-400" />
                </p>
                <SelectField value={form.gender} onChange={(event) => updateField("gender", event.target.value)} placeholder="Select your gender">
                  {genderOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
              </div>
            </>
          ) : null}

          <div>
            <p className="mb-2 text-sm font-medium text-white">{mode === "login" ? "Email or mobile number" : "Mobile number or email"}</p>
            <input
              required
              placeholder={mode === "login" ? "Email or mobile number" : "Mobile number or email"}
              value={form.contact}
              onChange={(event) => updateField("contact", event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
            />
            {mode === "register" ? (
              <p className="mt-2 text-xs leading-6 text-slate-400">
                You may receive notifications from us. This contact detail is saved to your personal profile after sign-up.
              </p>
            ) : null}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">Password</p>
              {mode === "login" ? (
                <button
                  type="button"
                  onClick={() => {
                    setForgotOpen((current) => !current);
                    setForgotContact(form.contact || "");
                    setForgotError("");
                    setForgotMessage("");
                    setForgotResetLink("");
                  }}
                  className="text-xs font-medium text-brand-200 transition hover:text-white"
                >
                  Forgot password?
                </button>
              ) : null}
            </div>
            <PasswordInput
              required
              ref={passwordInputRef}
              placeholder="Password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 pr-14 text-white outline-none"
            />
          </div>

          {mode === "register" ? (
            <div className="space-y-2 text-xs leading-6 text-slate-400">
              <p>By tapping Submit, you agree to create an account and keep your profile details accurate for orders, repairs, and support.</p>
              <p>Your personal details can still be edited later from your profile page.</p>
            </div>
          ) : null}

          <button disabled={formLoading} className="w-full rounded-2xl bg-brand-500 px-5 py-3 font-semibold text-white disabled:opacity-60">
            {formLoading ? "Please wait..." : mode === "login" ? "Sign in" : "Submit"}
          </button>
        </form>

        {mode === "login" ? (
          <div className="mt-6">
            {forgotOpen ? (
              <form onSubmit={handleForgotPassword} className="mb-6 rounded-[28px] border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Forgot password</p>
                    <h2 className="mt-2 text-lg font-semibold text-white">Send a reset link</h2>
                    <p className="mt-2 text-sm text-slate-400">
                      Enter your email or mobile number. If your account has a real email address, we will send a reset link there.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForgotOpen(false)}
                    className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 transition hover:bg-white/10"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  <input
                    required
                    value={forgotContact}
                    onChange={(event) => setForgotContact(event.target.value)}
                    placeholder="Email or mobile number"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
                  />
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full rounded-2xl bg-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/15 disabled:opacity-60"
                  >
                    {forgotLoading ? "Sending reset link..." : "Send reset link"}
                  </button>
                </div>

                {forgotError ? (
                  <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                    {forgotError}
                  </div>
                ) : null}
                {forgotMessage ? (
                  <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-50">
                    <p>{forgotMessage}</p>
                    {forgotResetLink ? (
                      <a href={forgotResetLink} className="mt-2 inline-block font-semibold text-white underline underline-offset-4">
                        Open reset page
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </form>
            ) : null}
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-slate-500">
              <span className="h-px flex-1 bg-white/10" />
              <span>Or continue with</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>
            {googleClientId ? (
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={Boolean(formLoading) || Boolean(socialLoading)}
                className="mt-4 flex w-full items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
              >
                <Mail size={18} className="text-[#EA4335]" />
                <span>{socialLoading === "google" ? "Redirecting to Google..." : "Continue with Google"}</span>
              </button>
            ) : (
              <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                Google login is not configured yet. Add the Google client ID to enable it.
              </div>
            )}
            {facebookAppId ? (
              <button
                type="button"
                onClick={handleFacebookLogin}
                disabled={Boolean(formLoading) || Boolean(socialLoading)}
                className="mt-4 flex w-full items-center justify-center gap-3 rounded-2xl border border-[#1877F2]/30 bg-[#1877F2]/10 px-5 py-3 font-semibold text-[#E8F1FF] transition hover:bg-[#1877F2]/20 disabled:opacity-60"
              >
                <Facebook size={18} className="text-[#1877F2]" />
                <span>{socialLoading === "facebook" ? "Redirecting to Facebook..." : "Continue with Facebook"}</span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
