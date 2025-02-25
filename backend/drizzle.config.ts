import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config(); // Load .env variables

export default defineConfig({
  schema: "./src/db/schema.ts", // Path to your schema
  out: "./drizzle", // Migration output folder
  dialect: "postgresql", // Correct dialect for PostgreSQL
  dbCredentials: {
    url: process.env.DATABASE_URL!, // Ensure you have POSTGRES_URL in your .env
  },
});
