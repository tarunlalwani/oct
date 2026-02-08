import Fastify from 'fastify';
import { InMemoryTaskRepositoryFactory } from '@oct/infra';
import { taskRoutes } from './routes/tasks.js';

const fastify = Fastify({
  logger: true,
  genReqId: () => `req-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
});

const repoFactory = new InMemoryTaskRepositoryFactory();

// Register routes
await fastify.register(taskRoutes, { repoFactory });

// Health check
fastify.get('/health', async () => ({ status: 'ok' }));

// Start server
try {
  const port = parseInt(process.env.PORT ?? '3000', 10);
  const host = process.env.HOST ?? '0.0.0.0';
  await fastify.listen({ port, host });
  console.log(`Server listening on ${host}:${port}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
