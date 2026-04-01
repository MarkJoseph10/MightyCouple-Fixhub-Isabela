import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function parseFacebookHash() {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  return new URLSearchParams(hash);
}

function parseFacebookState(value) {
  if (!value) {
    return {};
  }

  try {
    return JSON.parse(window.atob(value));
  } catch {
    return {};
  }
}

export default function FacebookAuthCallbackPage() {
  const navigate = useNavigate();
  const { loginWithFacebook } = useAuth();
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Finishing Facebook sign-in...");
  const params = useMemo(() => parseFacebookHash(), []);

  useEffect(() => {
    let active = true;

    async function finishFacebookLogin() {
      const accessToken = params.get("access_token");
      const errorReason = params.get("error_reason");
      const errorDescription = params.get("error_description");
      const state = parseFacebookState(params.get("state"));

      if (errorReason || errorDescription) {
        if (!active) {
          return;
        }
        setError(errorDescription || "Facebook sign-in was cancelled.");
        setStatus("");
        return;
      }

      if (!accessToken) {
        if (!active) {
          return;
        }
        setError("Facebook did not return an access token.");
        setStatus("");
        return;
      }

      try {
        const result = await loginWithFacebook({ accessToken });
        const fallbackTarget = result?.user?.role === "admin" ? "/admin" : "/";
        navigate(state.redirectTo || fallbackTarget, { replace: true });
      } catch (requestError) {
        if (!active) {
          return;
        }
        setError(requestError.response?.data?.message || "Facebook sign-in failed.");
        setStatus("");
      } finally {
        window.history.replaceState({}, document.title, "/auth");
      }
    }

    finishFacebookLogin();

    return () => {
      active = false;
    };
  }, [loginWithFacebook, navigate, params]);

  return (
    <div className="page-shell py-10">
      <div className="mx-auto max-w-lg glass-panel rounded-[36px] p-8 shadow-ambient">
        <h1 className="text-3xl font-semibold text-white">Facebook sign-in</h1>
        {status ? <p className="mt-4 text-sm text-slate-300">{status}</p> : null}
        {error ? (
          <div className="mt-6 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>
        ) : null}
      </div>
    </div>
  );
}
