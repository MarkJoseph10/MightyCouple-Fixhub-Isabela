import { User } from "../models/User.js";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ensureSellerDisciplineShape, getNextSellerDisciplineStep, normalizeSellerSuspensionState } from "../utils/sellerDiscipline.js";
import { createNotifications } from "../services/notificationService.js";
import { getOrCreateStoreSettings } from "../services/storeSettingsService.js";
import { recordActivity } from "../services/activityLogService.js";

function generatePayoutReference(prefix = "PO") {
  const now = new Date();
  const dateStamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const randomChunk = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${dateStamp}-${randomChunk}`;
}

function isEligibleSellerPayoutOrder(order) {
  if (!order || String(order.status || "").toLowerCase() !== "delivered") {
    return false;
  }

  if (["approved", "refunded"].includes(String(order.refundRequest?.status || "").toLowerCase())) {
    return false;
  }

  if (String(order.payment?.method || "").toLowerCase() === "cod") {
    return true;
  }

  return String(order.payment?.status || "").toLowerCase() === "paid";
}

function calculateSellerFinancials(orders = [], sellerId) {
  const eligibleOrders = orders.filter(isEligibleSellerPayoutOrder);

  const totalRevenue = eligibleOrders.reduce(
    (sum, order) =>
      sum +
      (order.items || [])
        .filter((item) => String(item.sellerId) === String(sellerId))
        .reduce((itemSum, item) => itemSum + Number(item.price || 0) * Number(item.quantity || 0), 0),
    0
  );

  const totalCommission = eligibleOrders.reduce(
    (sum, order) =>
      sum +
      (order.items || [])
        .filter((item) => String(item.sellerId) === String(sellerId))
        .reduce((itemSum, item) => {
          const gross = Number(item.price || 0) * Number(item.quantity || 0);
          return itemSum + gross * (Number(item.commissionRate || 10) / 100);
        }, 0),
    0
  );

  return {
    eligibleOrders,
    totalRevenue,
    totalCommission
  };
}

function normalizePayoutPesoAmount(value) {
  return Math.max(0, Math.floor(Number(value || 0)));
}

function summarizePayoutRequests(payoutRequests = []) {
  return payoutRequests.reduce(
    (totals, request) => {
      const amount = normalizePayoutPesoAmount(request.requestedAmount || 0);
      const status = String(request.status || "").toLowerCase();

      if (status === "pending") {
        totals.pending += amount;
        totals.locked += amount;
      } else if (status === "approved") {
        totals.approved += amount;
        totals.locked += amount;
      } else if (status === "paid") {
        totals.paid += amount;
      } else if (status === "rejected") {
        totals.rejected += amount;
      }

      return totals;
    },
    { pending: 0, approved: 0, paid: 0, rejected: 0, locked: 0 }
  );
}

function hasOpenPayoutRequestForAmount(payoutRequests = [], amount) {
  return payoutRequests.some((request) => {
    const status = String(request.status || "").toLowerCase();
    return ["pending", "approved"].includes(status) && normalizePayoutPesoAmount(request.requestedAmount || 0) === amount;
  });
}

function buildSellerProfileSnapshot(user) {
  return {
    ...(user.sellerProfile?.toObject ? user.sellerProfile.toObject() : user.sellerProfile || {}),
    payoutDetails: {
      gcashNumber: String(user.sellerProfile?.payoutDetails?.gcashNumber || "").trim(),
      bankName: String(user.sellerProfile?.payoutDetails?.bankName || "").trim(),
      bankAccountName: String(user.sellerProfile?.payoutDetails?.bankAccountName || "").trim(),
      bankAccountNumber: String(user.sellerProfile?.payoutDetails?.bankAccountNumber || "").trim()
    },
    payoutRequests: [...(user.sellerProfile?.payoutRequests || [])],
    totalPayoutApproved: Number(user.sellerProfile?.totalPayoutApproved || 0),
    totalPayoutPaid: Number(user.sellerProfile?.totalPayoutPaid || 0),
    discipline: ensureSellerDisciplineShape(user),
    appeal: {
      status: String(user.sellerProfile?.appeal?.status || "none"),
      message: String(user.sellerProfile?.appeal?.message || ""),
      submittedAt: user.sellerProfile?.appeal?.submittedAt || null,
      reviewedAt: user.sellerProfile?.appeal?.reviewedAt || null,
      adminNote: String(user.sellerProfile?.appeal?.adminNote || "")
    }
  };
}

export const getUsers = asyncHandler(async (_, res) => {
  const users = await User.find().select("-password").sort({ createdAt: -1 });
  await Promise.all(
    users.map(async (user) => {
      if (normalizeSellerSuspensionState(user)) {
        await user.save();
      }
    })
  );
  res.json(users);
});

export const applyAsSeller = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.role === "admin") {
    throw new ApiError(400, "Admin accounts do not need a seller application");
  }

  const currentStatus = user.sellerApplication?.status || "none";

  if (["pending", "approved"].includes(currentStatus)) {
    throw new ApiError(400, currentStatus === "pending" ? "Your seller application is already pending review" : "You are already an approved seller");
  }

  const businessName = String(req.body.businessName || "").trim();
  const displayName = String(req.body.displayName || user.name || "").trim();
  const description = String(req.body.description || "").trim();
  const phone = String(req.body.phone || user.phone || "").trim();

  if (!businessName) {
    throw new ApiError(400, "Business name is required");
  }

  user.sellerApplication = {
    status: "pending",
    businessName,
    displayName,
    description,
    phone,
    gcashNumber: String(req.body.gcashNumber || "").trim(),
    bankName: String(req.body.bankName || "").trim(),
    bankAccountName: String(req.body.bankAccountName || "").trim(),
    bankAccountNumber: String(req.body.bankAccountNumber || "").trim(),
    submittedAt: new Date(),
    reviewedAt: null,
    rejectionReason: "",
    adminNote: ""
  };
  await user.save();
  const storeSettings = await getOrCreateStoreSettings();
  await createNotifications({
    settings: storeSettings,
    type: "seller_application_submitted",
    title: "Seller application submitted",
    message: `${displayName || user.name} submitted a seller application.`,
    link: "/admin/customers",
    data: {
      userId: user._id.toString(),
      businessName,
      displayName
    },
    recipients: [
      {
        role: "admin",
        title: "Seller application submitted",
        message: `${displayName || user.name} submitted a seller application.`,
        link: "/admin/customers"
      }
    ]
  });

  await recordActivity({
    actor: req.user,
    category: "seller",
    action: "seller_application_submitted",
    title: "Seller application submitted",
    message: `${displayName || user.name} submitted a seller application.`,
    link: "/admin/customers",
    subjectType: "seller_application",
    subjectId: user._id.toString(),
    metadata: {
      businessName,
      displayName
    }
  }).catch(() => {});

  res.status(201).json({
    message: "Seller application submitted successfully.",
    sellerApplication: user.sellerApplication
  });
});

export const getMySellerProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (normalizeSellerSuspensionState(user)) {
    await user.save();
  }

  res.json(user);
});

export const getSellerApplications = asyncHandler(async (_, res) => {
  const users = await User.find({
    "sellerApplication.status": { $in: ["pending", "approved", "rejected", "suspended", "terminated"] }
  })
    .select("-password")
    .sort({ "sellerApplication.submittedAt": -1, createdAt: -1 });

  await Promise.all(
    users.map(async (user) => {
      if (normalizeSellerSuspensionState(user)) {
        await user.save();
      }
    })
  );

  res.json(users);
});

export const reviewSellerApplication = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new ApiError(404, "Seller application not found");
  }

  const decision = String(req.body.status || "").trim().toLowerCase();
  const adminNote = String(req.body.adminNote || "").trim();
  const rejectionReason = String(req.body.rejectionReason || "").trim();

  if (!["approved", "rejected", "suspended"].includes(decision)) {
    throw new ApiError(400, "Invalid seller application decision");
  }

  const sellerProfile = buildSellerProfileSnapshot(user);
  user.sellerApplication = {
    ...((typeof user.sellerApplication?.toObject === "function" ? user.sellerApplication.toObject() : user.sellerApplication) || {}),
    status: decision,
    reviewedAt: new Date(),
    adminNote,
    rejectionReason: decision === "rejected" ? rejectionReason : ""
  };

  if (decision === "approved") {
    user.role = "seller";
    user.sellerProfile = {
      ...sellerProfile,
      storeName: user.sellerApplication.businessName || user.name,
      displayName: user.sellerApplication.displayName || user.name,
      description: user.sellerApplication.description || "",
      statusNote: "Approved and active on the marketplace",
      commissionRate: Number(sellerProfile.commissionRate || 10),
      isActive: true,
      approvedAt: new Date(),
      payoutDetails: {
        gcashNumber: user.sellerApplication.gcashNumber || sellerProfile.payoutDetails?.gcashNumber || "",
        bankName: user.sellerApplication.bankName || sellerProfile.payoutDetails?.bankName || "",
        bankAccountName: user.sellerApplication.bankAccountName || sellerProfile.payoutDetails?.bankAccountName || "",
        bankAccountNumber: user.sellerApplication.bankAccountNumber || sellerProfile.payoutDetails?.bankAccountNumber || ""
      },
      appeal: {
        status: "none",
        message: "",
        submittedAt: null,
        reviewedAt: null,
        adminNote: ""
      },
      discipline: {
        ...sellerProfile.discipline,
        currentStage: sellerProfile.discipline?.terminatedAt ? "terminated" : "good_standing",
        suspendedAt: null,
        suspendedUntil: null
      }
    };
  }

  if (decision === "suspended") {
    const discipline = ensureSellerDisciplineShape(user);
    const step = getNextSellerDisciplineStep(discipline.offenseCount);
    const now = new Date();
    const suspendedUntil = step.durationDays ? new Date(now.getTime() + step.durationDays * 24 * 60 * 60 * 1000) : null;
    const nextHistory = [
      ...discipline.history,
      {
        offenseNumber: step.offenseNumber,
        action: step.action,
        durationDays: step.durationDays,
        note: adminNote || step.label,
        createdAt: now,
        endsAt: suspendedUntil
      }
    ];

    user.sellerProfile = {
      ...sellerProfile,
      isActive: step.action === "termination" ? false : false,
      statusNote:
        step.action === "termination"
          ? adminNote || "Seller account has been terminated after repeated violations."
          : adminNote || `${step.label}. Seller access is paused for ${step.durationDays} day(s).`,
      payoutDetails: {
        ...sellerProfile.payoutDetails
      },
      appeal: {
        status: "none",
        message: "",
        submittedAt: null,
        reviewedAt: null,
        adminNote: ""
      },
      discipline: {
        ...discipline,
        offenseCount: step.offenseNumber,
        currentStage: step.stage,
        suspendedAt: step.action === "termination" ? discipline.suspendedAt : now,
        suspendedUntil,
        terminatedAt: step.action === "termination" ? now : null,
        lastReason: adminNote || step.label,
        history: nextHistory
      }
    };
    user.sellerApplication.status = step.action === "termination" ? "terminated" : "suspended";
  }

  await user.save();
  const storeSettings = await getOrCreateStoreSettings();
  await createNotifications({
    settings: storeSettings,
    type:
      decision === "approved"
        ? "seller_application_approved"
        : decision === "rejected"
          ? "seller_application_rejected"
          : "seller_suspended",
    title:
      decision === "approved"
        ? "Seller application approved"
        : decision === "rejected"
          ? "Seller application rejected"
          : "Seller suspended",
    message:
      decision === "approved"
        ? "Your seller application was approved."
        : decision === "rejected"
          ? "Your seller application was rejected."
          : `Your seller access was ${getNextSellerDisciplineStep(ensureSellerDisciplineShape(user).offenseCount).label.toLowerCase()}.`,
    link: "/seller",
    data: {
      userId: user._id.toString(),
      decision,
      adminNote,
      rejectionReason
    },
    recipients: [
      {
        userId: user._id,
        title:
          decision === "approved"
            ? "Seller application approved"
            : decision === "rejected"
              ? "Seller application rejected"
              : "Seller suspended",
        message:
          decision === "approved"
            ? "Your seller application was approved."
            : decision === "rejected"
              ? "Your seller application was rejected."
              : `Your seller access was ${getNextSellerDisciplineStep(ensureSellerDisciplineShape(user).offenseCount).label.toLowerCase()}.`,
        link: "/seller"
      }
    ]
  });

  await recordActivity({
    actor: req.user,
    category: "seller",
    action: `seller_application_${decision}`,
    title:
      decision === "approved"
        ? "Seller application approved"
        : decision === "rejected"
          ? "Seller application rejected"
          : "Seller suspended",
    message:
      decision === "approved"
        ? `${user.sellerApplication.displayName || user.name} was approved as a seller.`
        : decision === "rejected"
          ? `${user.sellerApplication.displayName || user.name} was rejected as a seller.`
          : `${user.sellerApplication.displayName || user.name} was suspended as a seller.`,
    link: "/admin/customers",
    subjectType: "seller_application",
    subjectId: user._id.toString(),
    severity: decision === "approved" ? "success" : decision === "rejected" ? "warning" : "danger",
    metadata: {
      decision,
      adminNote,
      rejectionReason
    }
  }).catch(() => {});
  res.json({
    message: `Seller application ${decision}.`,
    user
  });
});

export const updateSellerProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user || user.role !== "seller") {
    throw new ApiError(403, "Seller access only");
  }

  user.sellerProfile = {
    ...(user.sellerProfile || {}),
    storeName: String(req.body.storeName || user.sellerProfile?.storeName || user.name).trim(),
    displayName: String(req.body.displayName || user.sellerProfile?.displayName || user.name).trim(),
    description: String(req.body.description || user.sellerProfile?.description || "").trim(),
    avatar: String(req.body.avatar || user.sellerProfile?.avatar || "").trim(),
    banner: String(req.body.banner || user.sellerProfile?.banner || "").trim(),
    statusNote: String(req.body.statusNote || user.sellerProfile?.statusNote || "").trim(),
    payoutDetails: {
      gcashNumber: String(req.body.gcashNumber || user.sellerProfile?.payoutDetails?.gcashNumber || "").trim(),
      bankName: String(req.body.bankName || user.sellerProfile?.payoutDetails?.bankName || "").trim(),
      bankAccountName: String(req.body.bankAccountName || user.sellerProfile?.payoutDetails?.bankAccountName || "").trim(),
      bankAccountNumber: String(req.body.bankAccountNumber || user.sellerProfile?.payoutDetails?.bankAccountNumber || "").trim()
    },
    payoutRequests: user.sellerProfile?.payoutRequests || [],
    totalPayoutApproved: Number(user.sellerProfile?.totalPayoutApproved || 0),
    totalPayoutPaid: Number(user.sellerProfile?.totalPayoutPaid || 0)
  };

  await user.save();
  res.json({
    message: "Seller profile updated successfully.",
    user
  });
});

export const submitSellerAppeal = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user || user.role !== "seller") {
    throw new ApiError(403, "Seller access only");
  }

  if (user.sellerProfile?.isActive !== false) {
    throw new ApiError(400, "Only suspended sellers can submit an appeal");
  }

  const message = String(req.body.message || "").trim();

  if (message.length < 20) {
    throw new ApiError(400, "Please provide a clearer appeal message with at least 20 characters");
  }

  const sellerProfile = buildSellerProfileSnapshot(user);

  if (sellerProfile.appeal?.status !== "none") {
    throw new ApiError(
      400,
      sellerProfile.appeal?.status === "pending"
        ? "You already have a pending appeal under review"
        : "You already used your appeal for this suspension. Please wait until the suspension period ends."
    );
  }

  user.sellerProfile = {
    ...sellerProfile,
    appeal: {
      status: "pending",
      message,
      submittedAt: new Date(),
      reviewedAt: null,
      adminNote: ""
    }
  };

  await user.save();
  const storeSettings = await getOrCreateStoreSettings();
  await createNotifications({
    settings: storeSettings,
    settingKey: "appealSubmitted",
    type: "seller_appeal_submitted",
    title: "Seller appeal submitted",
    message: `${user.sellerProfile?.displayName || user.name} submitted a seller appeal.`,
    link: "/admin/customers",
    data: {
      userId: user._id.toString(),
      appealMessage: message
    },
    recipients: [
      {
        role: "admin",
        title: "Seller appeal submitted",
        message: `${user.sellerProfile?.displayName || user.name} submitted a seller appeal.`,
        link: "/admin/customers"
      }
    ]
  });

  await recordActivity({
    actor: req.user,
    category: "seller",
    action: "seller_appeal_submitted",
    title: "Seller appeal submitted",
    message: `${user.sellerProfile?.displayName || user.name} submitted a seller appeal.`,
    link: "/admin/customers",
    subjectType: "seller_appeal",
    subjectId: user._id.toString(),
    metadata: {
      appealMessage: message
    }
  }).catch(() => {});

  res.status(201).json({
    message: "Seller appeal submitted successfully.",
    user
  });
});

export const reviewSellerAppeal = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user || user.role !== "seller") {
    throw new ApiError(404, "Seller not found");
  }

  const decision = String(req.body.status || "").trim().toLowerCase();
  const adminNote = String(req.body.adminNote || "").trim();

  if (!["approved", "rejected"].includes(decision)) {
    throw new ApiError(400, "Invalid appeal decision");
  }

  const sellerProfile = buildSellerProfileSnapshot(user);

  if (sellerProfile.appeal?.status !== "pending") {
    throw new ApiError(400, "There is no pending appeal to review");
  }

  const nextAppeal = {
    ...sellerProfile.appeal,
    status: decision,
    reviewedAt: new Date(),
    adminNote
  };

  const nextSellerProfile = {
    ...sellerProfile,
    appeal: nextAppeal
  };

  if (decision === "approved") {
    nextSellerProfile.isActive = true;
    nextSellerProfile.statusNote = adminNote || "Seller appeal approved. Selling access has been restored.";
    nextSellerProfile.discipline = {
      ...sellerProfile.discipline,
      currentStage: "good_standing",
      suspendedAt: null,
      suspendedUntil: null,
      terminatedAt: null,
      lastReason: adminNote || sellerProfile.discipline?.lastReason || ""
    };
    user.sellerApplication.status = "approved";
  } else {
    nextSellerProfile.statusNote = adminNote || sellerProfile.statusNote || "Seller appeal was reviewed and suspension remains active.";
    user.sellerApplication.status = user.sellerApplication?.status === "terminated" ? "terminated" : "suspended";
  }

  user.sellerProfile = nextSellerProfile;
  await user.save();
  const storeSettings = await getOrCreateStoreSettings();
  await createNotifications({
    settings: storeSettings,
    settingKey: "appealResolved",
    type: decision === "approved" ? "seller_appeal_approved" : "seller_appeal_rejected",
    title: decision === "approved" ? "Seller appeal approved" : "Seller appeal rejected",
    message:
      decision === "approved"
        ? "Your seller appeal was approved and access has been restored."
        : "Your seller appeal was rejected and the suspension remains active.",
    link: "/seller/appeal",
    data: {
      userId: user._id.toString(),
      decision,
      adminNote
    },
    recipients: [
      {
        userId: user._id,
        title: decision === "approved" ? "Seller appeal approved" : "Seller appeal rejected",
        message:
          decision === "approved"
            ? "Your seller appeal was approved and access has been restored."
            : "Your seller appeal was rejected and the suspension remains active.",
        link: "/seller/appeal"
      }
    ]
  });

  await recordActivity({
    actor: req.user,
    category: "seller",
    action: `seller_appeal_${decision}`,
    title: decision === "approved" ? "Seller appeal approved" : "Seller appeal rejected",
    message:
      decision === "approved"
        ? `${user.sellerProfile?.displayName || user.name} was restored after appeal approval.`
        : `${user.sellerProfile?.displayName || user.name} appeal was rejected.`,
    link: "/admin/customers",
    subjectType: "seller_appeal",
    subjectId: user._id.toString(),
    severity: decision === "approved" ? "success" : "warning",
    metadata: {
      decision,
      adminNote
    }
  }).catch(() => {});

  res.json({
    message: `Seller appeal ${decision}.`,
    user
  });
});

export const getSellerDashboardSummary = asyncHandler(async (req, res) => {
  const sellerId = req.user._id;
  const products = await Product.find({ owner: sellerId, vendorType: "seller" });
  const allOrders = await Order.find({ "items.sellerId": sellerId }).sort({ createdAt: -1 });
  const recentOrders = allOrders.slice(0, 5);
  const { totalRevenue, totalCommission } = calculateSellerFinancials(allOrders, sellerId);

  const approvedProducts = products.filter((product) => product.approvalStatus === "approved");
  const rejectedProducts = products.filter((product) => product.approvalStatus === "rejected");
  const pendingProducts = products.filter((product) => product.approvalStatus === "pending");
  const payoutRequests = (req.user.sellerProfile?.payoutRequests || []).slice().sort((left, right) => {
    return new Date(right.requestedAt || right.createdAt || 0) - new Date(left.requestedAt || left.createdAt || 0);
  });
  const paidOut = normalizePayoutPesoAmount(req.user.sellerProfile?.totalPayoutPaid || 0);
  const payoutSummary = summarizePayoutRequests(payoutRequests);
  const approvedPayouts = payoutSummary.approved + payoutSummary.paid;
  const pendingPayouts = payoutSummary.pending;
  const netRevenue = normalizePayoutPesoAmount(totalRevenue - totalCommission);
  const availableForPayout = normalizePayoutPesoAmount(netRevenue - paidOut - payoutSummary.locked);

  res.json({
    productsCount: products.length,
    approvedProductsCount: approvedProducts.length,
    pendingProductsCount: pendingProducts.length,
    rejectedProductsCount: rejectedProducts.length,
    totalRevenue,
    totalCommission,
    netRevenue,
    recentOrders,
    payoutRequests: payoutRequests.slice(0, 6),
    pendingPayouts,
    approvedPayouts,
    paidOut,
    availableForPayout,
    statusBreakdown: {
      approved: approvedProducts.length,
      pending: pendingProducts.length,
      rejected: rejectedProducts.length
    },
    recentProductStatuses: products
      .slice()
      .sort((left, right) => new Date(right.updatedAt || right.createdAt || 0) - new Date(left.updatedAt || left.createdAt || 0))
      .slice(0, 6)
      .map((product) => ({
        id: product._id,
        name: product.name,
        approvalStatus: product.approvalStatus || "pending",
        approvalNote: product.approvalNote || "",
        updatedAt: product.updatedAt || product.createdAt
      }))
  });
});

export const requestSellerPayout = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user || user.role !== "seller") {
    throw new ApiError(403, "Seller access only");
  }

  const sellerId = user._id;
  const orders = await Order.find({ "items.sellerId": sellerId });
  const { totalRevenue, totalCommission } = calculateSellerFinancials(orders, sellerId);

  const paidOut = normalizePayoutPesoAmount(user.sellerProfile?.totalPayoutPaid || 0);
  const payoutSummary = summarizePayoutRequests(user.sellerProfile?.payoutRequests || []);
  const netRevenue = normalizePayoutPesoAmount(totalRevenue - totalCommission);
  const availableForPayout = normalizePayoutPesoAmount(netRevenue - paidOut - payoutSummary.locked);
  const requestedAmount = normalizePayoutPesoAmount(req.body.requestedAmount || 0);

  if (!requestedAmount || requestedAmount <= 0) {
    throw new ApiError(400, "Requested payout amount must be greater than zero");
  }

  if (requestedAmount > availableForPayout) {
    throw new ApiError(400, "Requested amount exceeds available payout balance");
  }

  if (hasOpenPayoutRequestForAmount(user.sellerProfile?.payoutRequests || [], requestedAmount)) {
    throw new ApiError(400, "A payout request for this amount is already pending review");
  }

  const sellerProfile = buildSellerProfileSnapshot(user);
  const nextPayoutRequests = [
    ...sellerProfile.payoutRequests,
      {
        requestCode: generatePayoutReference("PR"),
        requestedAmount,
        status: "pending",
        note: String(req.body.note || "").trim(),
      requestedAt: new Date()
    }
  ];

  const updatedUser = await User.findOneAndUpdate(
    {
      _id: user._id,
      updatedAt: user.updatedAt
    },
    {
      $set: {
        sellerProfile: {
          ...sellerProfile,
          payoutRequests: nextPayoutRequests
        }
      }
    },
    { new: true, runValidators: true }
  );

    if (!updatedUser) {
      throw new ApiError(409, "Your payout balance was updated elsewhere. Refresh and try again.");
    }

    const storeSettings = await getOrCreateStoreSettings();
    await createNotifications({
      settings: storeSettings,
      type: "seller_payout_requested",
      title: "Seller payout requested",
      message: `${updatedUser.name || "A seller"} submitted a payout request.`,
      link: "/admin/customers",
      data: {
        userId: updatedUser._id.toString(),
        requestedAmount,
        requestCode: nextPayoutRequests[nextPayoutRequests.length - 1]?.requestCode || ""
      },
      recipients: [
        {
          role: "admin",
          title: "Seller payout requested",
          message: `${updatedUser.name || "A seller"} submitted a payout request.`,
          link: "/admin/customers"
        }
      ]
    });

    await recordActivity({
      actor: req.user,
      category: "seller",
      action: "seller_payout_requested",
      title: "Seller payout requested",
      message: `${updatedUser.name || "A seller"} submitted a payout request for ${requestedAmount}.`,
      link: "/admin/customers",
      subjectType: "seller_payout",
      subjectId: updatedUser._id.toString(),
      metadata: {
        requestedAmount,
        requestCode: nextPayoutRequests[nextPayoutRequests.length - 1]?.requestCode || ""
      }
    }).catch(() => {});

    res.status(201).json({
      message: "Payout request submitted successfully.",
      payoutRequests: updatedUser.sellerProfile?.payoutRequests || []
  });
});

export const reviewSellerPayout = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user || user.role !== "seller") {
    throw new ApiError(404, "Seller not found");
  }

  const requestId = String(req.params.requestId || "");
  const nextStatus = String(req.body.status || "").trim().toLowerCase();

  if (!["approved", "paid", "rejected"].includes(nextStatus)) {
    throw new ApiError(400, "Invalid payout decision");
  }

  const sellerProfile = buildSellerProfileSnapshot(user);
  const payoutRequests = [...sellerProfile.payoutRequests];
  const requestIndex = payoutRequests.findIndex((entry) => String(entry._id) === requestId);

  if (requestIndex === -1) {
    throw new ApiError(404, "Payout request not found");
  }

  const targetRequest = payoutRequests[requestIndex];
  targetRequest.status = nextStatus;
  targetRequest.adminNote = String(req.body.adminNote || "").trim();
  targetRequest.reviewedAt = new Date();

  if (nextStatus === "approved") {
    targetRequest.approvedReference = targetRequest.approvedReference || generatePayoutReference("PA");
  }

  if (nextStatus === "paid") {
    targetRequest.paidAt = new Date();
    targetRequest.approvedReference = targetRequest.approvedReference || generatePayoutReference("PA");
    targetRequest.paidReference = targetRequest.paidReference || generatePayoutReference("PD");
  }

  user.sellerProfile = {
    ...sellerProfile,
    payoutRequests,
    totalPayoutApproved: payoutRequests
      .filter((entry) => ["approved", "paid"].includes(entry.status))
      .reduce((sum, entry) => sum + Number(entry.requestedAmount || 0), 0),
    totalPayoutPaid: payoutRequests
      .filter((entry) => entry.status === "paid")
      .reduce((sum, entry) => sum + Number(entry.requestedAmount || 0), 0)
  };

  await user.save();
  const storeSettings = await getOrCreateStoreSettings();
  await createNotifications({
    settings: storeSettings,
    type: `seller_payout_${nextStatus}`,
    title:
      nextStatus === "approved"
        ? "Seller payout approved"
        : nextStatus === "paid"
          ? "Seller payout paid"
          : "Seller payout rejected",
    message:
      nextStatus === "approved"
        ? "Your payout request was approved."
        : nextStatus === "paid"
          ? "Your payout has been marked as paid."
          : "Your payout request was rejected.",
    link: "/seller",
    data: {
      userId: user._id.toString(),
      requestId,
      nextStatus
    },
    recipients: [
      {
        userId: user._id,
        title:
          nextStatus === "approved"
            ? "Seller payout approved"
            : nextStatus === "paid"
              ? "Seller payout paid"
              : "Seller payout rejected",
        message:
          nextStatus === "approved"
            ? "Your payout request was approved."
            : nextStatus === "paid"
              ? "Your payout has been marked as paid."
              : "Your payout request was rejected.",
        link: "/seller"
      }
    ]
  });

  await recordActivity({
    actor: req.user,
    category: "seller",
    action: `seller_payout_${nextStatus}`,
    title:
      nextStatus === "approved"
        ? "Seller payout approved"
        : nextStatus === "paid"
          ? "Seller payout paid"
          : "Seller payout rejected",
    message: `Seller payout request ${nextStatus} for ${user.name || "seller"}.`,
    link: "/admin/customers",
    subjectType: "seller_payout",
    subjectId: user._id.toString(),
    severity: nextStatus === "paid" ? "success" : nextStatus === "approved" ? "info" : "warning",
    metadata: {
      requestId,
      nextStatus,
      amount: targetRequest.requestedAmount
    }
  }).catch(() => {});

  res.json({
    message: `Payout request ${nextStatus}.`,
    user
  });
});

export const getWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate("wishlist");
  res.json(user.wishlist || []);
});

export const toggleWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const productId = req.params.productId;
  const exists = user.wishlist.some((item) => item.toString() === productId);

  if (exists) {
    user.wishlist = user.wishlist.filter((item) => item.toString() !== productId);
    await Product.findByIdAndUpdate(productId, { $inc: { favoritesCount: -1 } });
  } else {
    user.wishlist.push(productId);
    await Product.findByIdAndUpdate(productId, { $inc: { favoritesCount: 1 } });
  }

  await user.save();
  res.json({
    productId,
    wished: !exists
  });
});
