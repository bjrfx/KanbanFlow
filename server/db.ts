// Import MongoDB connection
import { connectToDatabase } from './mongodb';

// Connect to MongoDB
export async function setupDatabase() {
  try {
    await connectToDatabase();
    console.log('Database connection established successfully');
  } catch (error) {
    console.error('Error setting up database:', error);
    throw error;
  }
}