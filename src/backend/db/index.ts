import mongoose from 'mongoose';

// Connect to MongoDB
export const connectToDatabase = async (mongoUri: string) => {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Disconnect from MongoDB
export const disconnectFromDatabase = async () => {
  try {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('MongoDB disconnection error:', error);
    throw error;
  }
};
