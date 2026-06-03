import { useMemo, useState } from "react";
import api from "../../api/client";

const providers = [
  {
    value: "cj-dropshipping",
    label: "CJ Dropshipping",
    mode: "Live integration",
    description: "Uses the real CJ API when CJ_API_KEY is configured on the backend."
  },
  {
    value: "aliexpress",
    label: "AliExpress",
    mode: "Sandbox",
    description: "Still uses demo/sample import data in the current build."
  },
  {
    value: "spocket",
    label: "Spocket",
    mode: "Sandbox",
    description: "Still uses demo/sample import data in the current build."
  }
];

export default function DropshippingPage() {
  const [provider, setProvider] = useState("cj-dropshipping");
  const [keyword, setKeyword] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [runningAction, setRunningAction] = useState("");
  const providerMeta = useMemo(
    () => providers.find((item) => item.value === provider) || providers[0],
    [provider]
  );

  async function runAction(action) {
    setError("");
    setRunningAction(action);

    try {
      const payload = {
        provider,
        ...(provider === "cj-dropshipping"
          ? {
              keyword: keyword.trim(),
              pageSize
            }
          : {})
      };
      const { data } = await api.post(`/suppliers/${action}`, payload);
      setOutput(JSON.stringify(data, null, 2));
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to complete supplier action.");
    } finally {
      setRunningAction("");
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
      <div className="glass-panel rounded-[32px] p-6 shadow-ambient">
        <h1 className="text-3xl font-semibold text-white">Dropshipping tools</h1>
        <p className="mt-2 text-sm text-slate-400">
          Connect a supplier, import products into your catalog, and run stock or price sync.
        </p>

        <div className="mt-6 rounded-[26px] border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Provider</p>
          <select
            value={provider}
            onChange={(event) => setProvider(event.target.value)}
            className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
          >
            {providers.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3">
            <p className="text-sm font-medium text-white">{providerMeta.mode}</p>
            <p className="mt-1 text-sm leading-6 text-slate-400">{providerMeta.description}</p>
          </div>
        </div>

        {provider === "cj-dropshipping" ? (
          <div className="mt-4 rounded-[26px] border border-cyan-400/15 bg-cyan-500/5 p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">CJ import filters</p>
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Optional keyword, e.g. smartphone"
              className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
            />
            <label className="mt-3 block text-sm text-slate-300">
              Import limit
              <input
                type="number"
                min="1"
                max="20"
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value) || 10)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none"
              />
            </label>
          </div>
        ) : null}

        <div className="mt-6 grid gap-3">
          <button
            onClick={() => runAction("connect")}
            disabled={!!runningAction}
            className="rounded-2xl bg-brand-500 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {runningAction === "connect" ? "Connecting..." : "Connect provider"}
          </button>
          <button
            onClick={() => runAction("import")}
            disabled={!!runningAction}
            className="rounded-2xl border border-white/10 px-5 py-3 text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {runningAction === "import" ? "Importing..." : "Import products"}
          </button>
          <button
            onClick={() => runAction("sync")}
            disabled={!!runningAction}
            className="rounded-2xl border border-white/10 px-5 py-3 text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {runningAction === "sync" ? "Syncing..." : "Sync stock and pricing"}
          </button>
        </div>

        {error ? <div className="mt-4 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      </div>

      <div className="glass-panel rounded-[32px] p-6 shadow-ambient">
        <h2 className="text-xl font-semibold text-white">Provider response</h2>
        <pre className="mt-6 overflow-auto rounded-[28px] bg-slate-950/70 p-5 text-sm text-slate-300">
          {output || "Run an action to see provider output here."}
        </pre>
      </div>
    </section>
  );
}
