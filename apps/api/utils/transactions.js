/**
 * MongoDB transaction helpers. Transactions require a replica set (or
 * sharded/load-balanced) deployment; supportsTransactions() detects the
 * topology per call so a failover or a standalone dev server transparently
 * keeps the non-transactional code paths instead of erroring.
 */

const mongoose = require('mongoose');

function supportsTransactions() {
  try {
    const type = mongoose.connection.client?.topology?.description?.type || '';
    return (
      type.startsWith('ReplicaSet') ||
      type === 'Sharded' ||
      type === 'LoadBalanced'
    );
  } catch {
    return false;
  }
}

/**
 * Run `fn(session)` inside a transaction, retrying transient aborts via
 * withTransaction. `fn` must be idempotent — it can run more than once.
 * @returns {Promise<*>} whatever fn returned
 */
async function runInTransaction(fn) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

module.exports = { supportsTransactions, runInTransaction };
