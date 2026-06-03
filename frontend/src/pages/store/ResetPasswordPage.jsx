import { CheckCircle2, KeyRound, LoaderCircle } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import PasswordInput from "../../components/common/PasswordInput";
import { resetPasswordWithToken } from "../../services/authService";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const hasToken = useMemo(() => Boolean(token.trim()), [token]);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const data = await resetPasswordWithToken({
        token,
        password: passwordRef.current?.value || "",
        confirmPassword: confirmPasswordRef.current?.value || ""
      });
      if (passwordRef.current) passwordRef.current.value = "";
      if (confirmPasswordRef.current) confirmPasswordRef.current.value = "";
      setMessage(data?.message || "Password reset successful.");
      window.setTimeout(() => {
        navigate("/auth", {
          replace: true,
          state: { message: "Password updated. You can sign in now." }
        });
      }, 1500);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to reset password right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell py-10">
      <div className="mx-auto max-w-xl glass-panel rounded-[36px] p-8 shadow-ambient">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-[20px] border border-white/10 bg-white/5 text-white">
            <KeyRound size={20} />
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Password recovery</p>
            <h1 className="mt-1 text-3xl font-semibold text-white">Create a new password</h1>
          </div>
        </div>

        <p className="mt-4 text-sm leading-7 text-slate-400">
          Choose a fresh password for your account. This link only works for a limited time.
        </p>

        {!hasToken ? (
          <div className="mt-6 rounded-[28px] border border-rose-400/20 bg-rose-500/10 p-5 text-sm text-rose-100">
            This reset link is incomplete or invalid. Please request a new one from the sign-in page.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block space-y-2">
              <span className="text-xs uppercase tracking-[0.22em] text-slate-400">New password</span>
              <PasswordInput
                ref={passwordRef}
                required
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 pr-14 text-white outline-none"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs uppercase tracking-[0.22em] text-slate-400">Confirm password</span>
              <PasswordInput
                ref={confirmPasswordRef}
                required
                autoComplete="new-password"
                placeholder="Type it again"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 pr-14 text-white outline-none"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 px-5 py-3 font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
            >
              {loading ? <LoaderCircle size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {loading ? "Updating password..." : "Reset password"}
            </button>
          </form>
        )}

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-50">
            {message}
          </div>
        ) : null}

        <Link to="/auth" className="mt-6 inline-flex text-sm font-medium text-brand-200 transition hover:text-white">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
