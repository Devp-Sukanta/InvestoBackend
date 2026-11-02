import mongoose from 'mongoose';
import { initScheduler } from '../utils/referralHelper.js';

const connection = async () => {
  try {
    const conn = await mongoose.connect(process.env.DATABASE_URI);
    initScheduler();
    console.log(`✅😀 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌😔 Error: ${error.message}`);
    process.exit(1);
  }
};

export default connection;