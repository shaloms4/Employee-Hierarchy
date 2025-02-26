import { Hono } from 'hono';
import { db } from '../src/db/db.js'; // Your drizzle-orm database connection
import { positions } from '../src/db/schema.js'; // Your schema
import { sql } from 'drizzle-orm';
import { serve } from '@hono/node-server';
import { positionSchema } from '../src/db/schema.js'; // Import Zod schema for validation

const app = new Hono();

// Recursive function to get a position and its children
const getPositionWithChildren = async (parentId: string | null): Promise<any> => {
  // Fetch the position (parent) from the database
  const positionResult = await db.select().from(positions).where(sql`${positions.id} = ${parentId}`);

  // If no position is found, return null
  const position = positionResult[0]; // Manually extract the first record if it exists

  if (!position) {
    return null; // No position found for the provided parentId
  }

  // Fetch all children of the current position
  const children = await db.select().from(positions).where(sql`${positions.parentId} = ${parentId}`);

  // Recursively fetch children for each child
  const childrenWithDetails = await Promise.all(
    children.map(async (child) => {
      return await getPositionWithChildren(child.id); // Recursively fetch child details
    })
  );

  // Return the position with its children nested inside
  return {
    ...position,
    children: childrenWithDetails.filter(Boolean), // Filter out nulls if no children found
  };
};

// Function to get all positions with their hierarchy
const getAllPositionsWithHierarchy = async (): Promise<any> => {
  // Fetch the top-level positions (those with no parent)
  const topPositions = await db.select().from(positions).where(sql`${positions.parentId} IS NULL`);

  // For each top-level position, recursively get its children
  const positionsWithHierarchy = await Promise.all(
    topPositions.map(async (position) => {
      return await getPositionWithChildren(position.id); // Get each position with its children
    })
  );

  return positionsWithHierarchy;
};

// Endpoint to get all positions with hierarchy
app.get('/positions', async (c) => {
  const positionsWithHierarchy = await getAllPositionsWithHierarchy();

  return c.json(positionsWithHierarchy);
});

// Endpoint to get a single position with its children
app.get('/positions-children/:id', async (c) => {
  const { id } = c.req.param();
  const result = await getPositionWithChildren(id); // Fetch the position and its children

  if (!result) {
    return c.json({ message: 'Position not found' }, 404);
  }

  return c.json(result);
});

// Endpoint to get a single position without its children
app.get('/positions/:id', async (c) => {
  const { id } = c.req.param();

  // Fetch the position without children
  const positionResult = await db.select().from(positions).where(sql`${positions.id} = ${id}`);

  const position = positionResult[0]; // Manually extract the first record if it exists

  if (!position) {
    return c.json({ message: 'Position not found' }, 404);
  }

  return c.json(position); // Return only the position details without children
});

// Endpoint to create a new position with validation using Zod
app.post('/positions', async (c) => {
  const body = await c.req.json();

  // Validate the incoming data using the Zod schema
  const parsedData = positionSchema.safeParse(body);

  if (!parsedData.success) {
    // Return validation errors if the data doesn't match the schema
    return c.json({ message: 'Invalid data', errors: parsedData.error.errors }, 400);
  }

  const { name, description, parentId } = parsedData.data;

  // Check if there is already a parent with null id
  if (parentId === null) {
    const existingParent = await db.select().from(positions).where(sql`${positions.parentId} IS NULL`);

    if (existingParent.length > 0) {
      return c.json({ message: 'A parent with null id already exists. Only one parent with null id is allowed.' }, 400);
    }
  }

  const result = await db.insert(positions).values({ name, description, parentId });
  return c.json(result);
});

// Endpoint to update a position
app.put('/positions/:id', async (c) => {
  const body = await c.req.json();
  const { id } = c.req.param();

  // Validate the incoming data using the Zod schema
  const parsedData = positionSchema.safeParse(body);

  if (!parsedData.success) {
    return c.json({ message: 'Invalid data', errors: parsedData.error.errors }, 400);
  }

  const { name, description, parentId } = parsedData.data;

  const result = await db.update(positions)
    .set({ name, description, parentId })
    .where(sql`${positions.id} = ${id}`);
  
  const updatedPosition = await db.select().from(positions).where(sql`${positions.id} = ${id}`);
  const updated = updatedPosition[0];

  return c.json({ message: 'Updated Position', updated });
});

// Endpoint to delete a position
app.delete('/positions/:id', async (c) => {
  const { id } = c.req.param();

  // Fetch the position details before deleting
  const positionToDelete = await db.select().from(positions).where(sql`${positions.id} = ${id}`).limit(1);
  
  if (positionToDelete.length === 0) {
    return c.json({ message: 'Position not found' }, 404);
  }

  // Check if the position has children before deleting
  const children = await db.select().from(positions).where(sql`${positions.parentId} = ${id}`);
  if (children.length > 0) {
    return c.json({ message: 'Cannot delete parent because it has children' }, 400);
  }

  // Perform the deletion
  await db.delete(positions).where(sql`${positions.id} = ${id}`);

  // Return the deleted position's details
  const deletedPosition = positionToDelete[0]; // The deleted position details
  return c.json({ message: 'Position deleted', deletedPosition });
});

serve({
  fetch: app.fetch,
  port: 3000,
});
