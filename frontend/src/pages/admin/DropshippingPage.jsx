import { useState } from "react";
import api from "../../api/client";

const providers = ["aliexpress", "cj-dropshipping", "spocket"];

export default function DropshippingPage() {
  const [provider, setProvider] = useState("aliexpress");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  async function runAction(action) {
    setError("");

    try {
      const { data } = await api.post(`/suppliers/${action}`, { provider });
      setOutput(JSON.stringify(data, null, 2));
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to complete supplier action.");
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="glass-panel rounded-[32px] p-6 shadow-ambient">
        <h1 className="text-3xl font-semibold text-white">Dropshipping tools</h1>
        <p className="mt-2 text-sm text-slate-400">
          Connect a provider, import supplier items, and trigger stock sync workflows.
        </p>
        <select
          value={provider}
          onChange={(event) => setProvider(event.target.value)}
          className="mt-6 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
        >
          {providers.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <div className="mt-6 grid gap-3">
          <button onClick={() => runAction("connect")} className="rounded-2xl bg-brand-500 px-5 py-3 font-semibold text-white">
            Connect provider
          </button>
          <button onClick={() => runAction("import")} className="rounded-2xl border border-white/10 px-5 py-3 text-slate-100">
            Import products
          </button>
          <button onClick={() => runAction("sync")} className="rounded-2xl border border-white/10 px-5 py-3 text-slate-100">
            Sync stock and pricing
          </button>
        </div>
        {error && <div className="mt-4 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}
      </div>

      <div className="glass-panel rounded-[32px] p-6 shadow-ambient">
        <h2 className="text-xl font-semibold text-white">Sandbox response</h2>
        <pre className="mt-6 overflow-auto rounded-[28px] bg-slate-950/70 p-5 text-sm text-slate-300">
          {output || "Run an action to see provider output here."}
        </pre>
      </div>
    </section>
  );
}
