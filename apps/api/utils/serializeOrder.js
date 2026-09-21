function serializeOrderItem(it) {
  const productRef = it.productId ?? it.product ?? it.template;
  const productId =
    productRef && typeof productRef === 'object' && productRef._id
      ? String(productRef._id)
      : String(productRef ?? '');

  const {
    template: _legacyTemplate,
    templateId: _legacyTemplateId,
    product: _legacyProduct,
    ...rest
  } = it;

  return {
    ...rest,
    productId,
  };
}

function serializeOrder(order) {
  const plain =
    order && typeof order.toObject === 'function'
      ? order.toObject({ virtuals: false })
      : { ...(order || {}) };

  const items = (plain.items || []).map((it) => serializeOrderItem(it));

  let user = plain.user;
  if (plain.user && typeof plain.user === 'object' && plain.user._id) {
    // Keep populated customer fields for admin lists; otherwise expose id string
    if (plain.user.email || plain.user.username) {
      user = {
        _id: String(plain.user._id),
        username: plain.user.username,
        email: plain.user.email,
      };
    } else {
      user = String(plain.user._id);
    }
  } else if (plain.user != null) {
    user = String(plain.user);
  }

  return {
    ...plain,
    _id: plain._id != null ? String(plain._id) : plain._id,
    user,
    items,
    discountAmount: plain.discountAmount ?? 0,
    couponCode: plain.couponCode ?? '',
    paymentStatus: plain.paymentStatus ?? 'pending',
    stripeSessionId: plain.stripeSessionId ?? '',
    paymentIntentId: plain.paymentIntentId ?? '',
    attentionReason: plain.attentionReason ?? '',
    refundId: plain.refundId ?? '',
    refundAmount: plain.refundAmount ?? 0,
  };
}

function serializeOrders(list) {
  return (list || []).map((o) => serializeOrder(o));
}

module.exports = {
  serializeOrder,
  serializeOrders,
};
