/**
 * Pure helpers for the user address book (User.addresses[]).
 * Kept free of Mongoose so the default-selection rules are unit-testable.
 */
const MAX_ADDRESSES = 10;

/**
 * A new address becomes the default when the caller asks for it or when the
 * book is empty (there must always be a default once any address exists).
 */
function shouldBecomeDefault(existingAddresses, requestedIsDefault) {
  const count = Array.isArray(existingAddresses) ? existingAddresses.length : 0;
  return Boolean(requestedIsDefault) || count === 0;
}

function canAddAddress(existingCount) {
  return Number(existingCount) < MAX_ADDRESSES;
}

/**
 * Returns the id of the address that should be promoted to default when the
 * list has entries but none is flagged (e.g. the default was deleted).
 * Returns null when nothing needs to change.
 */
function pickDefaultToPromote(addresses) {
  if (!Array.isArray(addresses) || addresses.length === 0) return null;
  if (addresses.some((a) => a && a.isDefault)) return null;
  return String(addresses[0]._id);
}

/** Plain, client-safe address shape (ids as strings, no Mongoose internals). */
function toPublicAddress(addr) {
  if (!addr) return null;
  return {
    _id: String(addr._id),
    label: addr.label || 'Home',
    name: addr.name,
    phone: addr.phone,
    address: addr.address,
    city: addr.city,
    zip: addr.zip,
    country: addr.country || '',
    isDefault: Boolean(addr.isDefault),
  };
}

function toPublicAddresses(addresses) {
  return (Array.isArray(addresses) ? addresses : []).map(toPublicAddress);
}

module.exports = {
  MAX_ADDRESSES,
  shouldBecomeDefault,
  canAddAddress,
  pickDefaultToPromote,
  toPublicAddress,
  toPublicAddresses,
};
