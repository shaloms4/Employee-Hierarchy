import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import positionRouter from './routes/positions.js';

const app = new Hono();

app.route('/positions', positionRouter);

serve({
  fetch: app.fetch,
  port: 3000,
});
