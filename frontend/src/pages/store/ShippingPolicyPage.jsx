import { useMemo } from "react";
import InfoPageShell from "../../components/common/InfoPageShell";
import { useStoreSettings } from "../../context/StoreSettingsContext";
import { peso } from "../../utils/commerce";

export default function ShippingPolicyPage() {
  const { settings } = useStoreSettings();
  const shippingRows = useMemo(() => {
    if (settings.shipping?.mode !== "location") {
      return [{ label: "Nationwide", fee: Number(settings.shipping?.fixedFee || 0), timeline: "1 to 7 days depending on location" }];
    }

    const labels = new Set();
    return (settings.shipping?.locationFees || [])
      .filter((item) => {
        const key = `${item.label}-${item.fee}`;
        if (labels.has(key)) {
          return false;
        }

        labels.add(key);
        return true;
      })
      .map((item) => ({
        label: item.label || "Nationwide",
        fee: Number(item.fee || 0),
        timeline: item.label?.toLowerCase().includes("metro manila") ? "1 to 3 business days" : "3 to 7 business days"
      }));
  }, [settings.shipping]);

  return (
    <InfoPageShell
      eyebrow="Shipping Policy"
      title="How Mighty Couple ships your orders"
      description="We ship gadgets nationwide in the Philippines with transparent fees, delivery estimates, and tracking updates."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {shippingRows.map((row) => (
          <div key={`${row.label}-${row.fee}`} className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <p className="text-sm uppercase tracking-[0.28em] text-slate-400">{row.label}</p>
            <p className="mt-3 text-2xl font-semibold text-white">{peso(row.fee)}</p>
            <p className="mt-2 text-sm text-slate-300">{row.timeline}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-semibold text-white">Delivery estimates</h2>
          <div className="mt-4 space-y-3 text-slate-300">
            <p>Metro Manila orders usually arrive within 1 to 3 business days.</p>
            <p>Provincial orders usually arrive within 3 to 7 business days.</p>
            <p>Delivery times may change during holidays, severe weather, or courier delays.</p>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-semibold text-white">Tracking and fulfillment</h2>
          <div className="mt-4 space-y-3 text-slate-300">
            <p>Shipping fees are computed from your delivery location and shown again at checkout before you place the order.</p>
            <p>Tracking is available once the order is packed and marked as shipped.</p>
            <p>We share updates through the order timeline so you can follow verification, packing, shipping, and delivery.</p>
          </div>
        </section>
      </div>
    </InfoPageShell>
  );
}
