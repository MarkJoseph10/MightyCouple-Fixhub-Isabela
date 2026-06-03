import { CalendarClock, PackageCheck, Truck } from "lucide-react";
import { peso } from "../../utils/commerce";
import { getInstallmentCompletionSnapshot } from "../../utils/orders";

function SnapshotItem({ icon: Icon, label, value, detail }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-400">
        <Icon size={15} className="text-cyan-300" />
        {label}
      </div>
      <p className="mt-3 text-lg font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-300">{detail}</p>
    </div>
  );
}

export default function InstallmentCompletionSnapshot({ order }) {
  const snapshot = getInstallmentCompletionSnapshot(order);

  if (!snapshot) {
    return null;
  }

  return (
    <div className="rounded-[28px] border border-emerald-400/20 bg-emerald-500/10 p-5">
      <div className="flex items-center gap-2 text-sm uppercase tracking-[0.28em] text-emerald-100/80">
        <PackageCheck size={16} className="text-emerald-300" />
        Completed installment snapshot
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SnapshotItem
          icon={CalendarClock}
          label="Fully paid"
          value={snapshot.fullyPaidAt ? new Date(snapshot.fullyPaidAt).toLocaleDateString() : peso(snapshot.totalPaid)}
          detail={snapshot.fullyPaidAt ? `Settled at ${new Date(snapshot.fullyPaidAt).toLocaleTimeString()}` : `Total paid ${peso(snapshot.totalPaid)}`}
        />
        <SnapshotItem
          icon={Truck}
          label="Shipment"
          value={snapshot.shippingLabel}
          detail={snapshot.shippingDetail}
        />
        <SnapshotItem
          icon={PackageCheck}
          label="Tracking ready"
          value={snapshot.canTrack ? "Yes" : "Pending"}
          detail={snapshot.canTrack ? "Customer can continue using the order tracker." : "Tracking link becomes useful once shipment starts."}
        />
      </div>
    </div>
  );
}
