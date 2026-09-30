const mongoose = require('mongoose');

/**
 * Named monotonic sequences (e.g. `invoice:2026`). One document per name;
 * `nextSequence` increments it atomically, so concurrent callers always get
 * distinct, consecutive values.
 */
const CounterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { collection: 'counters', versionKey: false },
);

const Counter = mongoose.model('Counter', CounterSchema);

/** @returns {Promise<number>} the next value (1 for a new sequence) */
async function nextSequence(name) {
  const doc = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  ).lean();
  return doc.seq;
}

module.exports = { Counter, nextSequence };
