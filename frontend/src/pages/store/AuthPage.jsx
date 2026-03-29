import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const initialForm = { name: "", email: "", password: "" };

export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const redirectedMessage = location.state?.message || "";
  const redirectTo = location.state?.from || "";

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
      </div>
    </div>
  );
}
