import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { User } from "../models/User.js";
import { NewsletterSubscriber } from "../models/NewsletterSubscriber.js";
import { getOrCreateStoreSettings } from "./storeSettingsService.js";
import { autoCancelStalePendingOrders } from "./orderAutomationService.js";

function getDateKey(date, mode) {
  const current = new Date(date);

  if (mode === "month") {
    return `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
  }

  if (mode === "week") {
    const workingDate = new Date(Date.UTC(current.getFullYear(), current.getMonth(), current.getDate()));
    const dayNumber = workingDate.getUTCDay() || 7;
    workingDate.setUTCDate(workingDate.getUTCDate() + 4 - dayNumber);
    const yearStart = new Date(Date.UTC(workingDate.getUTCFullYear(), 0, 1));
    const weekNumber = Math.ceil((((workingDate - yearStart) / 86400000) + 1) / 7);

    return `${workingDate.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
  }

  return `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
}

function buildRevenueSeries(orders, mode, limit) {
  const grouped = new Map();

  orders.forEach((order) => {
    const key = getDateKey(order.createdAt, mode);
    grouped.set(key, Number((grouped.get(key) || 0) + Number(order.pricing?.total || 0)));
  });

  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-limit)
    .map(([label, value]) => ({
      label,
      value: Number(value.toFixed(2))
    }));
}

function estimateProfit(orders) {
  return orders.reduce((sum, order) => {
    const lineProfit = (order.items || []).reduce((itemSum, item) => {
      const unitProfit = Number(item.price || 0) - Number(item.costPrice || 0);
      return itemSum + unitProfit * Number(item.quantity || 0);
    }, 0);

    return sum + lineProfit - Number(order.pricing?.discount || 0);
  }, 0);
}

export async function getDashboardAnalytics() {
  const settings = await getOrCreateStoreSettings();
  await autoCancelStalePendingOrders(settings);
  const lowStockThreshold = Number(settings.metrics?.lowStockThreshold || 5);

  const [
    paidOrders,
    allOrders,
    totalProducts,
    totalUsers,
    recentOrders,
    ordersByStatus,
    bestSellingProducts,
    mostViewedProducts,
    lowStockProducts,
    newsletterSubscribers
  ] = await Promise.all([
    Order.find({ "payment.status": "paid" }).lean(),
    Order.find().lean(),
    Product.countDocuments(),
    User.countDocuments(),
    Order.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .populate("user", "name email"),
    Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]),
    Product.find({ status: "active" })
      .sort({ soldCount: -1, rating: -1 })
      .limit(5)
      .select("name soldCount rating stock images category"),
    Product.find({ status: "active" })
      .sort({ viewsCount: -1, soldCount: -1 })
      .limit(5)
      .select("name viewsCount soldCount rating images category"),
    Product.find({
      status: "active",
      $or: [
        { stock: { $lte: lowStockThreshold } },
        { "variants.stock": { $lte: lowStockThreshold } }
      ]
    })
      .sort({ stock: 1, soldCount: -1 })
      .limit(6)
      .select("name stock variants images category"),
    NewsletterSubscriber.countDocuments()
  ]);

  const totalSales = paidOrders.reduce((sum, order) => sum + Number(order.pricing?.total || 0), 0);
  const estimatedProfit = estimateProfit(paidOrders);
  const cartAdds = Number(settings.metrics?.cartAdds || 0);
  const conversionRate = cartAdds ? (allOrders.length / cartAdds) * 100 : 0;

  return {
    overview: {
      totalSales,
      totalOrders: allOrders.length,
      totalProducts,
      totalUsers,
      newsletterSubscribers,
      estimatedProfit: Number(estimatedProfit.toFixed(2)),
      conversionRate: Number(conversionRate.toFixed(1))
    },
    charts: {
      dailyRevenue: buildRevenueSeries(paidOrders, "day", 7),
      weeklyRevenue: buildRevenueSeries(paidOrders, "week", 8),
      monthlyRevenue: buildRevenueSeries(paidOrders, "month", 6)
    },
    insights: {
      bestSellingProducts,
      mostViewedProducts,
      lowStockProducts,
      cartAdds
    },
    recentOrders,
    ordersByStatus
  };
}
