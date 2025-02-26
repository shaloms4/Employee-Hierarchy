import { pgTable, uuid, varchar, text } from "drizzle-orm/pg-core";
import { z } from 'zod'; // Import Zod for input validation

// Define the positions table with the correct nullable UUID and equal comparison
export const positions = pgTable("positions", {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  parentId: uuid(),
});

// Define a Zod schema for validation
export const positionSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }), // Ensure name is non-empty
  description: z.string().min(1, { message: "Description is required" }), // Ensure description is non-empty
  parentId: z.string().uuid().nullable(), // Ensure parentId is a valid UUID or null
});
