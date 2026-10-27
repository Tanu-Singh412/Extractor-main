const mongoose = require('mongoose');
const Passport = require('./Passport.model');
const Insurance = require('./Insurance.model');

let isConnected = false;

/**
 * Connect to MongoDB with Mongoose
 * Gracefully handles local connection timeouts if MongoDB daemon is not currently active
 */
async function connectDB(uri = process.env.MONGODB_URI, dbName = process.env.DB_NAME || 'passport_db') {
  if (isConnected || mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const connectionUri = uri || 'mongodb://localhost:27017/passport_db';

  try {
    const conn = await mongoose.connect(connectionUri, {
      dbName,
      serverSelectionTimeoutMS: 3000
    });
    isConnected = true;
    console.log(`[MONGODB] Successfully connected to database: ${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.warn(`[MONGODB] Connection warning: ${err.message}`);
    return null;
  }
}

/**
 * Factory helper: automatically detects document type and returns the appropriate model instance
 */
function createModelFromOcr(ocrData, rawText = '', sourceFileName = '') {
  const docType = (ocrData?.docType || 'PASSPORT').toUpperCase();
  if (docType === 'INSURANCE') {
    return Insurance.fromOcr(ocrData, rawText, sourceFileName);
  }
  return Passport.fromOcr(ocrData, rawText, sourceFileName);
}

module.exports = {
  Passport,
  Insurance,
  connectDB,
  createModelFromOcr
};
