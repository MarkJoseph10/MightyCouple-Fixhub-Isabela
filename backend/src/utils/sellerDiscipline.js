const suspensionSteps = [
  { offenseNumber: 1, action: "warning", durationDays: 3, stage: "warning", label: "First offense warning" },
  { offenseNumber: 2, action: "suspension", durationDays: 7, stage: "suspended", label: "Second offense suspension" },
  { offenseNumber: 3, action: "suspension", durationDays: 15, stage: "suspended", label: "Third offense suspension" },
  { offenseNumber: 4, action: "termination", durationDays: 0, stage: "terminated", label: "Fourth offense termination" }
];

export function getNextSellerDisciplineStep(offenseCount = 0) {
  const nextOffense = Number(offenseCount || 0) + 1;
  return suspensionSteps.find((step) => step.offenseNumber === nextOffense) || suspensionSteps[suspensionSteps.length - 1];
}

export function ensureSellerDisciplineShape(user) {
  if (!user?.sellerProfile) {
    return {
      offenseCount: 0,
      currentStage: "good_standing",
      suspendedAt: null,
      suspendedUntil: null,
      terminatedAt: null,
      lastReason: "",
      history: []
    };
  }

  const discipline = user.sellerProfile?.discipline || {};
  return {
    offenseCount: Number(discipline.offenseCount || 0),
    currentStage: discipline.currentStage || "good_standing",
    suspendedAt: discipline.suspendedAt || null,
    suspendedUntil: discipline.suspendedUntil || null,
    terminatedAt: discipline.terminatedAt || null,
    lastReason: discipline.lastReason || "",
    history: [...(discipline.history || [])]
  };
}

export function normalizeSellerSuspensionState(user) {
  if (!user?.sellerProfile) {
    return false;
  }

  const discipline = ensureSellerDisciplineShape(user);
  const now = new Date();

  if (discipline.currentStage === "terminated" || discipline.terminatedAt) {
    return false;
  }

  if (user.sellerProfile.isActive === false && discipline.suspendedUntil && new Date(discipline.suspendedUntil) <= now) {
    user.sellerProfile.isActive = true;
    user.sellerProfile.statusNote = "Seller access has been automatically restored after the suspension period.";
    user.sellerApplication.status = "approved";
    user.sellerProfile.discipline = {
      ...discipline,
      currentStage: "good_standing",
      suspendedAt: null,
      suspendedUntil: null
    };
    return true;
  }

  return false;
}
