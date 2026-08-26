const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const connUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/careertwin';
    const conn = await mongoose.connect(connUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[MongoDB] Connected successfully to: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`[MongoDB Warning] Could not connect to MongoDB at ${process.env.MONGODB_URI || 'mongodb://localhost:27017/careertwin'}.`);
    console.warn(`[MongoDB Warning] Reason: ${error.message}`);
    console.warn(`[MongoDB Warning] The application will continue running, but database operations will fail until MongoDB is started or MONGODB_URI in .env is configured.`);
  }
};

module.exports = connectDB;
