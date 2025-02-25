import { Hono } from 'hono';
import { db } from '../src/db/db.js';  // Your drizzle-orm database connection
import { positions } from '../src/db/schema.js'; // Your schema
import { sql } from 'drizzle-orm';
import {serve} from '@hono/node-server'

const app = new Hono();

// Endpoint to get all positions
app.get('/positions', async (c) => {
  const result = await db.select().from(positions);
  return c.json(result);
});

// Endpoint to create a new position
app.post('/positions', async (c) => {
  const { name, description, parentId } = await c.req.json();
  const result = await db.insert(positions).values({ name, description, parentId });
  return c.json(result);
});

// Update endpoint with correct SQL syntax
app.put('/positions/:id', async (c) => {
  const { name, description, parentId } = await c.req.json();
  const { id } = c.req.param();
  
  // Use sql`...` for comparison
  const result = await db.update(positions)
    .set({ name, description, parentId })
    .where(sql`${positions.id} = ${id}`);
  
  return c.json(result);
});

// Delete endpoint with correct SQL syntax
app.delete('/positions/:id', async (c) => {
  const { id } = c.req.param();
  
  // Check if the position has children before deleting
  const children = await db.select().from(positions).where(sql`${positions.parentId} = ${id}`);
  if (children.length > 0) {
    return c.json({ message: 'Cannot delete parent because it has children' }, 400);
  }

  const result = await db.delete(positions).where(sql`${positions.id} = ${id}`);
  return c.json(result);
});

serve({
  fetch: app.fetch,
  port: 3000,
});