import { peso } from "./commerce";

export function calculateInstallmentPlan(total, settings) {
  const config = settings?.installment || {};
  const paymentCount = Math.max(1, Number(config.paymentCount || 8));
  const downPaymentPercent = Math.max(0, Number(config.downPaymentPercent || 0));
  const serviceFeePercent = Math.max(0, Number(config.serviceFeePercent || 0));
  const frequency = config.frequency === "monthly" ? "monthly" : "weekly";
  const totalAmount = Number(total || 0);
  const serviceFeeAmount = Number((totalAmount * (serviceFeePercent / 100)).toFixed(2));
  const totalWithServiceFee = Number((totalAmount + serviceFeeAmount).toFixed(2));
  const downPaymentAmount = Number((totalWithServiceFee * (downPaymentPercent / 100)).toFixed(2));
  const financedAmount = Number(Math.max(0, totalWithServiceFee - downPaymentAmount).toFixed(2));
  const installmentAmount = Number((financedAmount / paymentCount).toFixed(2));
  const valid = config.enabled === true && totalAmount > 0 && paymentCount > 0 && installmentAmount > 0;

  return {
    enabled: valid,
    configured: config.enabled === true,
    valid,
    frequency,
    paymentCount,
    downPaymentPercent,
    serviceFeePercent,
    gracePeriodDays: Math.max(0, Number(config.gracePeriodDays || 0)),
    releaseCondition: config.releaseCondition === "admin_approved_early_release"
      ? "admin_approved_early_release"
      : "after_full_payment",
    totalAmount,
    serviceFeeAmount,
    totalWithServiceFee,
    downPaymentAmount,
    financedAmount,
    installmentAmount
  };
}

export function formatInstallmentBreakdown(plan) {
  if (!plan?.enabled || !plan?.valid) {
    return "";
  }

  return `${peso(plan.downPaymentAmount)} down payment, then ${peso(plan.installmentAmount)} ${plan.frequency} for ${plan.paymentCount} ${plan.frequency === "monthly" ? "months" : "weeks"}`;
}

export function getInstallmentStatusTone(status) {
  const tones = {
    active: "border-sky-400/20 bg-sky-500/10 text-sky-100",
    pending_verification: "border-amber-400/20 bg-amber-500/10 text-amber-100",
    late: "border-rose-400/20 bg-rose-500/10 text-rose-100",
    completed: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
    cancelled: "border-slate-400/20 bg-slate-500/10 text-slate-200"
  };

  return tones[status] || "border-white/10 bg-white/5 text-slate-200";
}

export function formatInstallmentStatus(status) {
  const labels = {
    active: "Active",
    pending_verification: "Pending verification",
    late: "Late",
    completed: "Completed",
    cancelled: "Cancelled"
  };

  return labels[status] || "Installment";
}

export function getInstallmentProgress(order) {
  const total = Number(order?.installment?.totalWithServiceFee || order?.pricing?.total || 0);
  const paid = Number(order?.installment?.amountPaid || 0);

  if (!total) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((paid / total) * 100)));
}

export function getInstallmentDueMeta(installment) {
  if (!installment?.nextDueDate || ["completed", "cancelled"].includes(String(installment.status || "").toLowerCase())) {
    return {
      label: "All settled",
      tone: "text-slate-400",
      daysLate: 0,
      daysUntilDue: null
    };
  }

  const nextDueDate = new Date(installment.nextDueDate);

  if (Number.isNaN(nextDueDate.getTime())) {
    return {
      label: "Due date unavailable",
      tone: "text-slate-400",
      daysLate: 0,
      daysUntilDue: null
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  nextDueDate.setHours(0, 0, 0, 0);
  const dayDiff = Math.round((nextDueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  const graceDays = Math.max(0, Number(installment.gracePeriodDays || 0));

  if (dayDiff < 0) {
    const daysLate = Math.abs(dayDiff);
    return {
      label: daysLate > graceDays ? `${daysLate} day(s) overdue` : `${daysLate} day(s) late, within grace period`,
      tone: daysLate > graceDays ? "text-rose-100" : "text-amber-100",
      daysLate,
      daysUntilDue: dayDiff
    };
  }

  if (dayDiff === 0) {
    return {
      label: "Due today",
      tone: "text-amber-100",
      daysLate: 0,
      daysUntilDue: 0
    };
  }

  if (dayDiff <= 3) {
    return {
      label: `Due in ${dayDiff} day(s)`,
      tone: "text-cyan-100",
      daysLate: 0,
      daysUntilDue: dayDiff
    };
  }

  return {
    label: `Due in ${dayDiff} day(s)`,
    tone: "text-slate-300",
    daysLate: 0,
    daysUntilDue: dayDiff
  };
}
