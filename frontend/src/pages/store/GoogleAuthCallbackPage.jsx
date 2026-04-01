import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function parseGoogleHash() {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  return new URLSearchParams(hash);
}

function parseGoogleState(value) {
  if (!value) {
    return {};
  }

  try {
    return JSON.parse(window.atob(value));
  } catch {
    return {};
  }
}

export default function GoogleAuthCallbackPage() {
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Finishing Google sign-in...");
  const params = useMemo(() => parseGoogleHash(), []);

  useEffect(() => {
    let active = true;

    async function finishGoogleLogin() {
      const accessToken = params.get("access_token");
      const errorDescription = params.get("error_description");
      const state = parseGoogleState(params.get("state"));

      if (errorDescription) {
        if (!active) {
          return;
        }
        setError(errorDescription);
        setStatus("");
        return;
      }

      if (!accessToken) {
        if (!active) {
          return;
        }
        setError("Google did not return an access token.");
        setStatus("");
        return;
      }

      try {
        const result = await loginWithGoogle({ accessToken });
        const fallbackTarget = result?.user?.role === "admin" ? "/admin" : "/";
        navigate(state.redirectTo || fallbackTarget, { replace: true });
      } catch (requestError) {
        if (!active) {
          return;
        }
        setError(requestError.response?.data?.message || "Google sign-in failed.");
        setStatus("");
      } finally {
        window.history.replaceState({}, document.title, "/auth");
      }
    }

    finishGoogleLogin();

    return () => {
      active = false;
    };
  }, [loginWithGoogle, navigate, params]);

  return (
    <div className="page-shell py-10">
      <div className="mx-auto max-w-lg glass-panel rounded-[36px] p-8 shadow-ambient">
        <h1 className="text-3xl font-semibold text-white">Google sign-in</h1>
        {status ? <p className="mt-4 text-sm text-slate-300">{status}</p> : null}
        {error ? (
          <div className="mt-6 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>
        ) : null}
      </div>
    </div>
  );
}
