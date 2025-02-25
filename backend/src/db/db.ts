import dotenv from 'dotenv';  // Import dotenv
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

// Load environment variables from the .env file
dotenv.config();

// Log the DATABASE_URL to check if it's loaded properly
console.log('Database URL:', process.env.DATABASE_URL);

// Ensure DATABASE_URL is defined before using it
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

// Set up the database connection
const sql = postgres(process.env.DATABASE_URL, { prepare: false });
export const db = drizzle(sql, { schema });
