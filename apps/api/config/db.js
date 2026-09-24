const mongoose = require('mongoose');

function withDbName(mongoUrl, dbName) {
  if (!mongoUrl) return mongoUrl;
  if (!dbName) return mongoUrl;

  const [base, query] = mongoUrl.split('?');
  const schemeEnd = base.indexOf('://');
  if (schemeEnd === -1) return mongoUrl;

  // The path (db name) starts at the first '/' after the "scheme://host[:port]"
  // segment, so a bare "mongodb://host:port" (no trailing slash) is treated
  // as having no db name rather than mistaking the "//" for it.
  const idx = base.indexOf('/', schemeEnd + 3);
  const prefix = idx === -1 ? `${base}/` : base.slice(0, idx + 1);

  const nextBase = `${prefix}${dbName}`;
  return query ? `${nextBase}?${query}` : nextBase;
}

// function Connnection To Database
const connectToDB = async () => {
  try {
    // Avoid buffering requests when DB is down (fail fast instead of timing out)
    mongoose.set('bufferCommands', false);

    const dbName = process.env.DB_NAME || 'trendvaulta';
    const mongoUrl = withDbName(process.env.MONGO_URL, dbName);
    if (!mongoUrl) {
      throw new Error('Missing MONGO_URL env var');
    }

    await mongoose.connect(mongoUrl, {
      serverSelectionTimeoutMS: 10_000,
      connectTimeoutMS: 10_000,
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.log('Connection Failed To MongoDB', error);
    throw error;
  }
};

module.exports = {
  connectToDB,
};
