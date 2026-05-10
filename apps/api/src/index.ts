import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { schema } from './graphql/schema/index.js';
import { resolvers } from './graphql/resolvers/index.js';
import { authMiddleware } from './middleware/auth.middleware.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { rateLimitMiddleware } from './middleware/rate-limit.middleware.js';
import { aiRouter } from './services/ollama.service.js';
import { fontRouter } from './services/font.service.js';

const PORT = parseInt(process.env.PORT || '3001', 10);

async function startServer() {
  const app = express();

  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(rateLimitMiddleware);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // AI streaming endpoints
  app.use('/api/ai', aiRouter);

  // Font catalog endpoints (public, no auth required)
  app.use('/api/fonts', fontRouter);

  // Auth middleware for protected routes
  app.use('/api', authMiddleware);

  // Apollo Server
  const server = new ApolloServer({
    typeDefs: schema,
    resolvers,
  });

  await server.start();

  app.use(
    '/api/graphql',
    expressMiddleware(server, {
      context: async ({ req }) => ({
        token: req.headers.authorization || '',
        user: (req as any).user || null,
      }),
    })
  );

  app.use(errorMiddleware);

  const httpServer = createServer(app);

  httpServer.listen(PORT, () => {
    console.log(`🚀 API server running on http://localhost:${PORT}`);
    console.log(`📊 GraphQL endpoint: http://localhost:${PORT}/api/graphql`);
    console.log(`🤖 AI endpoint: http://localhost:${PORT}/api/ai`);
    console.log(`🔤 Font endpoint: http://localhost:${PORT}/api/fonts`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});