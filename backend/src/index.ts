import { Hono } from 'hono';
import { db } from '../src/db/db.js'; 
import { positions } from '../src/db/schema.js'; 
import { sql } from 'drizzle-orm';
import { serve } from '@hono/node-server';
import { positionSchema } from '../src/db/schema.js'; 

const app = new Hono();

// Recursive function to get a position and its children
const getPositionWithChildren = async (parentId: string | null): Promise<any> => {
  const positionResult = await db.select().from(positions).where(sql`${positions.id} = ${parentId}`);
  const position = positionResult[0]; 

  if (!position) {
    return null; 
  }
  const children = await db.select().from(positions).where(sql`${positions.parentId} = ${parentId}`);
  const childrenWithDetails = await Promise.all(
    children.map(async (child) => {
      return await getPositionWithChildren(child.id); 
    })
  );
  return {
    ...position,
    children: childrenWithDetails.filter(Boolean), 
  };
};

// Function to get all positions with their hierarchy
const getAllPositionsWithHierarchy = async (): Promise<any> => {
  const topPositions = await db.select().from(positions).where(sql`${positions.parentId} IS NULL`);

  const positionsWithHierarchy = await Promise.all(
    topPositions.map(async (position) => {
      return await getPositionWithChildren(position.id); 
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
  const result = await getPositionWithChildren(id); 

  if (!result) {
    return c.json({ message: 'Position not found' }, 404);
  }

  return c.json(result);
});

// Endpoint to get a single position without its children
app.get('/positions/:id', async (c) => {
  const { id } = c.req.param();
  const positionResult = await db.select().from(positions).where(sql`${positions.id} = ${id}`);
  const position = positionResult[0]; 

  if (!position) {
    return c.json({ message: 'Position not found' }, 404);
  }

  return c.json(position); 
});

// Endpoint to create a new position with validation using Zod
app.post('/positions', async (c) => {
  const body = await c.req.json();
  const parsedData = positionSchema.safeParse(body);

  if (!parsedData.success) {
    return c.json({ message: 'Invalid data', errors: parsedData.error.errors }, 400);
  }

  const { name, description, parentId } = parsedData.data;
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
  const positionToDelete = await db.select().from(positions).where(sql`${positions.id} = ${id}`).limit(1);
  
  if (positionToDelete.length === 0) {
    return c.json({ message: 'Position not found' }, 404);
  }
  const children = await db.select().from(positions).where(sql`${positions.parentId} = ${id}`);
  if (children.length > 0) {
    return c.json({ message: 'Cannot delete parent because it has children' }, 400);
  }
  await db.delete(positions).where(sql`${positions.id} = ${id}`);

  const deletedPosition = positionToDelete[0]; 
  return c.json({ message: 'Position deleted', deletedPosition });
});

serve({
  fetch: app.fetch,
  port: 3000,
});
