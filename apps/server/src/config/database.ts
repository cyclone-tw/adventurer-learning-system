import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/adventurer-learning';

  try {
    const conn = await mongoose.connect(mongoUrl);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err);
});

export default connectDB;
