import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { OperationTypeNode } from 'graphql';

const TOKEN_KEY = 'skillswap.token';
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

const httpUrl = import.meta.env.VITE_GRAPHQL_HTTP || '/graphql';
const wsUrl =
  import.meta.env.VITE_GRAPHQL_WS ||
  `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/graphql`;

const httpLink = new HttpLink({ uri: httpUrl });

const authLink = new SetContextLink((prevContext) => {
  const token = getToken();
  return { headers: { ...prevContext.headers, ...(token ? { authorization: `Bearer ${token}` } : {}) } };
});

// graphql-ws client — authenticates once per socket via connectionParams.
export const wsClient = createClient({
  url: wsUrl,
  lazy: true,
  connectionParams: () => ({ authToken: getToken() }),
  retryAttempts: Infinity,
  shouldRetry: () => Boolean(getToken()),
  retryWait: (n) => new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** n, 15000))),
});

/** Drop the socket so the next subscription reconnects with the new token. */
export const restartWebSocket = () => wsClient.terminate();

const wsLink = new GraphQLWsLink(wsClient);

// Subscriptions → WebSocket; queries & mutations → HTTP
const splitLink = ApolloLink.split(
  (op) => op.operationType === OperationTypeNode.SUBSCRIPTION,
  wsLink,
  ApolloLink.from([authLink, httpLink])
);

export const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache({
    typePolicies: {
      Match: { keyFields: ['id'] },
      SkillPair: { keyFields: false },
      ScoreBreakdown: { keyFields: false },
      User: { fields: { teachSkills: { merge: false }, learnSkills: { merge: false }, availability: { merge: false } } },
      LearningRoom: { fields: { agenda: { merge: false }, participants: { merge: false }, notes: { merge: false } } },
      LearningQuest: { fields: { milestones: { merge: false } } },
    },
  }),
  defaultOptions: { watchQuery: { fetchPolicy: 'cache-and-network' } },
});
