import { drizzle } from "drizzle-orm/node-postgres";
import { pgTable, uuid, varchar, text } from "drizzle-orm/pg-core";

// Initialize the database connection (use your actual DATABASE_URL here)

// Define the positions table with the correct nullable UUID and equal comparison
export const positions = pgTable("positions", {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  parentId: uuid(), 
});

