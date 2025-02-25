import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle({ client: pool });

(async () => {
  try {
    const result = await db.execute('select 1');
    console.log(result); // Check the result
  } catch (error) {
    console.error('Error executing query', error);
  }
})();
