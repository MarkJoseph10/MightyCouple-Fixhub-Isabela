import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const initialForm = { name: "", email: "", password: "" };
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve(window.google);
      return;
    }

    const existingScript = document.querySelector('script[data-google-identity="true"]');

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.google), { once: true });
      existingScript.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = "true";
    script.onload = () => resolve(window.google);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, loginWithGoogle, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const googleButtonRef = useRef(null);
  const redirectedMessage = location.state?.message || "";
  const redirectTo = location.state?.from || "";

  useEffect(() => {
    if (mode !== "login" || !googleClientId || !googleButtonRef.current) {
      return undefined;
    }

    let cancelled = false;

    loadGoogleScript()
      .then((google) => {
        if (cancelled || !google?.accounts?.id || !googleButtonRef.current) {
          return;
        }

        google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            setLoading(true);
            setError("");

            try {
              const result = await loginWithGoogle({ credential: response.credential });
              const fallbackTarget = result?.user?.role === "admin" ? "/admin" : "/";
              navigate(redirectTo || fallbackTarget, { replace: true });
            } catch (requestError) {
              setError(requestError.response?.data?.message || "Google sign-in failed.");
            } finally {
              setLoading(false);
            }
          }
        });
        googleButtonRef.current.innerHTML = "";
        google.accounts.id.renderButton(googleButtonRef.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          width: 360,
          text: "continue_with"
        });
        setGoogleReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setGoogleReady(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loginWithGoogle, mode, navigate, redirectTo]);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
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
      setLoading(false);
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
        {redirectedMessage && (
          <div className="mt-6 rounded-2xl border border-brand-400/20 bg-brand-500/10 px-4 py-3 text-sm text-brand-50">
            {redirectedMessage}
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
            disabled={loading}
            className="w-full rounded-2xl bg-brand-500 px-5 py-3 font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
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
              <div className="mt-4 flex justify-center">
                <div ref={googleButtonRef} className="min-h-[44px] min-w-[260px]" />
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                Google login is not configured yet. Add the Google client ID to enable it.
              </div>
            )}
            {googleClientId && !googleReady ? (
              <p className="mt-3 text-center text-xs text-slate-500">Loading Google sign-in...</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
