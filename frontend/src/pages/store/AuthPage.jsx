import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Facebook, Mail } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const initialForm = { name: "", email: "", password: "" };
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const facebookAppId = import.meta.env.VITE_FACEBOOK_APP_ID || "";

export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState("");
  const redirectedMessage = location.state?.message || "";
  const redirectTo = location.state?.from || new URLSearchParams(location.search).get("from") || "";
  const sessionExpired = new URLSearchParams(location.search).get("session") === "expired";

  useEffect(() => {
    setError("");
    setFormLoading(false);
    setSocialLoading("");
  }, [mode]);

  function handleGoogleLogin() {
    if (!googleClientId) {
      setError("Google login is not configured yet.");
      return;
    }

    const callbackUrl = `${window.location.origin}/auth/google/callback`;
    const statePayload = window.btoa(
      JSON.stringify({
        redirectTo
      })
    );
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
    const statePayload = window.btoa(
      JSON.stringify({
        redirectTo
      })
    );
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

      if (mode === "login") {
        response = await login({ email: form.email, password: form.password });
      } else {
        response = await register(form);
      }

      const fallbackTarget = response?.user?.role === "admin" ? "/admin" : "/";
      navigate(redirectTo || fallbackTarget, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Something went wrong.");
    } finally {
      setFormLoading(false);
    }
  }

  return (
    <div className="page-shell py-10">
      <div className="mx-auto max-w-lg glass-panel rounded-[36px] p-8 shadow-ambient">
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
        <p className="mt-2 text-sm text-slate-400">Sign in with your real account or create a new customer account.</p>
        {(redirectedMessage || sessionExpired) && (
          <div className="mt-6 rounded-2xl border border-brand-400/20 bg-brand-500/10 px-4 py-3 text-sm text-brand-50">
            {redirectedMessage || "Your session expired. Please sign in again to continue."}
          </div>
        )}

        {error && <div className="mt-6 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "register" && (
            <input
              required
              placeholder="Full name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
            />
          )}
          <input
            required
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
          />
          <input
            required
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
          />
          <button
            disabled={formLoading}
            className="w-full rounded-2xl bg-brand-500 px-5 py-3 font-semibold text-white disabled:opacity-60"
          >
            {formLoading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        {mode === "login" ? (
          <div className="mt-6">
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
            {googleClientId ? (
              <p className="mt-3 text-center text-xs text-slate-500">
                Google login opens in a secure redirect flow and returns you to this page after approval.
              </p>
            ) : null}
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
            {facebookAppId ? (
              <p className="mt-3 text-center text-xs text-slate-500">
                Facebook login opens in a secure redirect flow and returns you to this page after approval.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
