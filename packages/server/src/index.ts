import Fastify from 'fastify';
import cors from '@fastify/cors';
import { FileSystemStorageAdapter } from '@oct/storage-fs';
import { workerRoutes } from './routes/workers.js';
import { projectRoutes } from './routes/projects.js';
import { taskRoutes } from './routes/tasks.js';

const fastify = Fastify({
  logger: true,
  genReqId: () => `req-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
});

// Register CORS
await fastify.register(cors, {
  origin: true,
  credentials: true,
});

// Create storage adapter
const storagePath = process.env.OCT_STORAGE_PATH ?? `${process.env.HOME}/.oct/db`;
const storageAdapter = new FileSystemStorageAdapter({ dbRoot: storagePath });

// Register routes
await fastify.register(workerRoutes, { storageAdapter });
await fastify.register(projectRoutes, { storageAdapter });
await fastify.register(taskRoutes, { storageAdapter });

// Health check
fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

// 404 handler
fastify.setNotFoundHandler(async (request, reply) => {
  return reply.status(404).send({
    ok: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${request.method} ${request.url} not found`,
      retryable: false,
    },
  });
});

// Error handler
fastify.setErrorHandler(async (error, _request, reply) => {
  fastify.log.error(error);

  // Handle Fastify validation errors
  if (error.validation) {
    return reply.status(400).send({
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: error.message,
        details: { validation: error.validation },
        retryable: false,
      },
    });
  }

  // Handle Zod validation errors
  if (error.name === 'ZodError') {
    return reply.status(400).send({
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: error.message,
        details: { issues: (error as { issues?: unknown }).issues },
        retryable: false,
      },
    });
  }

  return reply.status(500).send({
    ok: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      retryable: true,
    },
  });
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT ?? '3000', 10);
    const host = process.env.HOST ?? '0.0.0.0';
    await fastify.listen({ port, host });
    console.log(`Server listening on ${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
