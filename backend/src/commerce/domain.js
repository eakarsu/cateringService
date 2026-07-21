const TRANSITIONS = {
  TAX_PENDING: { tax_succeeded: 'PENDING_RESERVATION', cancel: 'CANCELLED' },
  PENDING_RESERVATION: { reserve: 'RESERVED', cancel: 'CANCELLED' },
  RESERVED: { request_payment: 'PAYMENT_PENDING', cancel: 'CANCELLED' },
  PAYMENT_PENDING: { payment_succeeded: 'PAID', payment_failed: 'PAYMENT_FAILED' },
  PAYMENT_FAILED: { retry_payment: 'PAYMENT_PENDING', cancel: 'CANCELLED' },
  PAID: { begin_fulfillment: 'FULFILLING', cancel: 'REFUND_PENDING' },
  FULFILLING: { partial_fulfillment: 'PARTIALLY_FULFILLED', full_fulfillment: 'FULFILLED', delivery_exception: 'DELIVERY_EXCEPTION', cancel: 'REFUND_PENDING' },
  PARTIALLY_FULFILLED: { partial_fulfillment: 'PARTIALLY_FULFILLED', full_fulfillment: 'FULFILLED', delivery_exception: 'DELIVERY_EXCEPTION', cancel: 'REFUND_PENDING' },
  FULFILLED: { dispatch: 'DELIVERY_PENDING', cancel: 'REFUND_PENDING' },
  DELIVERY_PENDING: { dispatch_succeeded: 'IN_TRANSIT', delivery_exception: 'DELIVERY_EXCEPTION' },
  IN_TRANSIT: { complete: 'COMPLETED', delivery_exception: 'DELIVERY_EXCEPTION' },
  DELIVERY_EXCEPTION: { recover: 'FULFILLING', cancel: 'REFUND_PENDING' },
  REFUND_PENDING: { refund_succeeded: 'REFUNDED', refund_failed: 'REFUND_FAILED' },
  REFUND_FAILED: { retry_refund: 'REFUND_PENDING' }
};

function transition(current, command) {
  const next = TRANSITIONS[current]?.[command];
  if (!next) throw Object.assign(new Error(`Cannot ${command} while order is ${current}`), { status: 409 });
  return next;
}
function cents(value, field) {
  if (!Number.isInteger(value) || value < 0) throw Object.assign(new Error(`${field} must be non-negative integer cents`), { status: 400 });
  return value;
}
function validateLines(lines) {
  if (!Array.isArray(lines) || lines.length === 0) throw Object.assign(new Error('At least one order line is required'), { status: 400 });
  lines.forEach((line) => { if (!line.inventoryId || !Number.isInteger(line.quantity) || line.quantity < 1) throw Object.assign(new Error('Each line requires inventoryId and positive integer quantity'), { status: 400 }); });
  return lines;
}
function canSee(principal, order) {
  return principal.role === 'operator' || (principal.role === 'customer' && order.customer_subject === principal.subject) || (principal.role === 'merchant' && order.merchant_subject === principal.subject);
}
module.exports = { TRANSITIONS, transition, cents, validateLines, canSee };
