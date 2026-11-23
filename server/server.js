import 'dotenv/config';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { connectDB } from './config/db.js';
import { buildSchema } from './graphql/schema.js';
import { buildHttpContext } from './graphql/context/authContext.js';
import { createSubscriptionServer } from './graphql/subscriptions/subscriptionServer.js';
import { formatError } from './utils/errors.js';
import { depthLimit } from './middleware/depthLimit.js';
import { resetPresence } from './services/presenceService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 4000;
const isProd = process.env.NODE_ENV === 'production';
const origins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim());

async function start() {
  await connectDB();
  await resetPresence();

  const app = express();
  const httpServer = http.createServer(app);
  const schema = buildSchema();

  const { cleanup } = createSubscriptionServer(httpServer, schema, '/graphql');

  const apollo = new ApolloServer({
    schema,
    formatError,
    introspection: !isProd,
    validationRules: [depthLimit(9)],
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      { async serverWillStart() { return { async drainServer() { await cleanup.dispose(); } }; } },
    ],
  });
  await apollo.start();

  app.disable('x-powered-by');
  // Operational health probe for hosting platforms — not an application data API
  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.use(
    '/graphql',
    cors({ origin: origins, credentials: true }),
    express.json({ limit: '1mb' }),
    expressMiddleware(apollo, { context: buildHttpContext })
  );

  // In production, serve the built React app from the same origin
  const clientDist = path.resolve(__dirname, '../client/dist');
  if (isProd && fs.existsSync(clientDist)) {
    app.use(express.static(clientDist, { maxAge: '7d', index: false }));
    app.get(/^(?!\/graphql).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  httpServer.listen(PORT, () => {
    console.log(`🚀 GraphQL HTTP  → http://localhost:${PORT}/graphql`);
    console.log(`⚡ GraphQL WS    → ws://localhost:${PORT}/graphql`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
