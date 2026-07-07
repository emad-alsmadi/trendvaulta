function serializeOrder(order) {
  const plain =
    order && typeof order.toObject === 'function'
      ? order.toObject({ virtuals: false })
      : { ...(order || {}) };

  const items = (plain.items || []).map((it) => {
    const templateRef = it.template;
    const templateId =
      templateRef && typeof templateRef === 'object' && templateRef._id
        ? String(templateRef._id)
        : String(templateRef ?? '');
    const { template: _t, ...rest } = it;
    return {
      ...rest,
      templateId,
    };
  });

  return {
    ...plain,
    items,
    paymentStatus: plain.paymentStatus ?? 'pending',
    stripeSessionId: plain.stripeSessionId ?? '',
    paymentIntentId: plain.paymentIntentId ?? '',
  };
}

function serializeOrders(list) {
  return (list || []).map((o) => serializeOrder(o));
}

module.exports = {
  serializeOrder,
  serializeOrders,
};
