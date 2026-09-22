# M4 · Square membership and payment lifecycle


Read Square commerce, pricing, data and lifecycle specs. Implement Square sandbox catalog/customer/card-on-file/subscription mapping for approved plan versions. Free plans stay internal. Validate prices server-side and preserve the quote/terms/recurring authorization evidence. Use actual Square schemas; do not port Stripe event names or invent coupon/proration behavior.

Persist idempotent enrollment/change/refund/cancel operations. Validate Square notifications with raw body and exact public URL semantics, deduplicate and reconcile authoritative invoice/payment state before granting entitlements. Prevent the first billing period from being charged by both a manual Payments call and the new subscription. Coordinate provider receipts with Redial notifications.

Build pricing/plan/cart/checkout/result/billing/history/payment-method/change/cancel screens. Separate cancellation and refunds; never delete a phone number as a payment side effect. Annual plans have monthly quota windows. Implement a small controlled coupon mapping rather than arbitrary unsupported discounts.

Acceptance: decline/pending/settled/replay/out-of-order/annual/cancel/refund/coupon-race tests and clearly labeled sandbox limitations. No live charge without explicit authorization.
