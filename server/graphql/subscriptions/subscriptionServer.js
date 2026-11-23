import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/use/ws';
import { userFromToken, buildWsContext } from '../context/authContext.js';
import { userConnected, userDisconnected } from '../../services/presenceService.js';

/**
 * graphql-ws server on the same HTTP server and path as Apollo (/graphql).
 * Authentication happens once in onConnect using connectionParams.authToken;
 * every subscription resolver then re-checks authorization for its resource.
 */
export function createSubscriptionServer(httpServer, schema, path = '/graphql') {
  const wsServer = new WebSocketServer({ server: httpServer, path });

  const cleanup = useServer(
    {
      schema,
      context: buildWsContext,
      onConnect: async (ctx) => {
        const user = await userFromToken(ctx.connectionParams?.authToken);
        if (!user) return false; // closes socket with 4403 Forbidden
        ctx.extra.user = user;
        await userConnected(user._id);
        return true;
      },
      onDisconnect: async (ctx) => {
        if (ctx.extra.user) await userDisconnected(ctx.extra.user._id);
      },
    },
    wsServer
  );

  return { wsServer, cleanup };
}
