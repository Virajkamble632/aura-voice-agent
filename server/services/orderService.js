import orders from "../data/orders.js";

export function getOrderDetails(orderId) {
  if (!orderId) {
    return {
      success: false,
      error: "Order ID is required",
    };
  }

  let normalizedOrderId = String(orderId)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-");

  // 103 → ORD-103
  if (/^\d+$/.test(normalizedOrderId)) {
    normalizedOrderId = `ORD-${normalizedOrderId}`;
  }

  // ORDER-103 → ORD-103
  if (normalizedOrderId.startsWith("ORDER-")) {
    normalizedOrderId = normalizedOrderId.replace(
      "ORDER-",
      "ORD-"
    );
  }

  const order = orders[normalizedOrderId];

  if (!order) {
    return {
      success: false,
      error: `No order found for ${normalizedOrderId}`,
    };
  }

  return {
    success: true,
    order,
  };
} 