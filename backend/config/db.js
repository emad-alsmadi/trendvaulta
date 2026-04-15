const mongoose = require('mongoose');

function withDbName(mongoUrl, dbName) {
  if (!mongoUrl) return mongoUrl;
  if (!dbName) return mongoUrl;

  const [base, query] = mongoUrl.split('?');
  const idx = base.lastIndexOf('/');
  if (idx === -1) return mongoUrl;

  const prefix = base.slice(0, idx + 1);
  const currentDb = base.slice(idx + 1);

  // If no db part (ends with '/'), append db name
  const nextBase = currentDb ? `${prefix}${dbName}` : `${base}${dbName}`;
  return query ? `${nextBase}?${query}` : nextBase;
}

// function Connnection To Database
const connectToDB = async () => {
  try {
    // Avoid buffering requests when DB is down (fail fast instead of timing out)
    mongoose.set('bufferCommands', false);

    const dbName = process.env.DB_NAME || 'template_store';
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
