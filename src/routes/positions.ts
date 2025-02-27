import { Hono } from 'hono';
import { db } from '../db/db.js'; 
import { positions, positionSchema } from '../db/schema.js'; 
import { sql } from 'drizzle-orm';

const positionRouter = new Hono();

// Recursive function to get a position and its children
const getPositionWithChildren = async (parentId: string | null): Promise<any> => {
  const positionResult = await db.select().from(positions).where(sql`${positions.id} = ${parentId}`);
  const position = positionResult[0]; 

  if (!position) return null; 

  const children = await db.select().from(positions).where(sql`${positions.parentId} = ${parentId}`);
  const childrenWithDetails = await Promise.all(children.map(child => getPositionWithChildren(child.id)));

  return { ...position, children: childrenWithDetails.filter(Boolean) };
};

// Create a position
positionRouter.post('/', async (c) => {
    const body = await c.req.json();
    const parsedData = positionSchema.safeParse(body);
  
    if (!parsedData.success) return c.json({ message: 'Invalid data', errors: parsedData.error.errors }, 400);
  
    const { name, description, parentId } = parsedData.data;
    
    if (parentId === null) {
      const existingParent = await db.select().from(positions).where(sql`${positions.parentId} IS NULL`);
      if (existingParent.length > 0) {
        return c.json({ message: 'Only one root position is allowed.' }, 400);
      }
    }
  
    const result = await db.insert(positions).values({ name, description, parentId });
    return c.json(result);
  });

// Get all positions with hierarchy
positionRouter.get('/', async (c) => {
  const topPositions = await db.select().from(positions).where(sql`${positions.parentId} IS NULL`);
  const positionsWithHierarchy = await Promise.all(topPositions.map(position => getPositionWithChildren(position.id)));
  return c.json(positionsWithHierarchy);
});

// Get a position with its children
positionRouter.get('/children/:id', async (c) => {
  const { id } = c.req.param();
  const result = await getPositionWithChildren(id);
  return result ? c.json(result) : c.json({ message: 'Position not found' }, 404);
});

// Get a single position
positionRouter.get('/:id', async (c) => {
  const { id } = c.req.param();
  const positionResult = await db.select().from(positions).where(sql`${positions.id} = ${id}`);
  return positionResult.length ? c.json(positionResult[0]) : c.json({ message: 'Position not found' }, 404);
});

// Update a position
positionRouter.put('/:id', async (c) => {
  const body = await c.req.json();
  const { id } = c.req.param();
  const parsedData = positionSchema.safeParse(body);

  if (!parsedData.success) return c.json({ message: 'Invalid data', errors: parsedData.error.errors }, 400);

  const { name, description, parentId } = parsedData.data;
  await db.update(positions).set({ name, description, parentId }).where(sql`${positions.id} = ${id}`);
  
  const updatedPosition = await db.select().from(positions).where(sql`${positions.id} = ${id}`);
  return c.json({ message: 'Updated Position', updated: updatedPosition[0] });
});

// Delete a position
positionRouter.delete('/:id', async (c) => {
  const { id } = c.req.param();
  const positionToDelete = await db.select().from(positions).where(sql`${positions.id} = ${id}`);

  if (!positionToDelete.length) return c.json({ message: 'Position not found' }, 404);

  const children = await db.select().from(positions).where(sql`${positions.parentId} = ${id}`);
  if (children.length) return c.json({ message: 'Cannot delete parent because it has children' }, 400);

  await db.delete(positions).where(sql`${positions.id} = ${id}`);
  return c.json({ message: 'Position deleted', deletedPosition: positionToDelete[0] });
});

export default positionRouter;
